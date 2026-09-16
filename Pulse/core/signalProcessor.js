import { mathUtils } from '../utils/math';

/**
 * Lightweight, zero-allocation-per-tick Signal Processor for Zepp OS
 * Includes:
 * - Real timestamp delta (dt) processing
 * - Gravity compensation via low-pass tracking (alpha filter)
 * - Exponential smoothing for high-frequency vibration rejection
 * - Dynamic magnitude calculation
 */
export class SignalProcessor {
  constructor(alpha = 0.85, smoothing = 0.35) {
    this.alpha = alpha;         // Low-pass gravity tracking coefficient
    this.smoothing = smoothing; // High-frequency noise suppression

    this.reset();
  }

  reset() {
    this.gravX = 0;
    this.gravY = 0;
    this.gravZ = 9.81; // Initial earth gravity seed
    this.isInitialized = false;

    this.smoothAx = 0;
    this.smoothAy = 0;
    this.smoothAz = 0;
    this.smoothGx = 0;
    this.smoothGy = 0;
    this.smoothGz = 0;

    this.lastTimestamp = 0;
  }

  /**
   * Process an incoming raw sample with real timestamps.
   * Mutates or returns a lightweight processed frame without creating deep object trees.
   */
  process(rawSample) {
    const t = rawSample.timestamp || Date.now();
    let dt = 0.02; // Fallback ~50Hz (20ms)

    if (this.lastTimestamp > 0) {
      const diffMs = t - this.lastTimestamp;
      if (diffMs > 0 && diffMs < 500) {
        dt = diffMs / 1000.0;
      }
    }
    this.lastTimestamp = t;

    const ax = rawSample.ax;
    const ay = rawSample.ay;
    const az = rawSample.az;
    const gx = rawSample.gx;
    const gy = rawSample.gy;
    const gz = rawSample.gz;

    if (!this.isInitialized) {
      this.gravX = ax;
      this.gravY = ay;
      this.gravZ = az;
      this.smoothAx = ax;
      this.smoothAy = ay;
      this.smoothAz = az;
      this.smoothGx = gx;
      this.smoothGy = gy;
      this.smoothGz = gz;
      this.isInitialized = true;
    } else {
      // Exponential moving average for noise
      this.smoothAx = this.smoothAx + this.smoothing * (ax - this.smoothAx);
      this.smoothAy = this.smoothAy + this.smoothing * (ay - this.smoothAy);
      this.smoothAz = this.smoothAz + this.smoothing * (az - this.smoothAz);

      this.smoothGx = this.smoothGx + this.smoothing * (gx - this.smoothGx);
      this.smoothGy = this.smoothGy + this.smoothing * (gy - this.smoothGy);
      this.smoothGz = this.smoothGz + this.smoothing * (gz - this.smoothGz);

      // Low-pass filter to estimate gravitational vector
      this.gravX = this.alpha * this.gravX + (1 - this.alpha) * this.smoothAx;
      this.gravY = this.alpha * this.gravY + (1 - this.alpha) * this.smoothAy;
      this.gravZ = this.alpha * this.gravZ + (1 - this.alpha) * this.smoothAz;
    }

    // Dynamic (linear) acceleration = Total - Gravity
    const linAx = this.smoothAx - this.gravX;
    const linAy = this.smoothAy - this.gravY;
    const linAz = this.smoothAz - this.gravZ;

    const accMagnitude = mathUtils.magnitude(this.smoothAx, this.smoothAy, this.smoothAz);
    const linAccMagnitude = mathUtils.magnitude(linAx, linAy, linAz);
    const gyroMagnitude = mathUtils.magnitude(this.smoothGx, this.smoothGy, this.smoothGz);

    return {
      timestamp: t,
      dt,
      ax: this.smoothAx,
      ay: this.smoothAy,
      az: this.smoothAz,
      linAx,
      linAy,
      linAz,
      linAccMagnitude,
      accMagnitude,
      gx: this.smoothGx,
      gy: this.smoothGy,
      gz: this.smoothGz,
      gyroMagnitude
    };
  }
}
