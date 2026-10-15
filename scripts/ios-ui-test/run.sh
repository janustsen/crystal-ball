#!/bin/bash
# Native drive of the daily ritual and notifications in an iOS Simulator (no Apple account needed).
# Usage: scripts/ios-ui-test/run.sh <simulator-udid> <CrystalBall.app> <metro-host:port> <out-dir> [xcodebuild args, e.g. -only-testing:…]
# Installs an existing simulator build fresh, points it at a Metro server for this checkout's JavaScript, builds only
# the small UI-test bundle and runs it. Metro and the local engine (with Ollama) must already be running; start Metro
# with EXPO_PUBLIC_ENGINE_URL set to the engine. The server push fires when the test signals it is ready.
set -euo pipefail
udid=$1 app=$2 metro=$3 out=$4 here=$(cd "$(dirname "$0")" && pwd) root=$(cd "$(dirname "$0")/../.." && pwd)
mkdir -p "$out" && rm -f "$out/ready-for-push" "$out/pushed"
pods=$(dirname "$(readlink -f "$(command -v pod)")")/../libexec
GEM_HOME="$pods" "$(head -1 "$pods/bin/pod" | sed 's/^#!//')" "$here/add-target.rb"
xcrun simctl boot "$udid" 2>/dev/null || true
cases=(testDailyRitualAndNotifications testFridaySkyFallback)
filters=() args=()
for arg in "${@:5}"; do
 case "$arg" in
  -only-testing:*) filters+=("${arg#-only-testing:}") ;;
  *) args+=("$arg") ;;
 esac
done
for test_case in "${cases[@]}"; do
 test_id="RitualUITests/RitualUITests/$test_case"
 selected=false
 if [ ${#filters[@]} -eq 0 ]; then selected=true; fi
 for filter in ${filters[@]+"${filters[@]}"}; do
  if [[ "$test_id" == "$filter" || "$test_id" == "$filter/"* ]]; then selected=true; fi
 done
 if [ "$selected" = false ]; then continue; fi
 rm -f "$out/ready-for-push" "$out/pushed"
 xcrun simctl uninstall "$udid" com.janustsen.crystalball 2>/dev/null || true
 xcrun simctl install "$udid" "$app"
 (until [ -e "$out/ready-for-push" ]; do sleep 1; done; cd "$root" && npx tsx scripts/simulator-push.mts "$udid" sky > "$out/push.log" 2>&1; touch "$out/pushed") &
 watcher=$!
 trap 'kill $watcher 2>/dev/null || true' EXIT
 cd "$root" && TEST_RUNNER_RITUAL_OUT="$out" TEST_RUNNER_RITUAL_METRO="$metro" xcodebuild test -workspace ios/CrystalBall.xcworkspace -scheme RitualUITests \
  -destination "id=$udid" -derivedDataPath .local/ui-test-build -resultBundlePath "$out/$test_case-$(date +%s).xcresult" ${args[@]+"${args[@]}"} "-only-testing:$test_id"
 kill "$watcher" 2>/dev/null || true
 wait "$watcher" 2>/dev/null || true
 trap - EXIT
done
