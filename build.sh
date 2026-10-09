#!/usr/bin/env sh
# Build the minified, self-contained plugin (see tools/build.py). Needs Python 3 and esbuild.
set -e
cd "$(dirname "$0")"
python tools/build.py "$@"
