# WEC tolerance diagnostic

No production values adopted. See docs/lapsim-handoff-physics.md section 18.

The manifest was declared before fitting. results.json includes full-precision errors, choices, bounds, iterations, cap hits and runtime. The two .jsonl.gz files preserve every logged iteration losslessly; decompress with gzip or Node node:zlib.gunzipSync. sha256.json identifies both compressed and uncompressed content and the exact fitter sources used.
