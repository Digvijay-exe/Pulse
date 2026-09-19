import { Accelerometer, Gyroscope } from '@zos/sensor';

export class SensorManager {
  constructor() {
    this.acc = null;
    this.gyro = null;
    this.recording = false;
    this.data = [];
    this.lastSampleTime = 0;
    
    this.minInterval = Infinity;
    this.maxInterval = 0;
    
    this.onUpdateCallback = null;
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
    
    return { error: null };
  }
  
  handleSensorUpdate() {
    if (!this.recording) return;
    
    const accData = this.acc.getCurrent();
    const gyroData = this.gyro.getCurrent();
    
    const now = Date.now();
    
    if (this.lastSampleTime > 0) {
       const interval = now - this.lastSampleTime;
       if (interval < this.minInterval) this.minInterval = interval;
       if (interval > this.maxInterval) this.maxInterval = interval;
    }
    this.lastSampleTime = now;
    
    const sample = {
      timestamp: now,
      ax: accData.x,
      ay: accData.y,
      az: accData.z,
      gx: gyroData.x,
      gy: gyroData.y,
      gz: gyroData.z
    };
    
    this.data.push(sample);
    
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
     if (this.acc) this.acc.stop();
     if (this.gyro) this.gyro.stop();
  }
}
