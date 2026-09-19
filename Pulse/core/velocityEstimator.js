import { mathUtils } from '../utils/math';

export const VelocityEstimator = {
  estimate(rep, phase) {
    if (!rep || !phase || !rep.samples || !rep.samples.length) return 0;
    const phaseSamples = rep.samples.slice(0, phase.turnIndex + 1);
    if (phaseSamples.length < 2) return 0;

    // Short-window integration is used only as a relative proxy. A linear
    // end-drift correction re-anchors the estimate at the phase boundary.
    let velocity = 0;
    let peakVelocity = 0;
    let elapsedMs = 0;
    for (let i = 1; i < phaseSamples.length; i += 1) {
      const dtMs = phaseSamples[i].dtMs;
      if (!mathUtils.isFiniteNumber(dtMs) || dtMs <= 0 || dtMs > 250) continue;
      const acceleration = phaseSamples[i].linearAcceleration;
      if (!mathUtils.isFiniteNumber(acceleration)) continue;
      velocity += acceleration * (dtMs / 1000);
      elapsedMs += dtMs;
      if (Math.abs(velocity) > peakVelocity) peakVelocity = Math.abs(velocity);
    }
    const drift = elapsedMs ? velocity : 0;
    let correctedPeak = 0;
    let runningVelocity = 0;
    let runningMs = 0;
    for (let i = 1; i < phaseSamples.length; i += 1) {
      const dtMs = phaseSamples[i].dtMs;
      if (!mathUtils.isFiniteNumber(dtMs) || dtMs <= 0 || dtMs > 250) continue;
      runningVelocity += phaseSamples[i].linearAcceleration * (dtMs / 1000);
      runningMs += dtMs;
      const corrected = runningVelocity - drift * (runningMs / Math.max(1, elapsedMs));
      correctedPeak = Math.max(correctedPeak, Math.abs(corrected));
    }

    // Blend with amplitude/time so a noisy integration cannot dominate.
    const durationProxy = rep.movementAmplitude / Math.max(0.001, phase.concentricDurationMs / 1000);
    const value = correctedPeak > 0 ? (correctedPeak * 0.5 + durationProxy * 0.5) : durationProxy;
    return mathUtils.isFiniteNumber(value) && value > 0 ? value : 0;
  }
};
