import { CONSTANTS } from '../utils/constants';
import { mathUtils } from '../utils/math';

export const FatigueEngine = {
  evaluate(rep, baselineVelocity) {
    const velocity = rep.estimatedConcentricVelocity;
    if (!mathUtils.isFiniteNumber(baselineVelocity) || baselineVelocity <= 0 ||
      !mathUtils.isFiniteNumber(velocity) || velocity <= 0) {
      return { normalizedConcentricVelocity: 0, velocityLossPercent: 0, fatigueScore: 0,
        fatigueLevel: 'LOW', fatigueConfidence: 0 };
    }
    const normalizedConcentricVelocity = velocity / baselineVelocity;
    const velocityLossPercent = mathUtils.clamp(((baselineVelocity - velocity) / baselineVelocity) * 100, 0, 100);
    const fatigueScore = Math.round(velocityLossPercent);
    const fatigueConfidence = Math.round(mathUtils.clamp(rep.confidence * (rep.phase.confidence / 100), 0, 100));
    return {
      normalizedConcentricVelocity,
      velocityLossPercent,
      fatigueScore,
      fatigueLevel: this.getLevel(velocityLossPercent),
      fatigueConfidence
    };
  },

  getLevel(velocityLossPercent) {
    if (velocityLossPercent <= CONSTANTS.FATIGUE_BANDS[0]) return 'LOW';
    if (velocityLossPercent <= CONSTANTS.FATIGUE_BANDS[1]) return 'MILD';
    if (velocityLossPercent <= CONSTANTS.FATIGUE_BANDS[2]) return 'MODERATE';
    if (velocityLossPercent <= CONSTANTS.FATIGUE_BANDS[3]) return 'HIGH';
    return 'VERY HIGH';
  },

  summarize(reps, baselineVelocity) {
    const valid = reps.filter((rep) => rep.valid);
    const values = valid.map((rep) => rep.velocityLossPercent).filter((value) => mathUtils.isFiniteNumber(value));
    const confidences = valid.map((rep) => rep.confidence);
    const concentric = valid.map((rep) => rep.concentricDurationMs);
    const eccentric = valid.map((rep) => rep.eccentricDurationMs);
    const finalLoss = values.length ? values[values.length - 1] : 0;
    const averageLoss = mathUtils.mean(values);
    const fatigueConfidence = Math.round(mathUtils.mean(valid.map((rep) => rep.fatigueConfidence)));
    return {
      totalDetectedReps: reps.length,
      validReps: valid.length,
      rejectedReps: reps.length - valid.length,
      baselineVelocity: baselineVelocity || 0,
      averageVelocityLoss: averageLoss,
      finalVelocityLoss: finalLoss,
      maximumVelocityLoss: values.length ? Math.max.apply(null, values) : 0,
      averageConcentricDuration: mathUtils.mean(concentric),
      averageEccentricDuration: mathUtils.mean(eccentric),
      averageRepConfidence: Math.round(mathUtils.mean(confidences)),
      fatigueLevel: this.getLevel(finalLoss),
      fatigueScore: Math.round(averageLoss),
      fatigueConfidence
    };
  }
};
