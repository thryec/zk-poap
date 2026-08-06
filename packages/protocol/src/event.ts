import { createProtocolCrypto } from "./crypto.js";
import type { EventRecord } from "./types.js";

export async function computeEventId(event: EventRecord): Promise<bigint> {
  return (await createProtocolCrypto()).computeEventId(event);
}
