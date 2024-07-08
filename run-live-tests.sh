#!/usr/bin/env bash
set -o pipefail

# Function to add a prefix to each direct line of output
add_prefix() {
  local prefix=$1
  while IFS= read -r line; do
    echo "$prefix : $line"
  done
}

echo ""
echo "Running integration tests against the real Mina network."
echo ""

./run src/run-live.ts --bundle | add_prefix "TOKEN_FACTORY" &
TOKEN_FACTORY_PROC=$!


# Wait for each process and capture their exit statuses
wait $DEX_PROC
if [ $? -ne 0 ]; then
  echo ""
  echo "TOKEN FACTORY test failed."
  echo ""
  FAILURE=1
fi

# Exit with failure if any process failed
if [ $FAILURE -ne 0 ]; then
  exit 1
fi

echo ""
echo "All tests completed successfully."
echo ""
