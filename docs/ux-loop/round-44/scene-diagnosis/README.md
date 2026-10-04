# Share frame investigation

The diagnostic is a copy of scripts/check-apothecary-scene.mjs with DIAGNOSE disabling frame assertions and adding CDP tracing plus canvas/image timing wrappers. Run the preserved diagnostic from .local/diagnose-apothecary.mjs so its relative helper import resolves. Only an isolated fresh headless Chrome profile is controlled.

The original gate failed Share at 66.6 ms. The diagnostic repeated 66.7 ms; no pass is claimed. Its generic console success banner is misleading because assertions were disabled for capture. See scene.json, share-times.json and trace.json. Expensive decode tasks are a lead, not yet causal proof. Next investigation: align trace image decode/raster events and RAF timestamps, identify the specific image/preview transition, then compare the smallest justified change against the original unchanged gate.
