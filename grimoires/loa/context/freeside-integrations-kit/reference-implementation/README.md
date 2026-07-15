# Reference implementation

This sample demonstrates the invariant center of the integrations building:

- a provider-neutral raw-event envelope
- a Discord adapter behind an Effect service/layer
- typed normalization failures
- explicit projected, ignored, and quarantined dispositions
- one atomic idempotency/disposition commit boundary
- duplicate detection

It intentionally does not include HTTP servers, databases, secrets, real SDKs,
or provider network calls. Those belong in ratified implementation waves.

## Run

```sh
bun install
bun run typecheck
bun run test
```

## Important production substitution

`InMemoryIngestionStoreLayer` demonstrates the service contract. Production
must replace it with a transactional database implementation in which the
idempotency key and complete disposition record commit together.

