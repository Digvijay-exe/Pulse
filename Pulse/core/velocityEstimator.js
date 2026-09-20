import { mathUtils } from '../utils/math';

export const VelocityEstimator = {
  estimate(rep, phase) {
    if (!rep || !phase) return 0;
    const amplitude = rep.movementAmplitude;
    const durationMs = phase.concentricDurationMs;
    if (!mathUtils.isFiniteNumber(amplitude) || amplitude <= 0 ||
      !mathUtils.isFiniteNumber(durationMs) || durationMs <= 0) return 0;

    // This follows the phone prototype's velocity-loss principle: measure the
    // time from lift start to top, not the entire repetition. Dividing the
    // observed calibrated movement angle by that time makes the proxy more
    // resilient when a valid curl has a slightly different range of motion.
    // It is deliberately not reported as physical velocity (m/s).
    const value = amplitude / (durationMs / 1000);
    return mathUtils.isFiniteNumber(value) && value > 0 ? value : 0;
  }
};
