# Independent Pages-subpath preview verification

Source: `bf7862c32ff9e95dd030f1faed275a887def2355`; clean Git working tree before and after. Build: `LIFEINDEX_BASE_PATH=/LifeIndex/ LIFEINDEX_BUILD_ID=bf7862c32ff9e95dd030f1faed275a887def2355 npm run build -- --outDir /tmp/lifeindex-v4-subpath-bf7862c` succeeded. Production performance `dist/index.html` and `dist/sw.js` hashes are unchanged.

Preview: `http://127.0.0.1:4177/LifeIndex/`. Ran both projects in `playwright.v4-deployed.config.ts` with `LIFEINDEX_DEPLOYED_URL` set to that URL and `LIFEINDEX_EXPECTED_BUILD_ID` equal to the source SHA; zero retries. **8 passed (32.3s)**. Build identity, deep routes, manifest/icon/font paths, worker scope, durable writes, receipt return, backup and offline lazy-route behavior passed.

This is local preview coverage of the actual Pages base path, not a live Pages result. WebKit offline uses a local TCP-disconnected proxy of target bytes preserving `/LifeIndex/`; the other WebKit tests and all Chromium tests use the target preview directly. All test data is synthetic. Browser process and temporary preview were closed; port 4177 is verified closed.

Persistent evidence in this directory: [build log](build.log.txt), [test log](deployed.log.txt), [artifact identity](evidence.json). The following paths record original local collection locations and may be temporary.

Original evidence:
- `/tmp/lifeindex-v4-subpath-build.log`
- `/tmp/lifeindex-v4-subpath-preview.log`
- `/tmp/lifeindex-v4-subpath-deployed.log`
- `/tmp/lifeindex-v4-subpath-results`
- `/tmp/lifeindex-v4-subpath-evidence.json` (all 42 build file hashes, source SHA, HTML resource paths, complete manifest)
- `/tmp/lifeindex-v4-subpath-original-dist.sha256`

Built index SHA256: `944895945118ed46f813986df21c8dd95dfcd2d4fe70ce9e12c24338e14153dd`.
Built service worker SHA256: `41f7ae432a12ed6b88b8bf448fb60e599150724fe2c2d75abce0896625e7d4d3`.
All eight HTML asset/manifest paths begin `/LifeIndex/`; manifest id, scope and start_url equal `/LifeIndex/`. No repository source or docs changed. Real HTTPS Pages 8-case verification remains pending deployment.
