# One-time Pages beta setup and repeatable deployment

This repository currently has a branch-based Pages deployment from main.
A project has one Pages deployment: deploying a beta-only artifact could remove the stable homepage.
The new **Combined stable and beta Pages** workflow therefore always uploads and deploys a single site:

- /index.html: byte-identical v0.5 from aa3bc1a6b3b72f950b3cfea7235e6ee5df58e343.
- /beta/index.html: byte-identical game from 3c412a014155fb80ef9383de8e2cbbc755e94600 (the successful APK commit).
- /beta/build-info.json: game commit and HTML SHA-256, matching that APK's game.
- /_deployment.json: workflow commit plus stable and beta source identifiers.

The URLs after deployment are:
https://sacredcattoucher.github.io/puzzle-connect-game/
https://sacredcattoucher.github.io/puzzle-connect-game/beta/

## Minimum manual steps

The connected GitHub tool cannot read or modify Pages source settings or environment policies.
No browser automation is needed. Initial config has deploy=false: the combined site is built/tested,
but publishing is deliberately skipped until the repository owner completes these steps.

1. Open https://github.com/SacredCatToucher/puzzle-connect-game/settings/pages .
   Under **Build and deployment → Source**, select **GitHub Actions**.
   Do not change a custom domain, HTTPS, repository visibility, or access permissions.
   The existing published v0.5 remains served until a successful new deployment.
2. If the existing **github-pages** environment restricts deployment to main, open
   https://github.com/SacredCatToucher/puzzle-connect-game/settings/environments ,
   select **github-pages → Deployment branches and tags**, and add the exact branch
   **feature/group-visuals-number-toggle** to the selected branches.
   Keep existing reviewer/approval restrictions. Do not select “All branches”.
   Skip this step if that branch is already allowed.
3. On **feature/group-visuals-number-toggle**, edit **.github/pages-beta.json**:
   change only **"deploy": false** to **"deploy": true**, then commit to that same branch.
   This push automatically starts **Combined stable and beta Pages**. Approve its environment
   deployment if your existing policy requires review. No merge to main is needed.

Use a config-file commit rather than relying on a Run workflow button:
GitHub may not display workflow_dispatch controls for a workflow absent from the default branch.
Once enabled, future config/tooling pushes on the test branch automatically publish the combined site.

Official source selection instructions:
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Future beta updates

After validating a new beta game/APK, update betaCommit, betaHtmlGitBlob and betaHtmlSha256 in
.github/pages-beta.json. The workflow checks out that exact commit and rejects different HTML.
Do not silently advance to branch HEAD: the current beta must remain the same game as the existing APK.

Stable is intentionally frozen to v0.5. Selecting Actions stops the old automatic main-based
Pages deployment; future changes on main do not automatically replace the pinned homepage.
Advancing stable requires deliberately updating the stable source pin and its approved blob hash.

Only this workflow deploys Pages. The APK workflow never publishes Pages and now ignores Pages-only
config/docs/scripts changes, so setup does not rebuild APK or run A2/BFS. Root game files are unchanged.

## Validation

Build job:
- verifies both HTML Git blob hashes and the beta HTML SHA-256 recorded by the successful APK build;
- tests exact root/beta placement, manifests, malformed config and tampered sources (4 tests);
- runs real headless Chrome against the assembled pages (2 tests), including game boot, beta moves,
  number toggle and reload persistence;
- uploads one github-pages-combined artifact containing both versions.

Deploy job (only when deploy=true) reads existing Pages configuration with enablement=false:
it does not change repository Pages settings. It deploys that complete artifact through deploy-pages.

Verify job downloads this run's exact artifact, waits for CDN propagation, checks both public URLs
return HTTP 200 and the exact expected HTML hashes, confirms the beta game commit, then opens
both public pages in Chrome and verifies game loading and beta interaction.
A green build alone is not a successful deployment: deploy and verify must both pass.

Local checks do not prove public deployment. Before manual setup, the expected result is:
build succeeds, deploy/verify skipped, stable remains unchanged, beta not yet published.

## Recovery and limitations

If deployment is blocked by environment policy, perform step 2 or obtain the existing required approval;
do not weaken protection globally. If Pages is not configured for Actions, complete step 1.
To restore the original publishing mechanism, set Source back to Deploy from a branch → main → /(root).
That restores the original stable site; beta will no longer be published by that source.

The two current HTML entry points are self-contained; the assembler intentionally publishes only
those files and metadata. If future game code gains external assets, extend the assembler and
its tests explicitly before changing the pinned game commit.
