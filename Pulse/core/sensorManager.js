import { Accelerometer, Gyroscope } from '@zos/sensor';

/**
 * SensorManager - Phase 1 Foundation Extended for Phase 2 Real-Time Kinematics
 * 
 * Supports both:
 * 1. Stream mode: Real-time callback invocation on each tick (for rep detector and calibration)
 * 2. Record mode: In-memory logging for saving to disk (Phase 1 legacy support)
 */
export class SensorManager {
  constructor() {
    this.acc = null;
    this.gyro = null;
    this.recording = false;
    this.streaming = false;
    this.data = [];
    this.lastSampleTime = 0;
    
    this.minInterval = Infinity;
    this.maxInterval = 0;
    
    this.onUpdateCallback = null;
    this.onStreamCallback = null;
  }
  
  start(onUpdate) {
    this.onUpdateCallback = onUpdate;
    
    try {
      this.acc = new Accelerometer();
    } catch(e) {
      this.acc = null;
    }
    
    try {
      this.gyro = new Gyroscope();
    } catch(e) {
      this.gyro = null;
    }
    
    if (!this.acc && !this.gyro) {
      return { error: 'Required motion sensors unavailable.' };
    }
    if (!this.acc) {
      return { error: 'Accelerometer unavailable.' };
    }
    if (!this.gyro) {
      return { error: 'Gyroscope unavailable.' };
    }
    
    // Drive sampling using Accelerometer onChange
    this.acc.onChange(() => {
      this.handleSensorUpdate();
    });
    
    this.acc.start();
    this.gyro.start();
    this.streaming = true;
    
    return { error: null };
  }

  setStreamCallback(cb) {
    this.onStreamCallback = cb;
  }
  
  handleSensorUpdate() {
    if (!this.streaming && !this.recording) return;

    let accData = null;
    let gyroData = null;

    try {
      accData = this.acc ? this.acc.getCurrent() : null;
      gyroData = this.gyro ? this.gyro.getCurrent() : null;
    } catch (e) {
      return;
    }

    if (!accData || !gyroData) return;
    
    const now = Date.now();
    
    if (this.lastSampleTime > 0) {
      const interval = now - this.lastSampleTime;
      if (interval < this.minInterval) this.minInterval = interval;
      if (interval > this.maxInterval) this.maxInterval = interval;
    }
    this.lastSampleTime = now;
    
    // In Zepp OS 3.0, sensor values might be integer centi-units (e.g. x/100) or standard m/s^2.
    // If raw value is > 50, scale down by 100 to normalize to standard SI units (m/s^2, deg/s)
    let rawAx = accData.x || 0;
    let rawAy = accData.y || 0;
    let rawAz = accData.z || 0;
    let rawGx = gyroData.x || 0;
    let rawGy = gyroData.y || 0;
    let rawGz = gyroData.z || 0;

    if (Math.abs(rawAx) > 50 || Math.abs(rawAy) > 50 || Math.abs(rawAz) > 50) {
      rawAx = rawAx / 100.0;
      rawAy = rawAy / 100.0;
      rawAz = rawAz / 100.0;
    }

    if (Math.abs(rawGx) > 360 || Math.abs(rawGy) > 360 || Math.abs(rawGz) > 360) {
      rawGx = rawGx / 100.0;
      rawGy = rawGy / 100.0;
      rawGz = rawGz / 100.0;
    }

    const sample = {
      timestamp: now,
      ax: rawAx,
      ay: rawAy,
      az: rawAz,
      gx: rawGx,
      gy: rawGy,
      gz: rawGz
    };
    
    // Pass to streaming consumer (Phase 2 real-time pipeline)
    if (this.onStreamCallback) {
      this.onStreamCallback(sample);
    }

    // Pass to recording consumer (Phase 1 legacy logger)
    if (this.recording) {
      this.data.push(sample);
      // Cap in-memory log buffer to 2000 samples to prevent memory exhaustion on watch
      if (this.data.length > 2000) {
        this.data.shift();
      }
    }
    
    if (this.onUpdateCallback) {
      this.onUpdateCallback(sample, this.getStats());
    }
  }
  
  startRecording() {
    this.recording = true;
    this.data = [];
    this.lastSampleTime = 0;
    this.minInterval = Infinity;
    this.maxInterval = 0;
  }
  
  stopRecording() {
    this.recording = false;
  }
  
  clearData() {
    this.data = [];
    this.lastSampleTime = 0;
    this.minInterval = Infinity;
    this.maxInterval = 0;
  }
  
  getStats() {
    const numSamples = this.data.length;
    let avgInterval = 0;
    let avgFreq = 0;
    if (numSamples > 1) {
      const totalTime = this.data[numSamples - 1].timestamp - this.data[0].timestamp;
      avgInterval = totalTime / (numSamples - 1);
      if (avgInterval > 0) avgFreq = 1000 / avgInterval;
    }
    return {
      numSamples,
      minInterval: this.minInterval === Infinity ? 0 : this.minInterval,
      maxInterval: this.maxInterval,
      avgInterval,
      avgFreq
    };
  }
  
  getData() {
    return this.data;
  }
  
  stop() {
    this.streaming = false;
    this.recording = false;
    if (this.acc) {
      try { this.acc.stop(); } catch(e) {}
    }
    if (this.gyro) {
      try { this.gyro.stop(); } catch(e) {}
    }
  }
}
