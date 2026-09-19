import { mathUtils } from '../utils/math';

// Lightweight, timestamp-driven filtering. Acceleration values remain relative
// because the watch orientation changes throughout a curl.
export class SignalProcessor {
  constructor() {
    this.reset();
  }

  reset() {
    this.previousTimestamp = 0;
    this.filteredAccMagnitude = 0;
    this.filteredGyroMagnitude = 0;
    this.gravityMagnitude = 0;
    this.linearAcceleration = 0;
    this.noiseEstimate = 0;
    this.filteredOrientationAngle = 0;
    this.initialized = false;
    this.bottomReference = null;
  }

  setBottomReference(vector) {
    if (vector && mathUtils.isFiniteNumber(vector.x) && mathUtils.isFiniteNumber(vector.y) && mathUtils.isFiniteNumber(vector.z)) {
      this.bottomReference = { x: vector.x, y: vector.y, z: vector.z };
    }
  }

  process(sample) {
    if (!sample || !mathUtils.isFiniteNumber(sample.timestamp) ||
      !mathUtils.isFiniteNumber(sample.ax) || !mathUtils.isFiniteNumber(sample.ay) ||
      !mathUtils.isFiniteNumber(sample.az) || !mathUtils.isFiniteNumber(sample.gx) ||
      !mathUtils.isFiniteNumber(sample.gy) || !mathUtils.isFiniteNumber(sample.gz)) {
      return null;
    }

    let dtMs = this.previousTimestamp ? sample.timestamp - this.previousTimestamp : 0;
    this.previousTimestamp = sample.timestamp;
    if (!mathUtils.isFiniteNumber(dtMs) || dtMs <= 0 || dtMs > 1000) dtMs = 0;

    const accMagnitude = mathUtils.magnitude(sample.ax, sample.ay, sample.az);
    const gyroMagnitude = mathUtils.magnitude(sample.gx, sample.gy, sample.gz);
    if (!this.initialized) {
      this.filteredAccMagnitude = accMagnitude;
      this.filteredGyroMagnitude = gyroMagnitude;
      this.gravityMagnitude = accMagnitude;
      this.initialized = true;
    }

    // Coefficients are expressed as time constants, making them independent of
    // the device callback rate.
    const dtSeconds = dtMs / 1000;
    const fastAlpha = dtMs ? dtSeconds / (0.08 + dtSeconds) : 0;
    const gravityAlpha = dtMs ? dtSeconds / (0.75 + dtSeconds) : 0;
    const noiseAlpha = dtMs ? dtSeconds / (1.5 + dtSeconds) : 0;
    this.filteredAccMagnitude += fastAlpha * (accMagnitude - this.filteredAccMagnitude);
    this.filteredGyroMagnitude += fastAlpha * (gyroMagnitude - this.filteredGyroMagnitude);
    this.gravityMagnitude += gravityAlpha * (accMagnitude - this.gravityMagnitude);
    this.linearAcceleration = this.filteredAccMagnitude - this.gravityMagnitude;
    this.noiseEstimate += noiseAlpha * (Math.abs(this.linearAcceleration) - this.noiseEstimate);

    const orientationAngle = this.bottomReference ? mathUtils.angleBetweenVectors(this.bottomReference, { x: sample.ax, y: sample.ay, z: sample.az }) : 0;
    const orientationAlpha = dtMs ? dtSeconds / (0.12 + dtSeconds) : 0;
    this.filteredOrientationAngle += orientationAlpha * (orientationAngle - this.filteredOrientationAngle);

    return {
      timestamp: sample.timestamp,
      dtMs,
      accMagnitude,
      gyroMagnitude,
      filteredAcceleration: this.filteredAccMagnitude,
      filteredGyro: this.filteredGyroMagnitude,
      linearAcceleration: this.linearAcceleration,
      noiseEstimate: this.noiseEstimate,
      accelerationVector: { x: sample.ax, y: sample.ay, z: sample.az },
      orientationAngle,
      filteredOrientationAngle: this.filteredOrientationAngle,
      // The largest signed gyro component gives a stable, orientation-specific
      // direction proxy which calibration validates before use.
      dominantGyro: this.getDominantGyro(sample)
    };
  }

  getDominantGyro(sample) {
    const values = [sample.gx, sample.gy, sample.gz];
    let dominant = values[0];
    for (let i = 1; i < values.length; i += 1) {
      if (Math.abs(values[i]) > Math.abs(dominant)) dominant = values[i];
    }
    return dominant;
  }
}
