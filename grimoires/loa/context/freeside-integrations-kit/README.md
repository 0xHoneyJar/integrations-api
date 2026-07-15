# Freeside Integrations Architecture Kit

Prepared 2026-07-15 for evolving `freeside-mediums` / `mediums-api` into the
Freeside integrations building.

## Contents

- `claude-cli-prompt.md` — a paste-ready implementation handoff for Claude CLI.
- `architecture.md` — the proposed target architecture, invariants, migration,
  governance loop, and provider sequence.
- `reference-implementation/` — a deliberately small Effect reference showing
  the raw-event envelope, provider normalization, zero-silent-drop disposition,
  and atomic idempotency boundary.

## Intended use

1. Unzip this kit outside the target repository.
2. Read `architecture.md` and adjust any operator-owned decisions.
3. Start Claude CLI in `/Users/zksoju/Documents/GitHub/mediums-api`.
4. Paste `claude-cli-prompt.md`.

The reference implementation is architectural evidence, not a patch to copy
wholesale. Claude should reconcile it with current repository state and Loa
gates before changing production code.

