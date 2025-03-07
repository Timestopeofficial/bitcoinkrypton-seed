#!/bin/bash

KRYPTON_VERSION=`grep -m 1 version ../package.json`

cat > npm/package.json <<_EOF_
{
  "name": "@timestope-official/bitcoinkrypton-browser",
$KRYPTON_VERSION
  "homepage": "https://timestope.com/",
  "description": "",
  "author": {
    "name": "The Krypton Development Team",
    "url": "https://timestope.com/"
  },
  "license": "Apache-2.0",
  "bugs": {
    "url": "https://github.com/Timestopeofficial/krypton/issues"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/Timestopeofficial/krypton.git"
  },
  "main": "web.esm.js",
  "types": "types.d.ts",
  "files": [
    "krypton.js",
    "krypton.js.map",
    "package.json",
    "VERSION",
    "web-babel.js",
    "web-babel.js.map",
    "web.js",
    "web.js.map",
    "web.esm.js",
    "web.esm.js.map",
    "web-offline.js",
    "web-offline.js.map",
    "worker.js",
    "worker-js.js",
    "worker.js.map",
    "worker-wasm.js",
    "worker-wasm.wasm",
    "types.d.ts",
    "namespace.d.ts"
  ]
}
_EOF_

cp ../dist/{namespace.d.ts,krypton.js,krypton.js.map,types.d.ts,VERSION,web-babel.js,web-babel.js.map,web.js,web.js.map,web.esm.js,web.esm.js.map,web-offline.js,web-offline.js.map,worker.js,worker-js.js,worker.js.map,worker-wasm.js,worker-wasm.wasm} npm/
cd npm

echo "
#####################################################################
# Running a test first: 'npm publish --access public --dry-run'     #
#####################################################################
"
npm publish --access public --dry-run

echo "
#####################################################################
# The real deal: 'npm publish --access public'                      #
#####################################################################
"

read -p "Does everything looks right in the previous output?
Should I run it for real this time? (yes/no) " yn
case $yn in
    [Yy]es|[Yy] ) npm publish --access public;;
    * ) echo "Mission aborted";;
esac
