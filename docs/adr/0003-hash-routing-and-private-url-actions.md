# ADR-0003: Hash routing and preview-first URL Actions

**Status:** Accepted

**Date:** 2026-09-03

## Context

GitHub Pages cannot provide application-specific rewrite rules for arbitrary SPA paths. The baseline's conceptual `?action=...` URL can send finance amounts, notes, focus titles, or other values to the hosting request and retain them in network/server history. URL opening can also be repeated by refresh or iOS Shortcuts.

## Decision

- Use hash routes for the application, including URL Actions.
- Encode actions as `#/action/<allowlisted-type>?actionId=<uuid>&...` so the payload remains in the URL fragment.
- V1 allowlisted types are `add-transaction`, `check-habit`, and `start-focus`.
- Parse and validate only documented fields; reject unknown action types and unsafe values.
- Render a preview/prefilled form and require user confirmation before a business write.
- Require a caller-provided UUID action ID and persist a receipt after a successful mutation.
- Treat an existing receipt as already handled and never create another entity.
- Replace the route after success or cancel so refresh cannot replay the action.

## Rationale

- URL fragments are handled by the client and are not included in the HTTP request.
- Hash routing also avoids static-host deep-link 404 failures.
- Preview-before-write prevents a link, history restoration, or untrusted sender from silently modifying private records.
- Durable receipts protect against repeated Shortcut execution across app restarts.

## Consequences

- Action receipts become a small V1 database store and are included in full backup/restore.
- User-authored iOS Shortcuts must generate a UUID for each intended action.
- Query-based actions are not a supported V1 compatibility fallback. Any later exception requires a new security ADR and may not place sensitive values in the network URL.
- Tests must cover unknown fields, malformed encodings, stale references, repeated IDs, cancel, success cleanup, and refresh.

## Rejected alternatives

- HTTP query actions: unnecessary privacy exposure.
- Silent action execution: unsafe against accidental or repeated link opening.
- In-memory deduplication: lost on app restart and insufficient for Shortcuts retries.
- Custom native URL scheme: unavailable to a pure PWA without a native application.
