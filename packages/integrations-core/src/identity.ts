/**
 * Event identity + canonicalization (SDD §16.1 / §16.2 / §16.9 / §17.2 / §17.8).
 *
 * - Canonicalization: JSON values only, recursively sorted object keys, arrays
 *   order-preserved. Non-serializable input (circular / bigint / function /
 *   undefined) throws → the caller quarantines (malformed).
 * - Idempotency key includes tenantId (connectionId is NOT assumed globally
 *   unique). Returns null when the transport-assigned upstream id is absent →
 *   caller quarantines `missing-event-id` (never a content-derived key, which
 *   would risk collapsing distinct events).
 * - Quarantine records have their OWN identity, separate from event keys.
 */
import { createHash } from "node:crypto";
import type { RawEventEnvelope } from "./protocol/envelope.js";

/**
 * Deterministic canonical JSON. Throws TypeError on non-serializable input so
 * the caller can convert to a quarantine rather than silently mis-hashing.
 */
export const stableStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();
  const norm = (v: unknown): unknown => {
    if (v === null) return null;
    const t = typeof v;
    if (t === "bigint" || t === "function" || t === "undefined" || t === "symbol") {
      throw new TypeError(`non-serializable value of type ${t}`);
    }
    if (t !== "object") return v;
    const obj = v as object;
    if (seen.has(obj)) throw new TypeError("circular reference");
    seen.add(obj);
    if (Array.isArray(obj)) return obj.map(norm);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj as Record<string, unknown>).sort()) {
      out[k] = norm((obj as Record<string, unknown>)[k]);
    }
    return out;
  };
  return JSON.stringify(norm(value));
};

const sha256Hex = (s: string): string =>
  createHash("sha256").update(s, "utf8").digest("hex");

/** Canonical payload digest. Throws on non-serializable payloads (§16.9). */
export const canonicalDigest = (payload: unknown): string =>
  sha256Hex(stableStringify(payload));

/**
 * Idempotency key. Includes tenantId (§16.1). Returns null when the
 * transport-assigned upstreamEventId is absent/empty (§16.2).
 */
export const idempotencyKey = (envelope: RawEventEnvelope): string | null => {
  const id = envelope.upstreamEventId;
  if (!id || id.length === 0) return null;
  return `${envelope.tenantId}:${envelope.provider}:${envelope.connectionId}:${id}`;
};

/**
 * Type-tagged, cycle-aware serialization used ONLY as the non-serializable
 * fallback for `safeDigest`. Unlike `String(input)` (which collapses every
 * object to "[object Object]"), this captures structure + value types so
 * distinct non-serializable inputs produce distinct strings.
 */
const typeTaggedString = (value: unknown): string => {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): string => {
    if (v === null) return "null";
    const t = typeof v;
    if (t === "bigint") return `bigint:${(v as bigint).toString()}`;
    if (t === "function") return `function:${(v as { name?: string }).name ?? "anon"}`;
    if (t === "symbol") return `symbol:${String(v)}`;
    if (t === "undefined") return "undefined";
    if (t !== "object") return `${t}:${JSON.stringify(v)}`;
    const obj = v as object;
    if (seen.has(obj)) return "[circular]";
    seen.add(obj);
    if (Array.isArray(obj)) return `[${obj.map(walk).join(",")}]`;
    const rec = obj as Record<string, unknown>;
    return `{${Object.keys(rec)
      .sort()
      .map((k) => `${k}:${walk(rec[k])}`)
      .join(",")}}`;
  };
  return walk(value);
};

/**
 * Best-effort digest that NEVER throws — used for quarantine records of
 * malformed/non-serializable inputs (§17.8). Hashes the complete representation
 * so equal-length values with a shared prefix cannot collide because of local
 * truncation, and uses a type-tagged fallback so ordinary non-serializable
 * objects do not collapse to a single "[object Object]" identity.
 */
export const safeDigest = (input: unknown): string => {
  let s: string;
  try {
    s = stableStringify(input);
  } catch {
    try {
      s = typeof input === "string" ? input : typeTaggedString(input);
    } catch {
      // Exotic proxies and pathological nesting can defeat introspection. Keep
      // the quarantine boundary total without evaluating attacker-controlled
      // string coercion a third time.
      s = `uninspectable:${typeof input}`;
    }
  }
  return sha256Hex(s);
};

/**
 * Quarantine-record identity — SEPARATE from event idempotency keys (§17.2), so
 * a null-keyed or malformed event still gets a durable, non-colliding record.
 */
export const quarantineKey = (
  provider: string,
  tenantId: string,
  connectionId: string,
  digest: string,
): string => `quarantine:${tenantId}:${provider}:${connectionId}:${digest}`;
