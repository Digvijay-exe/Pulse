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
    this.onSampleCallback = null;
    this.accChangeHandler = null;
    this.maxSamples = 0;
    this.storeSamples = true;
    this.sampleCount = 0;
    this.firstRecordedTimestamp = 0;
  }
  
  start(onUpdate, onSample) {
    this.onUpdateCallback = onUpdate;
    this.onSampleCallback = onSample || null;
    
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
    this.accChangeHandler = () => {
      this.handleSensorUpdate();
    };
    this.acc.onChange(this.accChangeHandler);
    
    this.acc.start();
    this.gyro.start();
    
    return { error: null };
  }
  
  handleSensorUpdate() {
    if (!this.recording) return;
    if (!this.acc || !this.gyro) return;
    let accData;
    let gyroData;
    try {
      accData = this.acc.getCurrent();
      gyroData = this.gyro.getCurrent();
    } catch (e) {
      console.log('Unable to read motion sensors:', e);
      return;
    }
    
    const now = Date.now();
    
    if (this.lastSampleTime > 0) {
       const interval = now - this.lastSampleTime;
       if (interval < this.minInterval) this.minInterval = interval;
       if (interval > this.maxInterval) this.maxInterval = interval;
    }
    this.lastSampleTime = now;
    
    if (!accData || !gyroData) return;
    const sample = {
      timestamp: now,
      ax: accData.x,
      ay: accData.y,
      az: accData.z,
      gx: gyroData.x,
      gy: gyroData.y,
      gz: gyroData.z
    };
    
    if (![sample.ax, sample.ay, sample.az, sample.gx, sample.gy, sample.gz].every((value) =>
      typeof value === 'number' && isFinite(value))) return;

    this.sampleCount += 1;
    if (!this.firstRecordedTimestamp) this.firstRecordedTimestamp = sample.timestamp;
    if (this.storeSamples && (!this.maxSamples || this.data.length < this.maxSamples)) this.data.push(sample);
    
    if (this.onUpdateCallback) {
      this.onUpdateCallback(sample, this.getStats());
    }
    if (this.onSampleCallback) this.onSampleCallback(sample);
  }
  
  startRecording(options) {
     this.recording = true;
     this.data = [];
     this.maxSamples = options && typeof options.maxSamples === 'number' ? options.maxSamples : 0;
     this.storeSamples = !options || options.storeSamples !== false;
     this.sampleCount = 0;
     this.firstRecordedTimestamp = 0;
     this.lastSampleTime = 0;
     this.minInterval = Infinity;
     this.maxInterval = 0;
  }
  
  stopRecording() {
     this.recording = false;
  }
  
  clearData() {
     this.data = [];
     this.maxSamples = 0;
     this.storeSamples = true;
     this.sampleCount = 0;
     this.firstRecordedTimestamp = 0;
     this.lastSampleTime = 0;
     this.minInterval = Infinity;
     this.maxInterval = 0;
  }
  
  getStats() {
     const numSamples = this.sampleCount;
     let avgInterval = 0;
     let avgFreq = 0;
     if (numSamples > 1 && this.firstRecordedTimestamp) {
        const totalTime = this.lastSampleTime - this.firstRecordedTimestamp;
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
     this.recording = false;
     if (this.acc && this.accChangeHandler) this.acc.offChange(this.accChangeHandler);
     if (this.acc) this.acc.stop();
     if (this.gyro) this.gyro.stop();
     this.accChangeHandler = null;
     this.onUpdateCallback = null;
     this.onSampleCallback = null;
  }
}
