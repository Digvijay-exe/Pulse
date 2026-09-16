import { mathUtils } from '../utils/math';
import { BicepCurlConfig } from '../exercises/bicepCurl';

/**
 * IMU-Derived Relative Concentric Velocity Estimator
 * 
 * IMPORTANT SCIENTIFIC PRINCIPLE:
 * We DO NOT integrate raw acceleration indefinitely across the entire workout,
 * which would lead to unbounded drift.
 * Instead, we compute an IMU-derived RELATIVE CONCENTRIC VELOCITY PROXY
 * integrated strictly within the short bounded concentric window:
 * 
 * v_proxy = w_rot * (angularSweep / concentricDuration) + w_acc * (integratedBoundedLinAcc / concentricDuration)
 * 
 * Normalized against calibrated baseline (dimensionless velocity ratio: 1.00x = 100% of baseline).
 */
export class VelocityEstimator {
  /**
   * Estimate the relative concentric velocity for a repetition.
   * @param {Array} concentricSamples - Samples strictly within the concentric phase
   * @param {number} concentricDurationMs - Duration of concentric phase in ms
   * @param {number} movementAmplitude - Estimated movement amplitude
   * @returns {number} estimatedConcentricVelocity (arbitrary raw proxy units)
   */
  static estimate(concentricSamples, concentricDurationMs, movementAmplitude) {
    if (!concentricSamples || concentricSamples.length < 2 || concentricDurationMs <= 0) {
      return 0;
    }

    const durationSec = concentricDurationMs / 1000.0;
    const config = BicepCurlConfig.velocity;

    // 1. Trapezoidal integration of linear dynamic acceleration over concentric window
    let linAccIntegral = 0;
    let angularSweepIntegral = 0;

    for (let i = 1; i < concentricSamples.length; i++) {
      const prev = concentricSamples[i - 1];
      const curr = concentricSamples[i];
      const dt = curr.dt || ((curr.timestamp - prev.timestamp) / 1000.0) || 0.02;

      // Integrate dynamic linear acceleration magnitude
      const avgLinAcc = (prev.linAccMagnitude + curr.linAccMagnitude) * 0.5;
      linAccIntegral += avgLinAcc * dt;

      // Integrate angular velocity magnitude (total angular displacement in degrees)
      const avgGyro = (prev.gyroMagnitude + curr.gyroMagnitude) * 0.5;
      angularSweepIntegral += avgGyro * dt;
    }

    // Mean dynamic speed proxies during the concentric window
    const linearSpeedProxy = linAccIntegral / Math.max(0.2, durationSec);
    const angularSpeedProxy = (angularSweepIntegral / Math.max(0.2, durationSec)) / 50.0; // Scaled to similar magnitude

    // Weighted combination proxy
    const rawProxy = (config.rotationalWeight * angularSpeedProxy) + (config.linearAccWeight * linearSpeedProxy);

    // Safeguard against invalid values
    if (isNaN(rawProxy) || !isFinite(rawProxy) || rawProxy <= 0) {
      return 0.01;
    }

    return mathUtils.round(rawProxy, 3);
  }

  /**
   * Compute normalized velocity and velocity loss percentage
   * @param {number} currentVelocity - Raw estimated velocity
   * @param {number} baselineVelocity - Calibrated baseline raw velocity
   */
  static computeVelocityLoss(currentVelocity, baselineVelocity) {
    if (!baselineVelocity || baselineVelocity <= 0 || isNaN(baselineVelocity)) {
      return {
        normalizedConcentricVelocity: 1.0,
        velocityLossPercent: 0,
        lossBand: 'LOW MOVEMENT LOSS'
      };
    }

    // Normalized ratio (1.00x = 100% of baseline)
    const normalized = mathUtils.round(currentVelocity / baselineVelocity, 2);

    // Velocity Loss (%) = ((baseline - current) / baseline) * 100
    let lossPercent = ((baselineVelocity - currentVelocity) / baselineVelocity) * 100.0;

    // Guard against negative loss (e.g. rep was faster than baseline => 0% loss)
    // and protect against NaN / Infinity
    if (isNaN(lossPercent) || !isFinite(lossPercent)) {
      lossPercent = 0;
    }
    lossPercent = mathUtils.clamp(lossPercent, 0, 100);
    lossPercent = mathUtils.round(lossPercent, 1);

    // Interpret band
    let lossBand = 'LOW MOVEMENT LOSS';
    if (lossPercent > 30) {
      lossBand = 'VERY HIGH';
    } else if (lossPercent > 20) {
      lossBand = 'HIGH';
    } else if (lossPercent > 10) {
      lossBand = 'MODERATE';
    } else if (lossPercent > 5) {
      lossBand = 'MILD';
    }

    return {
      normalizedConcentricVelocity: normalized,
      velocityLossPercent: lossPercent,
      lossBand
    };
  }
}
