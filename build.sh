#!/bin/bash
set -e 

rm -rf build/

# will build files to server/public/js/
cd client
yarn build

cd ../server
mkdir ../build
yarn build
mv build ../build/src
cp package.json ../build
cp -r public ../build/public
cp -r views ../build/views
