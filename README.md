# Firefox tab crash on `getByRole`, since Playwright 1.65.0

Reading a reflected ARIA element property, such as `ariaLabelledByElements`, on one element from two JS worlds crashes Firefox. Playwright 1.65.0 reads that property in its utility world, so `getByRole` with a `name` can crash the page.

## Reproduce with Playwright

Needs Node 22 or later and Docker. It runs in the official `mcr.microsoft.com/playwright:v1.65.0-noble` image.

    ./reproduce.sh

Expected: `passed 3, failed 2`. The two failures are `Page crashed`, in either read order. The three controls pass.

To see the proposed Playwright change work:

    ./reproduce.sh --fixed

Expected: `passed 5, failed 0`. This edits the installed package in `node_modules`, so run `npm ci` to undo it.

To compare browsers:

    npm ci
    docker run --rm --network host --init --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.65.0-noble ./node_modules/.bin/playwright test

Expected: 2 failures on Firefox, none on Chromium or WebKit.

## Reproduce on stock Firefox, without Playwright

Needs Node 22 or later on Linux x86-64. It downloads Firefox 159.0.1 and geckodriver 0.37.1 and checks their SHA-256.

    firefox-only/reproduce.sh

Expected: `RESULT: crash reproduced on /both-worlds only`. Each page runs 3 times:

| Page | Page script reads | Content script reads | Result |
|---|---|---|---|
| `/content-script-only` | no | yes | alive |
| `/page-script-only` | yes | no | alive |
| `/both-worlds` | yes | yes | crashes |

To try another Firefox, pass its binary: `firefox-only/reproduce.sh /path/to/firefox`. A build with the fix prints `RESULT: no crash, this Firefox has the fix`.

By hand, in any Firefox: open `about:debugging#/runtime/this-firefox`, load `firefox-only/extension/manifest.json` as a temporary add-on, and open this page over http:

    <!doctype html><span id="l">Save</span><button id="b" aria-labelledby="l"></button>
    <script>document.getElementById('b').ariaLabelledByElements;</script>

## Cause

The generated getter passes `aUseCachedValue` as null when this JS world has no cached value. `cachedAttrElements` is per element, so a read from a second world finds a cache hit in `Element::GetAttrAssociatedElementsForBindings` and writes through the null pointer.
