#!/usr/bin/env bash
# Bake every registered 512³ asset in parallel, then rebuild the index.
#
#   ./bake-all.sh            # jobs = CPU count
#   ./bake-all.sh 8          # 8 parallel jobs
#   ./bake-all.sh 1 tank     # serial, only ids containing "tank"
#
# Each asset is independent and the bake is deterministic, so the roster is just
# split across Node processes. 512³ needs no smaller canvas and no GPU.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
BAKER="$HERE/bake.mjs"
JOBS="${1:-$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 4)}"
FILTER="${2:-}"

cd "$ROOT"
mapfile -t IDS < <(node "$BAKER" --list | awk '{print $1}')
if [ -n "$FILTER" ]; then
  mapfile -t IDS < <(printf '%s\n' "${IDS[@]}" | grep -- "$FILTER" || true)
fi
if [ "${#IDS[@]}" -eq 0 ]; then echo "nothing to bake"; exit 0; fi

echo "assets: ${#IDS[@]}   jobs: $JOBS"
START=$(date +%s)
PIDS=()
for ((i = 0; i < JOBS; i++)); do
  CHUNK=()
  for ((k = i; k < ${#IDS[@]}; k += JOBS)); do CHUNK+=("${IDS[$k]}"); done
  [ "${#CHUNK[@]}" -eq 0 ] && continue
  LIST=$(IFS=,; echo "${CHUNK[*]}")
  node "$BAKER" --only "$LIST" &
  PIDS+=($!)
done

STATUS=0
for pid in "${PIDS[@]}"; do wait "$pid" || STATUS=1; done

node "$BAKER" --index-only
echo "done in $(( $(date +%s) - START ))s"
exit $STATUS
