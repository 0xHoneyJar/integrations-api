#!/usr/bin/env bun
/**
 * acvp:verify — Tier-A proof attestation for the integrations-api building.
 *
 * Runs each declared NON-aspirational ACVP proof from packages/protocol/beacon.yaml
 * via `bun test`. On all-pass, writes app/.well-known/acvp-proof-receipt.json — an
 * ARRAY of per-invariant AcvpProofReceipt (the shape @0xhoneyjar/beacon-schema's
 * validateAcvpBindings consumes). If any declared proof is red, it FAILS without
 * writing a receipt (a building must never publish a green receipt for a red proof).
 *
 * `commit_sha` = `git rev-parse HEAD`. For loa-freeside `doctor --cells-dir` to
 * read this receipt as FRESH (→ contract_status: bound), the receipt must be the
 * ONLY change between commit_sha and the audited HEAD. So the workflow is:
 *   1. commit this script + package.json wiring   (HEAD = A, includes the tooling)
 *   2. run `bun run acvp:verify`                   (records commit_sha = A)
 *   3. commit the receipt ALONE                    (HEAD = B; diff A..B = {receipt})
 * doctor's freshness (tree-unchanged-since-receipt-modulo-the-receipt-file) then
 * reports fresh. Any later CODE change re-stales it until acvp:verify re-runs.
 *
 * Dependency-light: the acvp_invariants block is line-parsed (no yaml dep), the
 * same posture loa-freeside doctor.ts uses for the allowlist.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const REPO = process.cwd();
const BEACON_REL = "packages/protocol/beacon.yaml";
const RECEIPT_REL = "app/.well-known/acvp-proof-receipt.json";
const TEST_RUNNER = "bun";

type Invariant = { id: string; proof_artifact: string; status: string };

const unquote = (s: string): string => s.trim().replace(/^["']|["']$/g, "");

/** Parse `slug:` and the `acvp_invariants:` block (id · proof_artifact · status)
 *  by line — the block shape is fixed + simple, so a yaml dep is unwarranted. */
function parseBeacon(text: string): { slug: string; invariants: Invariant[] } {
  const slug = unquote(text.match(/^slug\s*:\s*(.+)$/m)?.[1] ?? "");
  const invariants: Invariant[] = [];
  let inBlock = false;
  let cur: Partial<Invariant> | null = null;
  const flush = () => {
    if (cur?.id && cur.proof_artifact) {
      invariants.push({ id: cur.id, proof_artifact: cur.proof_artifact, status: cur.status ?? "active" });
    }
  };
  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*#/.test(raw)) continue;
    if (!inBlock) {
      if (/^acvp_invariants\s*:/.test(raw)) inBlock = true;
      continue;
    }
    // a new top-level (column-0) key ends the block
    if (/^\S/.test(raw)) break;
    const idm = raw.match(/^\s*-\s*id\s*:\s*(.+)$/);
    if (idm) { flush(); cur = { id: unquote(idm[1]) }; continue; }
    const pm = raw.match(/^\s+proof_artifact\s*:\s*(.+?)\s*(?:#.*)?$/);
    if (pm && cur) { cur.proof_artifact = unquote(pm[1]); continue; }
    const sm = raw.match(/^\s+status\s*:\s*(.+?)\s*(?:#.*)?$/);
    if (sm && cur) { cur.status = unquote(sm[1]); continue; }
  }
  flush();
  return { slug, invariants };
}

function main(): number {
  const beaconText = readFileSync(join(REPO, BEACON_REL), "utf-8");
  const { slug, invariants } = parseBeacon(beaconText);
  if (!slug) {
    console.error(`acvp:verify — could not parse slug from ${BEACON_REL}`);
    return 1;
  }
  // BR-3 (bridgebuilder): a populated `acvp_invariants:` block that parses to
  // ZERO entries is parser/format drift, NOT a valid "nothing to attest" —
  // fail loud rather than silently emitting no receipt (false-green run).
  if (invariants.length === 0 && /^acvp_invariants\s*:/m.test(beaconText)) {
    console.error(
      `acvp:verify — ${slug}: ${BEACON_REL} declares acvp_invariants but none parsed — format drift? refusing to proceed`,
    );
    return 1;
  }
  const active = invariants.filter((i) => i.status !== "aspirational");
  if (active.length === 0) {
    console.log(`acvp:verify — ${slug}: no active (non-aspirational) invariants to attest; nothing to do`);
    return 0;
  }

  const proofPaths = [...new Set(active.map((i) => i.proof_artifact))];
  // BR-4 (bridgebuilder): pre-check existence so a beacon typo (config error)
  // is distinguishable from a genuine test failure — both would otherwise print
  // the same "proof tests FAILED" message after a non-zero `bun test`.
  const missing = proofPaths.filter((p) => !existsSync(join(REPO, p)));
  if (missing.length > 0) {
    console.error(`acvp:verify — ${slug}: declared proof_artifact(s) not found (check ${BEACON_REL}):`);
    for (const m of missing) console.error(`  ✗ ${m}`);
    return 1;
  }
  console.log(`acvp:verify — ${slug}: running ${proofPaths.length} proof file(s):`);
  for (const p of proofPaths) console.log(`  · ${p}`);
  try {
    execFileSync(TEST_RUNNER, ["test", ...proofPaths], { cwd: REPO, stdio: "inherit" });
  } catch {
    console.error(`acvp:verify — ${slug}: proof tests FAILED — refusing to write a receipt (default-FAIL)`);
    return 1;
  }

  const commit_sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf-8" }).trim();
  const passed_at = new Date().toISOString();
  const receipts = active.map((i) => ({
    slug,
    invariant_id: i.id,
    proof_artifact: i.proof_artifact,
    test_runner: TEST_RUNNER,
    passed_at,
    commit_sha,
  }));

  const outPath = join(REPO, RECEIPT_REL);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(receipts, null, 2) + "\n");
  console.log(
    `acvp:verify — ${slug}: wrote ${receipts.length} receipt(s) → ${RECEIPT_REL} @ ${commit_sha.slice(0, 8)}\n` +
      `  NOTE: commit the receipt ALONE so doctor reads it FRESH (tree unchanged since ${commit_sha.slice(0, 8)} modulo the receipt).`,
  );
  return 0;
}

process.exit(main());
