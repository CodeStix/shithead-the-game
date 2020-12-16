#!/bin/bash

set -e 

cd client
parcel build
cp -r client/dist server/public