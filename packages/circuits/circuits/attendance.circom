pragma circom 2.2.3;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/eddsaposeidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "./generated/constants.circom";

template AttendanceCredentialV1() {
    signal output eventId;
    signal output nullifier;

    signal input pkEventX;
    signal input pkEventY;
    signal input metadataHash;
    signal input eventStart;
    signal input eventEnd;
    signal input minimumAssuranceLevel;
    signal input useContext;

    signal input masterSecret;
    signal input issuedAt;
    signal input credentialId;
    signal input assuranceLevel;
    signal input sigR8x;
    signal input sigR8y;
    signal input sigS;

    component eventHash = Poseidon(7);
    eventHash.inputs[0] <== domainEventV1();
    eventHash.inputs[1] <== circuitV1();
    eventHash.inputs[2] <== pkEventX;
    eventHash.inputs[3] <== pkEventY;
    eventHash.inputs[4] <== metadataHash;
    eventHash.inputs[5] <== eventStart;
    eventHash.inputs[6] <== eventEnd;
    eventId <== eventHash.out;

    component userEventHash = Poseidon(3);
    userEventHash.inputs[0] <== domainUserEventV1();
    userEventHash.inputs[1] <== masterSecret;
    userEventHash.inputs[2] <== eventId;

    component masterSecretIsZero = IsZero();
    masterSecretIsZero.in <== masterSecret;
    masterSecretIsZero.out === 0;

    component commitmentHash = Poseidon(2);
    commitmentHash.inputs[0] <== domainCommitmentV1();
    commitmentHash.inputs[1] <== userEventHash.out;

    component messageHash = Poseidon(6);
    messageHash.inputs[0] <== domainCredentialV1();
    messageHash.inputs[1] <== eventId;
    messageHash.inputs[2] <== commitmentHash.out;
    messageHash.inputs[3] <== issuedAt;
    messageHash.inputs[4] <== credentialId;
    messageHash.inputs[5] <== assuranceLevel;

    component signature = EdDSAPoseidonVerifier();
    signature.enabled <== 1;
    signature.Ax <== pkEventX;
    signature.Ay <== pkEventY;
    signature.R8x <== sigR8x;
    signature.R8y <== sigR8y;
    signature.S <== sigS;
    signature.M <== messageHash.out;

    component startBits = Num2Bits(64);
    component endBits = Num2Bits(64);
    component issuedBits = Num2Bits(64);
    startBits.in <== eventStart;
    endBits.in <== eventEnd;
    issuedBits.in <== issuedAt;

    component afterStart = LessEqThan(64);
    afterStart.in[0] <== eventStart;
    afterStart.in[1] <== issuedAt;
    afterStart.out === 1;

    component beforeEnd = LessEqThan(64);
    beforeEnd.in[0] <== issuedAt;
    beforeEnd.in[1] <== eventEnd;
    beforeEnd.out === 1;

    component assuranceBits = Num2Bits(8);
    component minimumBits = Num2Bits(8);
    assuranceBits.in <== assuranceLevel;
    minimumBits.in <== minimumAssuranceLevel;

    component assuranceEnough = LessEqThan(8);
    assuranceEnough.in[0] <== minimumAssuranceLevel;
    assuranceEnough.in[1] <== assuranceLevel;
    assuranceEnough.out === 1;

    component nullifierHash = Poseidon(3);
    nullifierHash.inputs[0] <== domainNullifierV1();
    nullifierHash.inputs[1] <== userEventHash.out;
    nullifierHash.inputs[2] <== useContext;
    nullifier <== nullifierHash.out;
}

component main { public [pkEventX, pkEventY, metadataHash, eventStart, eventEnd, minimumAssuranceLevel, useContext] } = AttendanceCredentialV1();
