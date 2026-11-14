#!/bin/sh
# Run one variant of scripts/sim/experiments.json in this checkout, resumable (main fit and each fold are kept
# in probe-out/state-<name>/). Inputs: the pinned archive extracted here. Usage: run-local-variant.sh <name> [KEY=VALUE ...]
set -e
name=$1; shift
for kv in $(jq -r '.common_env | to_entries[] | "\(.key)=\(.value)"' scripts/sim/experiments.json) \
          $(jq -r --arg n "$name" '.configs[] | select(.name == $n) | .env | to_entries[] | "\(.key)=\(.value)"' scripts/sim/experiments.json) "$@"; do export "$kv"; done
out=probe-out/state-$name; mkdir -p "$out"
export LAPSIM_F1_STATE=${LAPSIM_F1_STATE:-$out/main.json} LAPSIM_F1_FOLD_CACHE=${LAPSIM_F1_FOLD_CACHE:-$out/folds}
env | grep '^LAPSIM_' | sort
node scripts/sim/calibrate.mjs 2>&1 | tee -a "$out/log.txt"
cp worker/lapsim/calibration-data.js "probe-out/cal-$name.js"
LAPSIM_CAL_FILE="$PWD/probe-out/cal-$name.js" node scripts/sim/validate.mjs "$name" > /dev/null
