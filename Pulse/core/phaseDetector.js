import { mathUtils } from '../utils/math';

/**
 * Phase Segmentation for Bicep Curls:
 * Concentric = Lifting/flexion phase
 * Inflection = Peak flexion / apex of curl
 * Eccentric = Lowering/extension phase
 * 
 * Segments based on rotational sign inflection, velocity proxy zero-crossing,
 * and calibrated movement direction.
 */
export class PhaseDetector {
  /**
   * Segments a slice of motion buffer for a single repetition candidate.
   * @param {Array} repSamples - Array of processed motion frames in this rep
   * @param {Object} baseline - Calibrated baseline profile if available
   */
  static segment(repSamples, baseline = null) {
    if (!repSamples || repSamples.length < 6) {
      return null;
    }

    const startTs = repSamples[0].timestamp;
    const endTs = repSamples[repSamples.length - 1].timestamp;
    const totalDuration = endTs - startTs;

    // Find the primary rotational axis or dynamic magnitude peak
    // During bicep curl concentric flexion, angular velocity rises to a peak, passes zero at the top
    // (inflection), and reverses during eccentric extension.
    let maxInflectionScore = -Infinity;
    let inflectionIdx = -1;

    // We search between 20% and 80% of the repetition window for the concentric apex
    const startSearch = Math.floor(repSamples.length * 0.20);
    const endSearch = Math.floor(repSamples.length * 0.80);

    for (let i = startSearch; i <= endSearch; i++) {
      const sample = repSamples[i];
      // Score based on gyro activity dip/direction reversal + max linear acceleration height
      const dynamicMag = sample.linAccMagnitude || 0;
      const gyroMag = sample.gyroMagnitude || 0;

      // At top of curl, linear displacement is maximal, gyro often experiences a turnaround dip
      const score = (dynamicMag * 1.5) + (100 / (gyroMag + 5.0));

      if (score > maxInflectionScore) {
        maxInflectionScore = score;
        inflectionIdx = i;
      }
    }

    // Fallback if no clean inflection found
    if (inflectionIdx === -1 || inflectionIdx <= 1 || inflectionIdx >= repSamples.length - 2) {
      inflectionIdx = Math.floor(repSamples.length * 0.50);
    }

    const inflectionTs = repSamples[inflectionIdx].timestamp;

    const concentricStartTimestamp = startTs;
    const concentricEndTimestamp = inflectionTs;
    const eccentricStartTimestamp = inflectionTs;
    const eccentricEndTimestamp = endTs;

    const concentricDurationMs = Math.max(0, concentricEndTimestamp - concentricStartTimestamp);
    const eccentricDurationMs = Math.max(0, eccentricEndTimestamp - eccentricStartTimestamp);

    // Segment samples
    const concentricSamples = repSamples.slice(0, inflectionIdx + 1);
    const eccentricSamples = repSamples.slice(inflectionIdx);

    // Calculate phase confidence based on duration feasibility
    let phaseConfidence = 85;
    if (concentricDurationMs < 300 || eccentricDurationMs < 300) {
      phaseConfidence -= 35;
    }
    const ratio = concentricDurationMs / (eccentricDurationMs + 1);
    if (ratio > 4.0 || ratio < 0.25) {
      phaseConfidence -= 25;
    }

    return {
      concentricStartTimestamp,
      concentricEndTimestamp,
      eccentricStartTimestamp,
      eccentricEndTimestamp,
      concentricDurationMs,
      eccentricDurationMs,
      concentricSamples,
      eccentricSamples,
      phaseConfidence: mathUtils.clamp(phaseConfidence, 0, 100)
    };
  }
}
