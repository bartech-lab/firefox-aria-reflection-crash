#!/bin/bash
# Reviewer check for the Firefox crash, using only npm and Docker.
#   ./reproduce.sh          unpatched 1.65.0: exits 0 when the 2 crash cases crash and the 3 controls pass
#   ./reproduce.sh --fixed  applies the Playwright change to the installed bundle: exits 0 when all 5 pass
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
npm ci --silent
if [[ ${1:-} == --fixed ]]; then
    sed -i 's/element\.ariaLabelledByElements ||/(element.getAttribute(\\"aria-labelledby\\") ? null : element.ariaLabelledByElements) ||/' node_modules/playwright-core/lib/coreBundle.js
fi
set +e
docker run --rm --network host --init --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp \
    -e PLAYWRIGHT_JSON_OUTPUT_NAME=/work/results.json -v "$PWD":/work -w /work \
    mcr.microsoft.com/playwright:v1.65.0-noble ./node_modules/.bin/playwright test --project=firefox --reporter=line,json
set -e
node -e '
const { stats } = require("./results.json"), fixed = process.argv[1] === "--fixed";
const want = fixed ? [5, 0] : [3, 2];
console.log(`passed ${stats.expected}, failed ${stats.unexpected}; expected passed ${want[0]}, failed ${want[1]}`);
process.exit(stats.expected === want[0] && stats.unexpected === want[1] ? 0 : 1);' -- "${1:-}"
