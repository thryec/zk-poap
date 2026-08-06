import { proveReviewedVector } from "../src/prove-reviewed-vector.ts";

const result = await proveReviewedVector();
console.log(
  JSON.stringify(
    {
      verified: true,
      publicSignals: result.publicSignals,
    },
    null,
    2,
  ),
);
process.exit(0);
