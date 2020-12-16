#!/bin/bash

set -e 

cd client
yarn build
cd ..
cp -r client/dist server/public