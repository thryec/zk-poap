import {
  checkTamperedExampleProof,
  createExampleCredential,
  generateExampleProof,
  readExamplePublicSignals,
  verifyExampleProof,
} from "../src/example-steps.ts";

const steps = {
  credential: createExampleCredential,
  prove: generateExampleProof,
  verify: verifyExampleProof,
  tamper: checkTamperedExampleProof,
  signals: readExamplePublicSignals,
};

const name = process.argv[2];
const step = steps[name];
if (step === undefined) {
  throw new Error(`Expected one of: ${Object.keys(steps).join(", ")}`);
}

try {
  console.log(JSON.stringify(await step(), null, 2));
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
