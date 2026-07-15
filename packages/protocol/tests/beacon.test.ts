import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../../..");
const source = Bun.YAML.parse(
  readFileSync(join(root, "packages/protocol/beacon.yaml"), "utf8"),
) as Record<string, unknown>;
const projection = JSON.parse(
  readFileSync(join(root, ".well-known/beacon.json"), "utf8"),
) as Record<string, unknown>;

describe("integrations-api BeaconV3", () => {
  test("source identity and machine projection stay aligned", () => {
    expect(projection.slug).toBe("integrations-api");
    expect(projection.schema_version).toBe("3");
    expect(projection.publisher).toBe("0xHoneyJar");
    expect(projection.is).toEqual(source.is);
    expect(projection.is_not).toEqual(source.is_not);
    expect(projection.composes_with).toEqual(source.composes_with);
    expect(projection.sealed_schemas).toEqual(source.sealed_schemas);
    expect(projection.capabilities).toEqual(source.capabilities);
    expect(projection.cycle_state).toEqual(source.cycle_state);
  });

  test("does not publish placeholder seals or fabricated composition tags", () => {
    expect(source.composes_with).toEqual({});
    expect(source.sealed_schemas).toEqual([]);
    expect(JSON.stringify(source)).not.toContain("0".repeat(64));
  });

  test("every active ACVP proof artifact exists", () => {
    const invariants = source.acvp_invariants as ReadonlyArray<{
      readonly status: string;
      readonly proof_artifact: string;
    }>;
    for (const invariant of invariants) {
      if (invariant.status === "active") {
        expect(existsSync(join(root, invariant.proof_artifact))).toBe(true);
      }
    }
  });
});
