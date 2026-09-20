# ADR-0008: V2 acceptance using browser automation

**Status:** Accepted by the owner on 2026-09-14

The owner explicitly authorized browser simulation and automated tests to replace the outstanding physical-iPhone release gate and requested completion of V2. This supersedes the mandatory physical sign-off for this release in V2_PLAN, PRD, test/deployment/development guidance, and IPHONE_ACCEPTANCE. It does not assert that a physical test passed.

V2 may be released after the existing Chromium/WebKit, migration/backup, responsive UI, and live Pages gates pass, the tag/Release are published, and the repository is synchronized. Existing successful evidence remains valid for unchanged runtime source; the final main push still runs the full workflow. No failing data-safety or privacy test is waived.

Physical-only evidence is deferred: Home Screen cold/offline launch, iOS suspension and lock-screen behavior, keyboard and safe areas on actual hardware, Files/iCloud handoff, storage eviction, and continuity of the owner's real records. The documented WebKit offline full-page reload skip remains disclosed. These are optional follow-ups for the owner and no longer block V2 completion. The executable physical checklist is retained.

Application 2.0.0, database schema 2, backup format 2, and all product/storage/privacy boundaries are unchanged. Future feature ideas require a new version plan; this decision creates no recurring work.
