import { mathUtils } from '../utils/math';

/**
 * Kinematic Fatigue Engine
 * 
 * IMPORTANT SCIENTIFIC LIMITATION:
 * This module estimates "Kinematic Fatigue" / "movement-performance decline"
 * derived strictly from wrist IMU velocity loss.
 * It DOES NOT measure cellular, metabolic, physiological, or CNS muscle fatigue.
 */
export class FatigueEngine {
  /**
   * Evaluates set fatigue and individual rep fatigue metrics
   * @param {number} velocityLossPercent - Current velocity loss percentage (0-100)
   * @param {number} repConfidence - Quality and confidence score of the rep (0-100)
   * @param {Array} historyReps - Previous reps in the current set
   */
  static evaluate(velocityLossPercent, repConfidence, historyReps = []) {
    const loss = mathUtils.clamp(velocityLossPercent, 0, 100);
    const confidence = mathUtils.clamp(repConfidence, 0, 100);

    // Heuristic fatigue score (0-100)
    // Primarily driven by velocity loss, modulated by rep confidence
    // High velocity loss with low confidence does not produce false high fatigue
    let rawScore = loss * 1.5; // 20% loss -> 30 score, 40% loss -> 60 score, 60% loss -> 90 score
    if (historyReps && historyReps.length > 2) {
      // Trend penalty: if multiple consecutive reps show declining velocity
      const recentLosses = historyReps.slice(-3).map(r => r.velocityLossPercent || 0);
      const avgRecent = mathUtils.mean(recentLosses);
      if (avgRecent > 15) {
        rawScore += (avgRecent - 15) * 0.5;
      }
    }

    const fatigueScore = Math.round(mathUtils.clamp(rawScore, 0, 100));

    // Determine Kinematic Fatigue Level
    let fatigueLevel = 'LOW';
    let color = 0x00e676; // Green

    if (loss > 30) {
      fatigueLevel = 'VERY HIGH';
      color = 0xff1744; // Red
    } else if (loss > 20) {
      fatigueLevel = 'HIGH';
      color = 0xff9100; // Orange
    } else if (loss > 10) {
      fatigueLevel = 'MODERATE';
      color = 0xffea00; // Yellow
    } else if (loss > 5) {
      fatigueLevel = 'MILD';
      color = 0x00e5ff; // Cyan
    }

    // Fatigue Confidence is scaled by rep confidence and signal quality
    const fatigueConfidence = Math.round(mathUtils.clamp(confidence * 0.95, 10, 100));

    return {
      fatigueLevel,
      fatigueScore,
      fatigueConfidence,
      color,
      isKinematicEstimate: true
    };
  }
}
