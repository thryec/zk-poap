import { runDemoFlow } from "../src/demo-flow.ts";

console.log(JSON.stringify(await runDemoFlow(), null, 2));
process.exit(0);
