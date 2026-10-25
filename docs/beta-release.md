# Beta build and installation

The beta workflow runs automatically on pushes to feature/group-visuals-number-toggle.
It builds and tests one exact GITHUB_SHA and uploads APK and website artifacts from that checkout.
No main merge, stable Pages deployment, or Play Store publication occurs.

## Downloads and identity

Open the latest successful **Beta test build** run for the branch in GitHub Actions.
The **puzzle-connect-beta-<full commit SHA>** artifact contains:
- puzzle-connect-beta-debug.apk
- beta-site/index.html and beta-site/build-info.json
- SHA256SUMS.txt, apk-metadata.txt, signature.txt, old-signature.txt (when old artifact available)
- install-compatibility.txt and build-info.txt

The website index.html is copied byte-for-byte from the same checkout used by Capacitor.
CI compares source, website copy, synced Android HTML, and HTML extracted from the signed APK.
The manifest records the exact commit and HTML SHA-256. Artifact downloads require a GitHub login
and expire after 30 days. Download on the development computer, unzip, and transfer the APK to
the test phone if you do not want to sign in on that phone.

## Android installation and data

Stable v0.5: com.sacredcattoucher.puzzleconnect, versionCode 1.
Beta debug: com.sacredcattoucher.puzzleconnect.beta, versionCode 2, versionName 0.5.1-beta.

Beta intentionally installs separately as **Puzzle Connect Beta**, preserving the stable app and its data.
It does not overwrite or migrate stable data/preferences. Do not uninstall stable v0.5 to install beta.
The previous workflow generated a runner-local debug key; the old private key is not in the APK.
CI prints actual certificate SHA-256 fingerprints for comparison when the original artifact can be downloaded.
Matching package name and a higher versionCode alone do not guarantee updates: the signing key must match too.
This build does not introduce signing secrets or change repository permissions.
Future clean-runner debug builds can use a different certificate; do not uninstall an existing beta
with important data merely to bypass an update error. Persistent beta signing is separate future work.

## Pages status and safe hosting

The existing stable Pages site uses main. This workflow does not deploy to that site's root.
The connected GitHub tools cannot read or modify Pages source settings, and browser control was
stopped because the current URL could not be reliably determined. No Pages settings were changed.
There is therefore no verified public beta URL yet.

The beta-site folder is a ready-to-host static bundle from the APK commit. To complete independent
GitHub Pages hosting without changing main or the stable site's settings, a repository owner can
create a dedicated public beta hosting repository and enable Pages there, then upload only beta-site
contents. Record its URL and confirm build-info.json matches the APK commit before sharing.
Do not call an artifact preview, raw HTML URL, or unpublished path a live Pages deployment.

## Validation and phone checklist

CI runs the existing 36 named tests (11 A1 + 8 A2 + 6 render logic + 11 browser),
the existing web check, and 4 responsive upload smoke tests (320, 390, 768 and 1280px wide).
A2 is only a rule regression check; no A3 BFS or distance calculation runs.

On a phone:
1. Keep stable v0.5 installed; install the separate beta APK.
2. Upload a real photo, join horizontal, vertical and L-shaped groups; inspect continuous pictures.
3. Drag linked groups across the boundary and reform them; check restored outer outlines and move counts.
4. Confirm numbers start hidden, toggle them, close/reopen, and confirm preference persistence.
5. Test portrait/landscape and rapid touch drags; watch for seams, flashing or stuck selection.
6. Once a real beta Pages URL is published, repeat browser tests and compare build-info.json commit
   with the APK's included build-info.txt.
