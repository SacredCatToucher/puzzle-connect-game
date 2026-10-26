# B1.5 direct dragging and swap animation

Development branch: feature/drag-swap-animation. Stable v0.5 and main remain unchanged.
No B2/B3/A3 work or shortest-path BFS is included.

## Presentation
Original groups() and move(), including clipping/refill/count/victory, remain byte-identical.
Pointer input now delegates to a presentation controller, so the former handler byte-identity assertion
is replaced by delegation/interruption checks. Existing rule and outline fixtures remain.

A fixed pointer-events:none overlay clones tiles. The connected source group follows the pointer
through transforms in requestAnimationFrame; there is no per-frame grid layout or board render.
At release, the unchanged move() supplies the final permutation. Every tile identity, including
clipped group members and refilled/displaced tiles, animates from its current visual position to its
actual destination over 200ms. Final group outlines appear when the overlay is removed.
Invalid drops and cancellation return without a move. This is not an assumed two-tile swap.

Settling blocks further input and temporarily disables controls. Pointer capture, cancel, blur,
viewport resize/scroll and hidden-document cleanup prevent stuck states. Reduced motion retains
direct dragging but skips settling. Test board setters are injected only into test documents.

## Tests
Existing 40 cases: 11 A1 + 8 A2 + 6 render checks + 11 browser + 4 upload/layout.
12 added Chrome cases: direct following, release continuity/displaced tile, invalid drop,
rigid L group, clipped nine-tile destinations, rapid extra input, real CDP touch, touch cancellation,
reduced motion, resize cleanup, two-click exchange, and 320/390/768px no-gap checks.
Run the existing commands plus node scripts/check-motion.mjs using Playwright and CHROME_PATH.
A2 only reruns existing rule regressions; it performs no BFS or distance calculation.

## Same-commit delivery and rollback
The new branch builds APK and web bundle from one GITHUB_SHA and compares the source HTML with
the HTML extracted from the signed APK. After success, update source pins on the existing publisher
branch. Its combined Pages workflow and github-pages environment protections remain unchanged.
Any required approval must be handled by the owner; do not bypass it.

B1.5 Android: com.sacredcattoucher.puzzleconnect.beta.b15, versionCode 3, versionName 0.5.2-beta,
label Puzzle Connect B1.5 Beta. It installs alongside stable and the previous Beta. Keep both installed;
data is not migrated into the separate B1.5 sandbox. Debug signing on clean runners can differ,
so future builds with the same applicationId are not guaranteed to overwrite a differently signed build.

Previous verified Beta game: 3c412a014155fb80ef9383de8e2cbbc755e94600.
Actions run: 40222036907; artifact: 12610056215.
If available it is copied into the new artifact's rollback/ directory with original build-info.
No prior artifacts are deleted. Web rollback restores those old beta source pins; stable pins stay fixed.

## Phone checks
Real photos in portrait/landscape; fast drags along all edges; irregular/large groups; multiple fingers;
background/foreground; reduced motion; prolonged rapid input on low-end WebViews.
Check seams, jumps, locked controls and memory usage. Keep the old Beta for comparison.
