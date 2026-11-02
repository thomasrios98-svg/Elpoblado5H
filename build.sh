#!/bin/sh
# Compile src/app.jsx -> app.js (run after every edit to src/app.jsx, then commit both).
set -e
cd "$(dirname "$0")"
npx --yes esbuild@0.24.0 src/app.jsx --outfile=app.js --minify --target=es2018 --jsx=transform
