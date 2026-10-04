# Painted smoke visibility regression

On commit776d8bad, the isolated real browser check stopped callbacks for OS/app reduced motion, then measured36 callbacks in600ms after document.hidden was injected true and visibilitychange dispatched. The prior renderer's visibility gate was lost when replacing it with shared Animated.Image smoke; the new OrbVisual loop only depends on reduce. This proves the injected browser boundary, not a physical device background transition.

Planned smallest fix: preserve the current breath value, stop the existing Animated loop while hidden, restart while visible, and remove the listener/stop the loop on cleanup. The same unchanged callback gate must pass before declaring fixed. Do not infer a physical/native pass. The full preview guard and single-submit/retry checks must also run after the renderer-specific stale shader assertions are replaced by visible painted-scene assertions.

The diagnostic copy belongs at .local/check-painted-lockdown.mjs when rerunning (its helper import is relative to that location). It launches an isolated headless profile and controls no account or existing browser.

Installed React Native Web AppState maps document.visibilityState to active/background and subscribes to visibilitychange. Its Animated.loop.stop marks the loop finished; reset clears that flag. Official React Native docs likewise define reset as stopping/resetting the current animation (https://github.com/react/react-native-website/blob/main/docs/animated.md). The fix will use this existing cross-platform AppState boundary and reset/start only on active. The browser boundary test must inject both hidden and visibilityState consistently; its zero-callback requirement remains unchanged. Native lifecycle behavior remains unverified without a device.

Result: OS and in-app reduced motion each0 callbacks/600ms; hidden0; restored visibility36/600ms. The complete preview drive also passed login-free page/guarded engine, focused listening, one request on a double final-answer activation and recoverable retry. The loop restarts from its resting value after backgrounding; it does not attempt to simulate unseen motion.
