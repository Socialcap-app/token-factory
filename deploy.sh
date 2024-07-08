#!/bin/bash

# $1 is Contract name = Communities, Claimings, Electors, Socialcap

npm run build

node build/src/deploy/deploy-zkapp.js Berkeley proofsEnabled $1 >> logs/$1Contract.deploy.log
