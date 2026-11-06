#!/bin/bash
# Reproduces the crash on stock Firefox, without Playwright. Needs curl, tar and Node 22 or later.
#   firefox-only/reproduce.sh                    downloads Firefox 159.0.1 (checksum verified)
#   firefox-only/reproduce.sh /path/to/firefox   uses that Firefox binary
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
dl=$here/.download
mkdir -p "$dl"

geckodriver_url=https://github.com/mozilla/geckodriver/releases/download/v0.37.1/geckodriver-v0.37.1-linux64.tar.gz
geckodriver_sha=e815130ea95983e162ae91843b48d3a3ce991735635fce83a647afde21e09f7e
firefox_url=https://archive.mozilla.org/pub/firefox/releases/159.0.1/linux-x86_64/en-US/firefox-159.0.1.tar.xz
firefox_sha=469ce17120018e1c95411d254cf3c5f8db2dd1768a7acde5a2a089b00072ac65

fetch() { # fetch <url> <sha256> <file>
    [[ -f $3 ]] || curl -fsSL -o "$3" "$1"
    echo "$2  $3" | sha256sum -c --quiet
}

fetch "$geckodriver_url" "$geckodriver_sha" "$dl/geckodriver.tar.gz"
tar -xzf "$dl/geckodriver.tar.gz" -C "$dl"
firefox=${1:-}
if [[ -z $firefox ]]; then
    fetch "$firefox_url" "$firefox_sha" "$dl/firefox.tar.xz"
    [[ -x $dl/firefox/firefox ]] || tar -xf "$dl/firefox.tar.xz" -C "$dl"
    firefox=$dl/firefox/firefox
fi
"$firefox" --version
exec node "$here/run.mjs" "$firefox" "$dl/geckodriver"
