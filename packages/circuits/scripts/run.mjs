import { spawn } from "node:child_process";

export async function run(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          signal
            ? `${command} stopped with signal ${signal}`
            : `${command} exited with code ${String(code)}`,
        ),
      );
    });
  });
}
