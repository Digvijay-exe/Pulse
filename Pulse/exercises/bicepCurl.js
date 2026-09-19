import { CONSTANTS } from '../utils/constants';
import { mathUtils } from '../utils/math';

export const BicepCurl = {
  // Broad safety bounds only. Calibration supplies the actual operating values.
  initialThresholds: {
    movementStart: 35,
    gyroStart: 18,
    minAmplitude: 60
  },

  createCalibration(reps, bottomGravity) {
    const valid = reps.filter((rep) => rep && rep.valid && rep.phase && rep.estimatedConcentricVelocity > 0);
    if (valid.length < CONSTANTS.CALIBRATION_MIN_REPS) return null;
    const amplitudes = valid.map((rep) => rep.movementAmplitude);
    const durations = valid.map((rep) => rep.durationMs);
    const concentricDurations = valid.map((rep) => rep.phase.concentricDurationMs);
    const eccentricDurations = valid.map((rep) => rep.phase.eccentricDurationMs);
    const velocities = valid.map((rep) => rep.estimatedConcentricVelocity);
    const gyroValues = valid.map((rep) => rep.peakGyro);
    const signs = valid.map((rep) => rep.directionSign);
    const directionSign = signs.reduce((sum, sign) => sum + sign, 0) >= 0 ? 1 : -1;
    const amplitude = mathUtils.median(amplitudes);
    const durationMs = mathUtils.median(durations);
    const velocity = mathUtils.median(velocities);
    const amplitudeMad = mathUtils.medianAbsoluteDeviation(amplitudes, amplitude);
    const durationMad = mathUtils.medianAbsoluteDeviation(durations, durationMs);
    const noise = mathUtils.median(valid.map((rep) => rep.noiseEstimate));
    return {
      calibrationRepCount: valid.length,
      movementAmplitude: amplitude,
      amplitudeTolerance: Math.max(amplitude * 0.35, amplitudeMad * 3, 20),
      normalRepDurationMs: durationMs,
      durationToleranceMs: Math.max(durationMs * 0.4, durationMad * 3, 300),
      directionSign,
      bottomGravity,
      liftStartAngle: Math.max(15, amplitude * 0.25),
      topAngle: Math.max(55, amplitude * 0.78),
      bottomAngle: Math.min(18, Math.max(10, amplitude * 0.2)),
      peakGyro: mathUtils.median(gyroValues),
      gyroThreshold: Math.max(10, mathUtils.median(gyroValues) * 0.25),
      movementThreshold: Math.max(10, noise * 2.5, amplitude * 0.12),
      signalNoise: noise,
      concentricDurationMs: mathUtils.median(concentricDurations),
      eccentricDurationMs: mathUtils.median(eccentricDurations),
      baselineVelocity: velocity
    };
  }
};
