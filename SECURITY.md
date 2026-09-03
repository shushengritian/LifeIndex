# Security and Privacy

## Security model

LifeIndex V1 is a static local-first PWA. GitHub Pages serves application files, while each browser stores its own records in IndexedDB. There is no V1 account, backend, synchronization service, analytics service, or remote business-data store.

The application URL and static source may be accessible to other people depending on the selected GitHub visibility and Pages configuration. That does not grant access to records stored in another browser profile or device.

## Sensitive data handling

- Never submit a real LifeIndex backup, personal record, secret, or identifying test fixture to the repository or an issue.
- Application logs must describe event types, entity identifiers only when safe, counts, versions, and failure classes—not amounts, notes, titles, or backup payloads.
- URL Actions keep every field after the URL fragment marker, apply a strict allowlist, preview before mutation, deduplicate by action ID, and replace the route after every terminal outcome so payloads do not enter HTTP requests or remain active in history.
- A backup must be parsed and validated before the application offers to replace current data.

## Data durability limitations

IndexedDB improves offline reliability but is not an absolute backup. Clearing Safari website data, removing the installed web app, device loss, or operating-system storage management can remove local records. LifeIndex therefore treats versioned JSON export and tested restore as release-critical features.

## Reporting a problem

For now, report security or data-loss concerns privately to the repository owner. Do not include real data; provide sanitized reproduction steps and the application/schema version instead.
