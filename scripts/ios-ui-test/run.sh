#!/bin/bash
# Native drive of the daily ritual and notifications in an iOS Simulator (no Apple account needed).
# Usage: scripts/ios-ui-test/run.sh <simulator-udid> <CrystalBall.app> <metro-host:port> <out-dir> [xcodebuild args, e.g. -only-testing:…]
# Reinstalls an existing simulator build before each selected case and builds only the UI-test bundle.
# For a development build, start Metro with EXPO_PUBLIC_ENGINE_URL set to the running local engine (with Ollama).
# The Friday fallback case also accepts an empty Metro argument with a bundled Release build and needs no engine.
# The server push fires when the daily ritual case signals it is ready. After onboarding, each case closes the app and
# signals for its saved state to get every ladder feature open (scripts/ladder-seed.mjs).
set -euo pipefail
udid=$1 app=$2 metro=$3 out=$4 here=$(cd "$(dirname "$0")" && pwd) root=$(cd "$(dirname "$0")/../.." && pwd)
mkdir -p "$out" && rm -f "$out/ready-for-push" "$out/pushed" "$out/ready-for-ladder" "$out/ladder-seeded"
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
 rm -f "$out/ready-for-push" "$out/pushed" "$out/ready-for-ladder" "$out/ladder-seeded"
 xcrun simctl uninstall "$udid" com.janustsen.crystalball 2>/dev/null || true
 xcrun simctl install "$udid" "$app"
 (until [ -e "$out/ready-for-push" ]; do sleep 1; done; cd "$root" && npx tsx scripts/simulator-push.mts "$udid" sky > "$out/push.log" 2>&1; touch "$out/pushed") &
 watcher=$!
 # AsyncStorage keeps short values in manifest.json and longer ones in a file named by the key's MD5.
 (until [ -e "$out/ready-for-ladder" ]; do sleep 1; done; cd "$root" && node --input-type=module - "$(xcrun simctl get_app_container "$udid" com.janustsen.crystalball data)/Library/Application Support/com.janustsen.crystalball/RCTAsyncLocalStorage_V1" <<'JS' > "$out/ladder.log" 2>&1 && touch "$out/ladder-seeded"
import {readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';import {createHash} from 'node:crypto';import {allOpen} from './scripts/ladder-seed.mjs';
const dir=process.argv[2],key='crystal-ball-v1',manifest=`${dir}/manifest.json`,file=`${dir}/${createHash('md5').update(key).digest('hex')}`;
const stored=JSON.parse(readFileSync(manifest,'utf8')),value=JSON.stringify({...JSON.parse(stored[key]??readFileSync(file,'utf8')),ladder:allOpen});
if(value.length<=1024){stored[key]=value;if(existsSync(file))rmSync(file)}else{stored[key]=null;writeFileSync(file,value)}
writeFileSync(manifest,JSON.stringify(stored));console.log('seeded ladder');
JS
 ) &
 seeder=$!
 trap 'kill $watcher $seeder 2>/dev/null || true' EXIT
 cd "$root" && TEST_RUNNER_RITUAL_OUT="$out" TEST_RUNNER_RITUAL_METRO="$metro" xcodebuild test -workspace ios/CrystalBall.xcworkspace -scheme RitualUITests \
  -destination "id=$udid" -derivedDataPath .local/ui-test-build -resultBundlePath "$out/$test_case-$(date +%s).xcresult" ${args[@]+"${args[@]}"} "-only-testing:$test_id"
 kill "$watcher" "$seeder" 2>/dev/null || true
 wait "$watcher" "$seeder" 2>/dev/null || true
 trap - EXIT
done
