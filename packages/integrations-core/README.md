# @0xhoneyjar/integrations-core

Core of the Freeside **integrations** building (federation slug `integrations-api`) —
the evolution of `freeside-mediums`. Provider behavior (Discord first) enters Freeside
through a versioned, evidence-backed contract, and **every decoded event has an
explainable disposition** — `projected` / `ignored` / `quarantined` / `duplicate` /
`conflict`, with zero silent drops.

> **Wave-1 status: NON-PRODUCTION reference.** In-memory, deterministic, offline. No
> secrets, no network, no database. The atomic `IngestionStore` is proven via `Ref`
> linearizability; a production transactional backend must preserve the same observable
> contract before this spine is used in production. See the durable-store ADR.

Sibling package `@0xhoneyjar/medium-registry` (unchanged) remains the **presentation
capability** domain and compatibility surface. This package is additive.

Effect peer dependency is pinned `>=3.21.2 <4` (the range proven by typecheck).

Design + governance: `grimoires/loa/{prd,sdd,sprint}.md`.
