/**
 * Jest mock: keep v4 stable for tests that expect fixed IDs; implement v5 with
 * the same algorithm as the `uuid` package so recurring idempotency matches production.
 */
import { createHash } from "node:crypto";

function parseUuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, "");
  const out = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** Matches uuid/dist-node/v35 stringToBytes for UTF-8 */
function stringToBytes(str: string): Uint8Array {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- matches `uuid` package v35
  str = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; ++i) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

function bytesToUuid(buf: Uint8Array): string {
  const hex = Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20, 32)
  );
}

export function v5(name: string, namespace: string): string {
  const namespaceBytes = parseUuidToBytes(namespace);
  const valueBytes = stringToBytes(name);
  const combined = new Uint8Array(16 + valueBytes.length);
  combined.set(namespaceBytes, 0);
  combined.set(valueBytes, 16);
  const hash = createHash("sha1").update(Buffer.from(combined)).digest();
  const bytes = new Uint8Array(16);
  bytes.set(hash.subarray(0, 16), 0);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

export const v4 = () => "test-uuid-v4";
export const validate = () => true;
