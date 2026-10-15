import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RunnerTest(unittest.TestCase):
    def test_each_selected_case_gets_a_fresh_install(self):
        cases = ["testDailyRitualAndNotifications", "testFridaySkyFallback"]
        for filters, expected in [([], cases), (["-only-testing:RitualUITests"], cases),
                                  (["-only-testing:RitualUITests/RitualUITests/testFridaySkyFallback"], cases[1:])]:
            with self.subTest(filters=filters), tempfile.TemporaryDirectory(dir=ROOT) as tmp:
                base = Path(tmp)
                bin_dir = base / "bin"
                bin_dir.mkdir()
                log = base / "calls"
                def executable(path, body):
                    path.write_text("#!/bin/bash\n" + body)
                    path.chmod(0o755)
                executable(bin_dir / "pod", "exit 0\n")
                executable(bin_dir / "ruby", "exit 0\n")
                pod = base / "libexec/bin/pod"
                pod.parent.mkdir(parents=True)
                pod.write_text("#!" + str(bin_dir / "ruby") + "\n")
                executable(bin_dir / "xcrun", 'echo "xcrun $*" >> "$CALL_LOG"\n')
                executable(bin_dir / "xcodebuild", 'echo "xcodebuild $*" >> "$CALL_LOG"\n')
                env = dict(os.environ, PATH=str(bin_dir) + os.pathsep + os.environ["PATH"], CALL_LOG=str(log))
                subprocess.run(["/bin/bash", str(ROOT / "scripts/ios-ui-test/run.sh"), "device", "app", "", str(base / "out"), *filters],
                               env=env, check=True, capture_output=True, timeout=15)
                calls = log.read_text().splitlines()
                runs = [i for i, call in enumerate(calls) if call.startswith("xcodebuild ")]
                self.assertEqual(len(runs), len(expected))
                for i, case in zip(runs, expected):
                    self.assertEqual(calls[i-2:i], ["xcrun simctl uninstall device com.janustsen.crystalball", "xcrun simctl install device app"])
                    self.assertIn("-only-testing:RitualUITests/RitualUITests/" + case, calls[i])
                    self.assertEqual(calls[i].count("-only-testing:"), 1)


if __name__ == "__main__":
    unittest.main()
