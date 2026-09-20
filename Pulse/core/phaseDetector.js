import { CONSTANTS } from '../utils/constants';
import { mathUtils } from '../utils/math';

export const PhaseDetector = {
  segment(rep, calibration) {
    const samples = rep.samples || [];
    if (samples.length < 3) return null;
    const expectedSign = calibration.directionSign || 1;
    let turnIndex = typeof rep.turnIndex === 'number' && rep.turnIndex > 0 && rep.turnIndex < samples.length - 1 ? rep.turnIndex : -1;
    let peakDirectionalEnergy = -1;

    // The turning point is determined by the observed direction signal, then
    // checked against the strongest movement point as a fallback.
    for (let i = 1; turnIndex < 0 && i < samples.length - 1; i += 1) {
      const energy = Math.abs(samples[i].dominantGyro || 0);
      const before = (samples[i - 1].dominantGyro || 0) * expectedSign;
      const after = (samples[i + 1].dominantGyro || 0) * expectedSign;
      if (energy > peakDirectionalEnergy && before >= 0 && after <= 0) {
        peakDirectionalEnergy = energy;
        turnIndex = i;
      }
    }
    if (turnIndex < 0) {
      for (let i = 0; i < samples.length; i += 1) {
        const energy = Math.abs(samples[i].dominantGyro || 0);
        if (energy > peakDirectionalEnergy) {
          peakDirectionalEnergy = energy;
          turnIndex = i;
        }
      }
    }

    const start = samples[0].timestamp;
    const turn = samples[turnIndex].timestamp;
    const end = samples[samples.length - 1].timestamp;
    const concentricDurationMs = turn - start;
    const eccentricDurationMs = end - turn;
    if (concentricDurationMs < CONSTANTS.MIN_CONCENTRIC_DURATION_MS ||
      eccentricDurationMs < CONSTANTS.MIN_ECCENTRIC_DURATION_MS) return null;

    const expectedConcentric = samples.slice(0, turnIndex + 1);
    const directionalCount = expectedConcentric.filter((sample) =>
      (sample.dominantGyro || 0) * expectedSign >= 0).length;
    const gyroDirectionConfidence = directionalCount / Math.max(1, expectedConcentric.length);
    const angleConfidence = typeof rep.turnIndex === 'number' && rep.turnIndex === turnIndex ? 1 : 0.5;
    return {
      concentricStartTimestamp: start,
      concentricEndTimestamp: turn,
      eccentricStartTimestamp: turn,
      eccentricEndTimestamp: end,
      concentricDurationMs,
      eccentricDurationMs,
      turnIndex,
      confidence: Math.round(mathUtils.clamp((angleConfidence * 0.7 + gyroDirectionConfidence * 0.3) * 100, 0, 100))
    };
  }
};
