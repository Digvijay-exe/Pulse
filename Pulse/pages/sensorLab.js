import { createWidget, widget, prop, align } from '@zos/ui';
import { setPageBrightTime, resetPageBrightTime, pausePalmScreenOff, resetPalmScreenOff, pauseDropWristScreenOff, resetDropWristScreenOff } from '@zos/display';
import { Vibrator, VIBRATOR_SCENE_DURATION_LONG, VIBRATOR_SCENE_SHORT_STRONG } from '@zos/sensor';
import { SensorManager } from '../core/sensorManager';
import { SignalProcessor } from '../core/signalProcessor';
import { RepDetector } from '../core/repDetector';
import { PhaseDetector } from '../core/phaseDetector';
import { VelocityEstimator } from '../core/velocityEstimator';
import { FatigueEngine } from '../core/fatigueEngine';
import { BicepCurl } from '../exercises/bicepCurl';
import { WorkoutStorage } from '../storage/workoutStorage';
import { CONSTANTS } from '../utils/constants';
import { mathUtils } from '../utils/math';

Page({
  build() {
    this.mode = 'home'; this.workoutState = 'IDLE'; this.lastUiUpdate = 0; this.calibrationCandidates = [];
    this.calibration = null; this.bottomGravity = null; this.setReps = []; this.debugSamples = []; this.countdownTimer = null; this.alertTimer = null;
    this.alertTriggered = false; this.stopRecommended = false; this.alertPulseCount = 0;
    this.processor = new SignalProcessor(); this.repDetector = new RepDetector();
    try { this.vibrator = new Vibrator(); } catch (error) { this.vibrator = null; console.log('Vibration unavailable:', error); }
    this.createUi();
    try {
      this.sensorManager = new SensorManager();
      const result = this.sensorManager.start((sample, stats) => this.updateSensorUi(sample, stats),
        (sample) => this.safeProcessWorkoutSample(sample));
      if (result && result.error) this.setStatus(result.error);
    } catch (error) {
      console.log('Pulse startup failure:', error);
      this.setStatus('Startup error. Check Zepp Developer Mode logs.');
    }
  },

  createUi() {
    this.titleText = createWidget(widget.TEXT, { x: 0, y: 20, w: 360, h: 32, color: 0xffffff, text_size: 22, align_h: align.CENTER_H, text: 'PULSE SENSOR LAB' });
    this.primaryText = createWidget(widget.TEXT, { x: 15, y: 58, w: 330, h: 28, color: 0x4CAF50, text_size: 16, align_h: align.CENTER_H, text: 'Choose a mode' });
    this.secondaryText = createWidget(widget.TEXT, { x: 15, y: 88, w: 330, h: 28, color: 0x03A9F4, text_size: 15, align_h: align.CENTER_H, text: 'Sensor Lab preserves raw capture' });
    this.metricText = createWidget(widget.TEXT, { x: 15, y: 120, w: 330, h: 42, color: 0xFFC107, text_size: 15, align_h: align.CENTER_H, text: 'RATE: 0Hz | SAMPLES: 0' });
    this.actionButton = createWidget(widget.BUTTON, { x: 25, y: 185, w: 150, h: 42, text: 'SENSOR LAB', color: 0xffffff, normal_color: 0x333333, press_color: 0x555555, click_func: () => this.handleAction() });
    this.stopButton = createWidget(widget.BUTTON, { x: 185, y: 185, w: 150, h: 42, text: 'BICEP CURL', color: 0xffffff, normal_color: 0x333333, press_color: 0x555555, click_func: () => this.handleSecondary() });
    this.clearButton = createWidget(widget.BUTTON, { x: 105, y: 237, w: 150, h: 38, text: 'STOP / SAVE', color: 0xffffff, normal_color: 0x333333, press_color: 0x555555, click_func: () => this.stopAndSave() });
    this.statusText = createWidget(widget.TEXT, { x: 15, y: 285, w: 330, h: 62, color: 0xffaa00, text_size: 14, align_h: align.CENTER_H, text: 'Ready. No medical or absolute velocity claims.' });
  },

  handleAction() {
    if (this.mode === 'home') return this.enterSensorLab();
    if (this.mode === 'lab') return this.startSensorLabRecording();
    if (this.mode === 'bicep-ready' || this.mode === 'calibration-complete') return this.startSet();
    if (this.mode === 'set-complete') return this.enterBicepCurl();
  },
  handleSecondary() {
    if (this.mode === 'home' || this.mode === 'lab') return this.enterBicepCurl();
    if (this.mode === 'bicep-ready' || this.mode === 'calibration-complete') return this.enterHome();
    if (this.mode === 'set') return this.stopAndSave();
    this.enterHome();
  },
  setButtonText(button, text) {
    if (button) button.setProperty(prop.TEXT, text);
  },
  playStartSignal() {
    try {
      if (!this.vibrator) return;
      this.vibrator.start({ mode: VIBRATOR_SCENE_DURATION_LONG });
      console.log('Pulse long start vibration requested');
    } catch (error) {
      console.log('Start feedback unavailable:', error);
      try { this.vibrator.setMode({ mode: VIBRATOR_SCENE_DURATION_LONG }); this.vibrator.start(); } catch (fallbackError) { console.log('Start vibration fallback failed:', fallbackError); }
    }
  },
  playRepSignal() {
    try {
      if (!this.vibrator) return;
      this.vibrator.start({ mode: VIBRATOR_SCENE_SHORT_STRONG });
      console.log('Pulse short rep vibration requested');
    } catch (error) {
      console.log('Rep feedback unavailable:', error);
      try { this.vibrator.setMode({ mode: VIBRATOR_SCENE_SHORT_STRONG }); this.vibrator.start(); } catch (fallbackError) { console.log('Rep vibration fallback failed:', fallbackError); }
    }
  },
  clearCountdown() {
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    this.countdownTimer = null;
  },
  clearVelocityLossAlert() {
    if (this.alertTimer) clearTimeout(this.alertTimer);
    this.alertTimer = null; this.alertPulseCount = 0;
  },
  startVelocityLossAlert() {
    if (this.alertTriggered) return;
    this.alertTriggered = true; this.stopRecommended = true; this.workoutState = 'VELOCITY_LOSS_ALERT'; this.alertPulseCount = 0;
    this.titleText.setProperty(prop.MORE, { text: 'VELOCITY LOSS' });
    this.primaryText.setProperty(prop.MORE, { text: 'DETECTED' });
    this.secondaryText.setProperty(prop.MORE, { text: 'STOP SET' });
    this.setStatus('Slow valid lift detected. Stop is recommended.');
    this.runVelocityLossAlertPulse();
  },
  runVelocityLossAlertPulse() {
    // Three long scenes at 0, 2 and 4 seconds give a bounded alert of about
    // five seconds. The warning remains visible, but haptics never loop.
    if (!this.alertTriggered || this.alertPulseCount >= 3) return;
    this.alertPulseCount += 1;
    this.playStartSignal();
    if (this.alertPulseCount < 3) this.alertTimer = setTimeout(() => this.runVelocityLossAlertPulse(), 2000);
  },
  startCountdown(kind) {
    this.clearCountdown(); this.countdownSeconds = 5; this.updateCountdown(kind);
  },
  updateCountdown(kind) {
    if (this.countdownSeconds <= 0) {
      this.countdownTimer = null;
      if (kind === 'calibration') this.beginCalibrationCapture(); else this.beginSetTracking();
      return;
    }
    const label = kind === 'calibration' ? 'CALIBRATION' : 'SET';
    this.primaryText.setProperty(prop.MORE, { text: `${label} STARTS IN ${this.countdownSeconds}` });
    this.secondaryText.setProperty(prop.MORE, { text: 'Get into position and hold arm down' });
    this.setStatus(`Ready in ${this.countdownSeconds} seconds.`);
    this.countdownSeconds -= 1;
    this.countdownTimer = setTimeout(() => this.updateCountdown(kind), 1000);
  },
  keepScreenAwake(force) {
    const now = Date.now();
    // Reapply while samples are flowing. Some firmware builds reset a page's
    // display policy after wrist movement or an ambient-screen transition.
    if (!force && this.lastScreenKeepAlive && now - this.lastScreenKeepAlive < 15000) return;
    this.lastScreenKeepAlive = now;
    try {
      setPageBrightTime({ brightTime: 2147483000 });
      pausePalmScreenOff({ duration: 0 });
      pauseDropWristScreenOff({ duration: 0 });
    } catch (error) { console.log('Unable to keep screen awake:', error); }
  },
  releaseScreenAwake() {
    this.lastScreenKeepAlive = 0;
    try { resetPageBrightTime(); resetPalmScreenOff(); resetDropWristScreenOff(); } catch (error) { console.log('Unable to reset screen timer:', error); }
  },
  enterHome() {
    this.clearCountdown(); this.clearVelocityLossAlert(); this.mode = 'home'; this.workoutState = 'IDLE'; this.sensorManager.stopRecording(); this.releaseScreenAwake();
    this.titleText.setProperty(prop.MORE, { text: 'PULSE SENSOR LAB' }); this.primaryText.setProperty(prop.MORE, { text: 'Choose a mode' });
    this.secondaryText.setProperty(prop.MORE, { text: 'Sensor Lab preserves raw capture' }); this.setButtonText(this.actionButton, 'SENSOR LAB');
    this.setButtonText(this.stopButton, 'BICEP CURL'); this.setStatus('Ready. No medical or absolute velocity claims.');
  },
  enterSensorLab() {
    this.mode = 'lab'; this.titleText.setProperty(prop.MORE, { text: 'PULSE SENSOR LAB' });
    this.primaryText.setProperty(prop.MORE, { text: 'Live raw acceleration and gyro' }); this.secondaryText.setProperty(prop.MORE, { text: 'Use START then STOP / SAVE' });
    this.setButtonText(this.actionButton, 'START'); this.setButtonText(this.stopButton, 'BICEP CURL'); this.setStatus('Sensor Lab ready.');
  },
  enterBicepCurl() {
    this.clearVelocityLossAlert(); this.mode = 'bicep-ready'; this.workoutState = 'IDLE'; this.titleText.setProperty(prop.MORE, { text: 'BICEP CURL' });
    this.primaryText.setProperty(prop.MORE, { text: 'Automatic 3-rep calibration' });
    this.secondaryText.setProperty(prop.MORE, { text: 'Press START SET; hold arm down' });
    this.setButtonText(this.actionButton, 'START SET'); this.setButtonText(this.stopButton, 'HOME');
    this.setStatus('The first 3 valid reps establish the set baseline.');
  },
  startSensorLabRecording() { this.sensorManager.startRecording(); this.setStatus('Recording raw Sensor Lab data.'); },
  beginCalibrationCapture() {
    this.mode = 'calibration-bottom'; this.calibrationCandidates = []; this.bottomGravity = null; this.bottomSamples = []; this.bottomReferenceStartedAt = 0;
    this.processor.reset(); this.repDetector.reset(null); this.debugSamples = [];
    this.sensorManager.startRecording({ maxSamples: CONSTANTS.MAX_RAW_SAMPLES, storeSamples: false }); this.titleText.setProperty(prop.MORE, { text: 'CALIBRATING' });
    this.primaryText.setProperty(prop.MORE, { text: 'Hold arm down and still' }); this.secondaryText.setProperty(prop.MORE, { text: 'Capturing bottom position...' });
    this.setButtonText(this.actionButton, 'CALIBRATING'); this.setButtonText(this.stopButton, 'CANCEL'); this.setStatus('Hold still for one second.');
  },
  startSet() {
    this.clearVelocityLossAlert(); this.calibration = null; this.calibrationCandidates = []; this.setReps = [];
    this.alertTriggered = false; this.stopRecommended = false; this.workoutState = 'CALIBRATING';
    this.mode = 'set-countdown'; this.keepScreenAwake(true); this.titleText.setProperty(prop.MORE, { text: 'GET READY' });
    this.setButtonText(this.actionButton, 'WAIT'); this.setButtonText(this.stopButton, 'CANCEL'); this.startCountdown('set');
  },
  beginSetTracking() {
    this.mode = 'set-calibration-bottom'; this.bottomGravity = null; this.bottomSamples = []; this.bottomReferenceStartedAt = 0;
    this.debugSamples = []; this.processor.reset(); this.repDetector.reset(null); this.sensorManager.startRecording({ maxSamples: CONSTANTS.MAX_RAW_SAMPLES, storeSamples: false });
    this.titleText.setProperty(prop.MORE, { text: 'BICEP CURL' }); this.primaryText.setProperty(prop.MORE, { text: 'CALIBRATING' });
    this.secondaryText.setProperty(prop.MORE, { text: 'Hold arm down and still' }); this.setButtonText(this.actionButton, 'CALIBRATING');
    this.setButtonText(this.stopButton, 'STOP / SAVE'); this.playStartSignal(); this.setStatus('Capturing bottom position.');
  },

  safeProcessWorkoutSample(rawSample) {
    try {
      this.processWorkoutSample(rawSample);
    } catch (error) {
      console.log('Workout sample processing error:', error);
      this.setStatus('Processing error. Continue slowly; check Developer Mode logs.');
    }
  },
  processWorkoutSample(rawSample) {
    if (this.mode !== 'calibration-bottom' && this.mode !== 'calibrating' && this.mode !== 'set-calibration-bottom' && this.mode !== 'set-calibrating' && this.mode !== 'set') return;
    this.keepScreenAwake(false);
    const processed = this.processor.process(rawSample); if (!processed) return;
    if (this.mode === 'calibration-bottom' || this.mode === 'set-calibration-bottom') {
      if (!this.bottomReferenceStartedAt) this.bottomReferenceStartedAt = rawSample.timestamp;
      this.bottomSamples.push({ x: rawSample.ax, y: rawSample.ay, z: rawSample.az });
      if (rawSample.timestamp - this.bottomReferenceStartedAt >= CONSTANTS.BOTTOM_REFERENCE_DURATION_MS) {
        this.bottomGravity = mathUtils.averageVector(this.bottomSamples);
        if (!this.bottomGravity || !mathUtils.magnitude(this.bottomGravity.x, this.bottomGravity.y, this.bottomGravity.z)) {
          this.sensorManager.stopRecording(); this.mode = 'bicep-ready'; this.setStatus('Bottom calibration failed. Keep arm still and retry.'); return;
        }
        this.processor.setBottomReference(this.bottomGravity); this.repDetector.reset(null);
        this.mode = this.mode === 'set-calibration-bottom' ? 'set-calibrating' : 'calibrating';
        this.primaryText.setProperty(prop.MORE, { text: 'CALIBRATING 0/3' }); this.secondaryText.setProperty(prop.MORE, { text: 'Perform full controlled curls' }); this.setStatus('Bottom captured. First 3 valid reps establish baseline.');
      }
      return;
    }
    const rep = this.repDetector.process(processed);
    if (CONSTANTS.DEBUG_ENABLED && this.debugSamples.length < CONSTANTS.MAX_DEBUG_SAMPLES) this.debugSamples.push({ timestamp: processed.timestamp, sampleIntervalMs: processed.dtMs, rawAcceleration: { x: rawSample.ax, y: rawSample.ay, z: rawSample.az }, filteredAcceleration: processed.filteredAcceleration, accelerationMagnitude: processed.accMagnitude, gyroMagnitude: processed.gyroMagnitude, orientationAngle: processed.orientationAngle, filteredOrientationAngle: processed.filteredOrientationAngle, detectorState: this.repDetector.state });
    if (!rep) return;
    const phaseCalibration = this.calibration || { directionSign: rep.directionSign };
    rep.phase = PhaseDetector.segment(rep, phaseCalibration); if (!rep.phase) rep.valid = false;
    if (rep.phase) {
      rep.estimatedConcentricVelocity = VelocityEstimator.estimate(rep, rep.phase);
      rep.concentricStartTimestamp = rep.phase.concentricStartTimestamp; rep.concentricEndTimestamp = rep.phase.concentricEndTimestamp;
      rep.eccentricStartTimestamp = rep.phase.eccentricStartTimestamp; rep.eccentricEndTimestamp = rep.phase.eccentricEndTimestamp;
      rep.concentricDurationMs = rep.phase.concentricDurationMs; rep.eccentricDurationMs = rep.phase.eccentricDurationMs;
      rep.confidence = Math.round(rep.confidence * 0.8 + rep.phase.confidence * 0.2);
      if (rep.confidence < CONSTANTS.MIN_REP_CONFIDENCE || rep.estimatedConcentricVelocity <= 0) rep.valid = false;
    }
    if (this.mode === 'calibrating') this.acceptCalibrationRep(rep); else this.acceptSetRep(rep);
  },
  acceptCalibrationRep(rep) {
    if (rep.valid) this.calibrationCandidates.push(rep);
    this.setStatus(`${this.calibrationCandidates.length} valid calibration reps${rep.valid ? '' : ' (movement rejected)'}.`);
    if (this.calibrationCandidates.length < CONSTANTS.CALIBRATION_MIN_REPS) return;
    this.calibration = BicepCurl.createCalibration(this.calibrationCandidates, this.bottomGravity);
    if (!this.calibration) { this.setStatus('Calibration failed. Repeat controlled curls.'); return; }
    this.sensorManager.stopRecording(); this.releaseScreenAwake(); this.mode = 'calibration-complete'; this.titleText.setProperty(prop.MORE, { text: 'CALIBRATION COMPLETE' });
    this.primaryText.setProperty(prop.MORE, { text: `Baseline ${this.calibration.baselineVelocity.toFixed(2)}x proxy` }); this.secondaryText.setProperty(prop.MORE, { text: 'Press START SET for tracking' });
    this.setButtonText(this.actionButton, 'CALIBRATE'); this.setButtonText(this.stopButton, 'START SET'); this.setStatus('Calibration is session-specific and ready.');
  },
  acceptSetRep(rep) {
    rep.repNumber = this.setReps.length + 1;
    if (this.workoutState === 'CALIBRATING') {
      rep.calibrationRep = true;
      if (rep.valid) this.calibrationCandidates.push(rep);
      const validCalibrationReps = this.calibrationCandidates.length;
      // Calibration needs the full phase/sample record until its baseline is
      // calculated; the stored set record must remain small for the watch.
      const storedRep = Object.assign({}, rep);
      delete storedRep.samples; delete storedRep.phase; this.setReps.push(storedRep);
      if (rep.valid) this.playRepSignal();
      this.primaryText.setProperty(prop.MORE, { text: `CALIBRATING ${validCalibrationReps}/3` });
      this.secondaryText.setProperty(prop.MORE, { text: rep.valid ? `Valid rep ${validCalibrationReps}/3` : 'Rejected movement: repeat rep' });
      this.setStatus(`Rep ${rep.repNumber}: ${rep.valid ? 'valid calibration rep' : 'rejected'}; ${validCalibrationReps}/3 valid.`);
      if (validCalibrationReps < CONSTANTS.CALIBRATION_MIN_REPS) return;
      this.calibration = BicepCurl.createCalibration(this.calibrationCandidates, this.bottomGravity);
      if (!this.calibration) { this.workoutState = 'CALIBRATING'; this.setStatus('Baseline failed. Continue controlled valid reps.'); return; }
      this.workoutState = 'TRACKING';
      this.repDetector.reset(this.calibration);
      this.primaryText.setProperty(prop.MORE, { text: 'BASELINE ESTABLISHED' });
      this.secondaryText.setProperty(prop.MORE, { text: `Rep 4+ tracking | ${this.calibration.baselineVelocity.toFixed(2)}x` });
      this.setStatus('Tracking enabled. Velocity-loss alerts now apply to valid reps.');
      return;
    }
    rep.baselineVelocity = this.calibration ? this.calibration.baselineVelocity : 0;
    Object.assign(rep, FatigueEngine.evaluate(rep, this.calibration)); delete rep.samples; delete rep.phase; this.setReps.push(rep);
    const valid = this.setReps.filter((entry) => entry.valid).length;
    if (rep.valid) this.playRepSignal();
    if (rep.valid && rep.phoneStyleSlowRep && !this.alertTriggered) this.startVelocityLossAlert();
    if (this.workoutState !== 'VELOCITY_LOSS_ALERT') {
      this.primaryText.setProperty(prop.MORE, { text: `TRACKING | REP ${rep.repNumber}` });
      this.secondaryText.setProperty(prop.MORE, { text: `${rep.normalizedConcentricVelocity.toFixed(2)}x | loss ${rep.velocityLossPercent.toFixed(1)}%` });
      this.setStatus(`Rep ${rep.repNumber}: ${rep.valid ? 'valid' : 'rejected'} | valid ${valid}.`);
    }
  },
  stopAndSave() {
    if (this.mode === 'lab') { this.sensorManager.stopRecording(); const data = this.sensorManager.getData(); this.setStatus(data.length && WorkoutStorage.saveData(data) ? 'Saved Sensor Lab data.' : 'No Sensor Lab data saved.'); return; }
    if (this.mode === 'calibration-countdown' || this.mode === 'set-countdown' || this.mode === 'calibration-bottom' || this.mode === 'calibrating' || this.mode === 'set-calibration-bottom' || this.mode === 'set-calibrating') { this.clearCountdown(); this.sensorManager.stopRecording(); this.releaseScreenAwake(); this.enterBicepCurl(); return; }
    if (this.mode === 'set') {
      this.sensorManager.stopRecording(); this.clearVelocityLossAlert(); const baseline = this.calibration ? this.calibration.baselineVelocity : 0; const metrics = FatigueEngine.summarize(this.setReps, baseline);
      const finalTrackedRep = this.setReps.filter((rep) => rep.valid && !rep.calibrationRep).pop();
      const workout = { schemaVersion: CONSTANTS.STORAGE_SCHEMA_VERSION, exercise: 'bicepCurl', createdAt: Date.now(), calibration: this.calibration, calibrationReps: this.calibrationCandidates.length, alertTriggered: this.alertTriggered, reps: this.setReps, metrics, debug: CONSTANTS.DEBUG_ENABLED ? this.debugSamples : undefined };
      const saved = WorkoutStorage.saveWorkout(workout); this.releaseScreenAwake(); this.mode = 'set-complete'; this.workoutState = 'SET_RESULTS'; this.titleText.setProperty(prop.MORE, { text: 'SET COMPLETE' });
      this.primaryText.setProperty(prop.MORE, { text: `VALID ${metrics.validReps} | BASE ${metrics.baselineVelocity.toFixed(2)}x` });
      this.secondaryText.setProperty(prop.MORE, { text: `FINAL ${finalTrackedRep ? finalTrackedRep.normalizedConcentricVelocity.toFixed(2) : 'n/a'}x | LOSS ${finalTrackedRep ? finalTrackedRep.velocityLossPercent.toFixed(1) : 'n/a'}%` });
      this.setButtonText(this.actionButton, 'BICEP CURL'); this.setButtonText(this.stopButton, 'HOME'); this.setStatus(saved ? `ALERT ${this.alertTriggered ? 'TRIGGERED' : 'NOT TRIGGERED'} | Kinematic fatigue: ${metrics.fatigueLevel}.` : 'Set ended but storage failed.'); return;
    }
    this.enterHome();
  },
  updateSensorUi(sample, stats) {
    const now = Date.now(); if (now - this.lastUiUpdate < CONSTANTS.UI_UPDATE_INTERVAL_MS) return; this.lastUiUpdate = now;
    if (this.mode === 'lab' && sample) { this.primaryText.setProperty(prop.MORE, { text: `ACC ${sample.ax.toFixed(1)} ${sample.ay.toFixed(1)} ${sample.az.toFixed(1)}` }); this.secondaryText.setProperty(prop.MORE, { text: `GYR ${sample.gx.toFixed(1)} ${sample.gy.toFixed(1)} ${sample.gz.toFixed(1)}` }); }
    this.metricText.setProperty(prop.MORE, { text: `RATE: ${stats.avgFreq.toFixed(1)}Hz | SAMPLES: ${stats.numSamples}` });
  },
  setStatus(text) { if (this.statusText) this.statusText.setProperty(prop.MORE, { text }); },
  onDestroy() { this.clearCountdown(); this.clearVelocityLossAlert(); this.releaseScreenAwake(); if (this.sensorManager) this.sensorManager.stop(); }
});
