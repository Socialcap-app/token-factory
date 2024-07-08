#!/bin/bash

npm run build

node build/src/tests/run-claim-voting-test-localonly.js
