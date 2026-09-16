import { mathUtils } from '../utils/math';
import { BicepCurlConfig } from '../exercises/bicepCurl';

/**
 * Calibration Engine
 * Orchestrates 3-5 controlled calibration repetitions to establish:
 * - baselineConcentricVelocity (using MEDIAN of valid reps)
 * - typical movement amplitude
 * - typical concentric and eccentric durations
 * - movement signal profile
 */
export class CalibrationManager {
  constructor() {
    this.reps = [];
    this.isComplete = false;
    this.baseline = null;
    this.targetReps = BicepCurlConfig.calibration.targetReps; // 5
    this.minReps = BicepCurlConfig.calibration.minRepsRequired; // 3
  }

  reset() {
    this.reps = [];
    this.isComplete = false;
    this.baseline = null;
  }

  addRep(repData) {
    if (this.isComplete) return this.baseline;

    // Filter out obviously invalid reps during calibration
    if (!repData || !repData.valid || repData.confidence < 60) {
      return {
        status: 'REJECTED',
        reason: 'Movement unclear. Perform controlled rep.',
        repsCount: this.reps.length,
        targetReps: this.targetReps
      };
    }

    this.reps.push(repData);

    if (this.reps.length >= this.targetReps) {
      const result = this.calculateBaseline();
      return result;
    }

    return {
      status: 'PROGRESS',
      repsCount: this.reps.length,
      targetReps: this.targetReps,
      lastRep: repData
    };
  }

  calculateBaseline() {
    if (this.reps.length < this.minReps) {
      return {
        status: 'FAILED',
        error: 'Insufficient valid reps'
      };
    }

    const velocities = this.reps.map(r => r.estimatedConcentricVelocity);
    const amplitudes = this.reps.map(r => r.movementAmplitude);
    const concentricDurations = this.reps.map(r => r.concentricDurationMs);
    const eccentricDurations = this.reps.map(r => r.eccentricDurationMs);

    // Robust statistics: Use MEDIAN of valid calibration repetitions
    const baselineConcentricVelocity = mathUtils.round(mathUtils.median(velocities), 3);
    const amplitudeMedian = mathUtils.round(mathUtils.median(amplitudes), 2);
    const concentricDurationMedian = Math.round(mathUtils.median(concentricDurations));
    const eccentricDurationMedian = Math.round(mathUtils.median(eccentricDurations));

    // Consistency verification: Check variance
    const velStdDev = mathUtils.stdDev(velocities);
    const varianceRatio = baselineConcentricVelocity > 0 ? (velStdDev / baselineConcentricVelocity) : 1;

    if (varianceRatio > BicepCurlConfig.calibration.maxVarianceRatio || baselineConcentricVelocity <= 0) {
      return {
        status: 'FAILED',
        error: 'High variability between calibration reps. Try again with consistent cadence.',
        repsCount: this.reps.length
      };
    }

    this.baseline = {
      exercise: 'bicep_curl',
      calibratedAt: Date.now(),
      baselineConcentricVelocity,
      amplitudeMedian,
      concentricDurationMedian,
      eccentricDurationMedian,
      repsCount: this.reps.length,
      varianceRatio: mathUtils.round(varianceRatio, 2)
    };

    this.isComplete = true;

    return {
      status: 'COMPLETE',
      baseline: this.baseline,
      repsCount: this.reps.length,
      targetReps: this.targetReps
    };
  }

  getBaseline() {
    return this.baseline;
  }
}
