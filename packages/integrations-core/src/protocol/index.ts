/**
 * Protocol barrel — stable, boundary-crossing schemas for the integrations
 * building (FR-1). Runtime clients, credentials, and provider payloads do not
 * leak into these shared domain contracts.
 */
export * from "./provider.js";
export * from "./envelope.js";
export * from "./observation.js";
export * from "./disposition.js";
export * from "./result.js";
export * from "./coverage.js";
export * from "./source.js";
