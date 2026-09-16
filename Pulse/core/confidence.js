import { mathUtils } from '../utils/math';
import { BicepCurlConfig } from '../exercises/bicepCurl';

/**
 * Rep Confidence Evaluator
 * Evaluates candidates based on:
 * - Movement amplitude
 * - Duration feasibility
 * - Baseline similarity
 * - Gyro activity vs stillness
 * - Phase segmentation plausibility
 */
export class ConfidenceEvaluator {
  static evaluate(repData, baseline = null) {
    let score = 100;
    const config = BicepCurlConfig.validation;
    const det = BicepCurlConfig.detection;

    // 1. Duration check
    const duration = repData.durationMs;
    if (duration < det.minRepDurationMs || duration > det.maxRepDurationMs) {
      score -= 30;
    }

    // 2. Amplitude check
    const amp = repData.movementAmplitude || 0;
    if (amp < det.minMovementAmplitude) {
      score -= 35;
    }

    // 3. Phase balance check (concentric vs eccentric ratio)
    const conDur = repData.concentricDurationMs || 0;
    const eccDur = repData.eccentricDurationMs || 0;
    if (conDur > 0 && eccDur > 0) {
      const ratio = eccDur / conDur;
      if (ratio > config.maxAsymmetryRatio || ratio < (1 / config.maxAsymmetryRatio)) {
        score -= 20;
      }
    } else {
      score -= 25;
    }

    // 4. Baseline similarity check if calibrated
    if (baseline && baseline.amplitudeMedian > 0) {
      const ampDiff = Math.abs(amp - baseline.amplitudeMedian) / baseline.amplitudeMedian;
      if (ampDiff > 0.6) {
        score -= 20;
      }
    }

    // 5. Gyro activity check
    const maxGyro = repData.maxGyro || 0;
    if (maxGyro < det.gyroActiveThreshold) {
      score -= 30;
    }

    const finalScore = Math.round(mathUtils.clamp(score, 0, 100));
    const isValid = finalScore >= config.minConfidence;

    return {
      confidence: finalScore,
      valid: isValid,
      reason: isValid ? 'VALID' : (score < 50 ? 'MOVEMENT UNCLEAR' : 'LOW QUALITY')
    };
  }
}
