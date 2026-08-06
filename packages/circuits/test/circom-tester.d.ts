declare module "circom_tester" {
  export interface CircuitTester {
    calculateWitness(input: Record<string, string>, sanityCheck?: boolean): Promise<bigint[]>;
    checkConstraints(witness: bigint[]): Promise<void>;
    assertOut(witness: bigint[], expected: Record<string, string>): Promise<void>;
    getOutput(witness: bigint[], signals: string[]): Promise<bigint>;
  }

  interface TesterOptions {
    include?: string[];
    output?: string;
    recompile?: boolean;
  }

  export function wasm(circuitPath: string, options?: TesterOptions): Promise<CircuitTester>;
}
