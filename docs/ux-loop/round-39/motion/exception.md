# First motion run: Share frame pause

Share measured55.56fps, p95=16.7ms, one183.3ms frame, no renderer long tasks. The other interactions and45-second ambient sample remained around60fps/max16.8ms. This run is a failed timing measurement, not a pass.

The retained trace places a205.976ms RunTask on CrGpuMain during Share, with only0.474ms thread CPU time. The longest renderer RunTask in the same window is15.985ms. This points to GPU-process waiting or descheduling rather than a long JavaScript task; it does not by itself prove the external cause. No application code has been changed on that inference.

A second isolated run on identical product code is being collected. Keep both results; a subsequent pass must not erase this platform-level pause. Raw trace path/hash and timing excerpt are retained in this directory. Golden opening was separately measured at60.13fps, max16.8ms and no long tasks.

The unchanged-code recheck passes every interaction and45-second ambient scene at approximately60fps, max16.8ms, with no long tasks. Share specifically measures60.2fps/max16.8ms. The first trace remains an observed GPU-process pause; external cause is not conclusively identified. No performance workaround or threshold waiver was applied.
