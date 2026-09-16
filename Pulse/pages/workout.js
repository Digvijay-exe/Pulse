import { createWidget, widget, prop, align } from '@zos/ui';
import { push, back } from '@zos/router';
import { SensorManager } from '../core/sensorManager';
import { SignalProcessor } from '../core/signalProcessor';
import { RepDetector } from '../core/repDetector';
import { FatigueEngine } from '../core/fatigueEngine';
import { WorkoutStorage } from '../storage/workoutStorage';
import { CONSTANTS } from '../utils/constants';

Page({
  build() {
    this.sensorManager = new SensorManager();
    this.processor = new SignalProcessor();
    this.baseline = WorkoutStorage.getBaseline() || {
      baselineConcentricVelocity: 1.0,
      concentricDurationMedian: 1200
    };

    this.detector = new RepDetector(this.baseline);
    this.reps = [];
    this.setStartTime = Date.now();
    this.isWorkoutActive = false;
    this.latestFatigue = null;

    // View Mode: 'LIVE' or 'FATIGUE'
    this.currentViewMode = 'LIVE';

    // 1. Top Exercise Header
    createWidget(widget.TEXT, {
      x: 0,
      y: 22,
      w: CONSTANTS.SCREEN_WIDTH,
      h: 24,
      color: CONSTANTS.COLORS.PRIMARY,
      text_size: 16,
      align_h: align.CENTER_H,
      text: 'BICEP CURL'
    });

    // 2. Rep Counter Display (Prominent on Round Screen)
    this.repNumberWidget = createWidget(widget.TEXT, {
      x: 30,
      y: 48,
      w: 300,
      h: 46,
      color: CONSTANTS.COLORS.TEXT_WHITE,
      text_size: 38,
      align_h: align.CENTER_H,
      text: 'REP 00'
    });

    // 3. Primary Metrics Grid (EST VEL & VEL LOSS)
    this.metricVelWidget = createWidget(widget.TEXT, {
      x: 20,
      y: 100,
      w: 155,
      h: 48,
      color: CONSTANTS.COLORS.ACCENT_CYAN,
      text_size: 15,
      align_h: align.CENTER_H,
      text: 'EST VEL\n1.00x'
    });

    this.metricLossWidget = createWidget(widget.TEXT, {
      x: 185,
      y: 100,
      w: 155,
      h: 48,
      color: CONSTANTS.COLORS.PRIMARY,
      text_size: 15,
      align_h: align.CENTER_H,
      text: 'LOSS\n0%'
    });

    // 4. Secondary Row (CONFIDENCE & KINEMATIC FATIGUE)
    this.metricConfWidget = createWidget(widget.TEXT, {
      x: 20,
      y: 156,
      w: 155,
      h: 40,
      color: CONSTANTS.COLORS.TEXT_MUTED,
      text_size: 13,
      align_h: align.CENTER_H,
      text: 'CONF\n100%'
    });

    this.metricFatigueWidget = createWidget(widget.TEXT, {
      x: 185,
      y: 156,
      w: 155,
      h: 40,
      color: CONSTANTS.COLORS.PRIMARY,
      text_size: 13,
      align_h: align.CENTER_H,
      text: 'KINEMATIC\nLOW'
    });

    // 5. Live State / Cadence Guidance Bar
    this.statusWidget = createWidget(widget.TEXT, {
      x: 20,
      y: 202,
      w: 320,
      h: 24,
      color: CONSTANTS.COLORS.TEXT_WHITE,
      text_size: 13,
      align_h: align.CENTER_H,
      text: 'Ready. Begin lifting...'
    });

    // 6. Action Controls: END SET & VIEW FATIGUE
    this.btnEndSet = createWidget(widget.BUTTON, {
      x: 50,
      y: 236,
      w: 170,
      h: 44,
      text: 'END SET',
      color: 0xffffff,
      normal_color: CONSTANTS.COLORS.ACCENT_RED,
      press_color: 0xd50000,
      radius: 22,
      text_size: 15,
      click_func: () => {
        this.finishSet();
      }
    });

    this.btnToggleView = createWidget(widget.BUTTON, {
      x: 226,
      y: 236,
      w: 84,
      h: 44,
      text: 'INFO',
      color: CONSTANTS.COLORS.TEXT_WHITE,
      normal_color: 0x2c2c2c,
      press_color: 0x444444,
      radius: 22,
      text_size: 13,
      click_func: () => {
        this.toggleViewMode();
      }
    });

    // Exit Button
    createWidget(widget.BUTTON, {
      x: 90,
      y: 290,
      w: 180,
      h: 34,
      text: 'CANCEL / EXIT',
      color: CONSTANTS.COLORS.TEXT_MUTED,
      normal_color: 0x1a1a1a,
      press_color: 0x2d2d2d,
      radius: 17,
      text_size: 12,
      click_func: () => {
        this.cleanup();
        back();
      }
    });

    // Wire Real-Time Detector Callbacks
    this.detector.onRepValidated = (rep) => {
      this.handleRepValidated(rep);
    };

    this.detector.onRepRejected = (rep) => {
      this.statusWidget.setProperty(prop.MORE, {
        text: 'Movement unclear - rep not counted'
      });
    };

    this.detector.onStateChange = (state) => {
      if (state === CONSTANTS.STATE.MOVING) {
        this.statusWidget.setProperty(prop.MORE, { text: 'Concentric Flexion...' });
      } else if (state === CONSTANTS.STATE.RETURNING) {
        this.statusWidget.setProperty(prop.MORE, { text: 'Eccentric Lowering...' });
      }
    };

    this.startWorkout();
  }

  startWorkout() {
    this.isWorkoutActive = true;
    this.setStartTime = Date.now();
    this.detector.reset();
    this.processor.reset();

    this.sensorManager.setStreamCallback((rawSample) => {
      if (!this.isWorkoutActive) return;
      const processed = this.processor.process(rawSample);
      this.detector.processSample(processed);
    });

    this.sensorManager.start();
  }

  handleRepValidated(rep) {
    this.reps.push(rep);

    // Evaluate Kinematic Fatigue
    const fatigue = FatigueEngine.evaluate(rep.velocityLossPercent, rep.confidence, this.reps);
    this.latestFatigue = fatigue;

    // UI Updates throttled to rep events
    const repStr = rep.repNumber < 10 ? `REP 0${rep.repNumber}` : `REP ${rep.repNumber}`;
    this.repNumberWidget.setProperty(prop.MORE, { text: repStr });

    // EST VEL
    this.metricVelWidget.setProperty(prop.MORE, {
      text: `EST VEL\n${rep.normalizedConcentricVelocity.toFixed(2)}x`
    });

    // LOSS with contextual color
    this.metricLossWidget.setProperty(prop.MORE, {
      text: `LOSS\n${Math.round(rep.velocityLossPercent)}%`,
      color: fatigue.color
    });

    // CONFIDENCE
    this.metricConfWidget.setProperty(prop.MORE, {
      text: `CONF\n${rep.confidence}%`
    });

    // KINEMATIC FATIGUE
    this.metricFatigueWidget.setProperty(prop.MORE, {
      text: `KINEMATIC\n${fatigue.fatigueLevel}`,
      color: fatigue.color
    });

    this.statusWidget.setProperty(prop.MORE, {
      text: `${fatigue.fatigueLevel} Kinematic Loss`
    });
  }

  toggleViewMode() {
    if (this.currentViewMode === 'LIVE') {
      this.currentViewMode = 'FATIGUE';
      const fLevel = this.latestFatigue ? this.latestFatigue.fatigueLevel : 'LOW';
      const fScore = this.latestFatigue ? this.latestFatigue.fatigueScore : 0;
      const fConf = this.latestFatigue ? this.latestFatigue.fatigueConfidence : 100;
      const fLoss = this.reps.length > 0 ? this.reps[this.reps.length - 1].velocityLossPercent : 0;

      this.repNumberWidget.setProperty(prop.MORE, { text: 'KINEMATIC FATIGUE' });
      this.metricVelWidget.setProperty(prop.MORE, { text: `LEVEL\n${fLevel}` });
      this.metricLossWidget.setProperty(prop.MORE, { text: `SCORE\n${fScore}/100` });
      this.metricConfWidget.setProperty(prop.MORE, { text: `LOSS\n${Math.round(fLoss)}%` });
      this.metricFatigueWidget.setProperty(prop.MORE, { text: `CONF\n${fConf}%` });
      this.statusWidget.setProperty(prop.MORE, { text: 'Movement performance decline estimate' });
      this.btnToggleView.setProperty(prop.MORE, { text: 'REPS' });
    } else {
      this.currentViewMode = 'LIVE';
      const lastRep = this.reps.length > 0 ? this.reps[this.reps.length - 1] : null;
      const repNum = lastRep ? lastRep.repNumber : 0;
      const repStr = repNum < 10 ? `REP 0${repNum}` : `REP ${repNum}`;
      this.repNumberWidget.setProperty(prop.MORE, { text: repStr });
      this.metricVelWidget.setProperty(prop.MORE, {
        text: `EST VEL\n${lastRep ? lastRep.normalizedConcentricVelocity.toFixed(2) : '1.00'}x`
      });
      this.metricLossWidget.setProperty(prop.MORE, {
        text: `LOSS\n${lastRep ? Math.round(lastRep.velocityLossPercent) : 0}%`
      });
      this.metricConfWidget.setProperty(prop.MORE, {
        text: `CONF\n${lastRep ? lastRep.confidence : 100}%`
      });
      this.metricFatigueWidget.setProperty(prop.MORE, {
        text: `KINEMATIC\n${this.latestFatigue ? this.latestFatigue.fatigueLevel : 'LOW'}`
      });
      this.statusWidget.setProperty(prop.MORE, { text: 'Ready. Continue reps...' });
      this.btnToggleView.setProperty(prop.MORE, { text: 'INFO' });
    }
  }

  finishSet() {
    this.cleanup();

    const endTime = Date.now();
    const validReps = this.reps;
    const totalDetectedReps = this.detector.detectedReps.length + this.detector.rejectedReps.length;

    const velocities = validReps.map(r => r.estimatedConcentricVelocity);
    const losses = validReps.map(r => r.velocityLossPercent);
    const confidences = validReps.map(r => r.confidence);

    const baselineVel = (this.baseline && this.baseline.baselineConcentricVelocity) || 1.0;
    const firstVel = velocities.length > 0 ? velocities[0] : baselineVel;
    const lastVel = velocities.length > 0 ? velocities[velocities.length - 1] : baselineVel;

    const maxLoss = losses.length > 0 ? Math.max(...losses) : 0;
    const finalLoss = losses.length > 0 ? losses[losses.length - 1] : 0;
    let sumLoss = 0;
    for (let i = 0; i < losses.length; i++) sumLoss += losses[i];
    const avgLoss = losses.length > 0 ? sumLoss / losses.length : 0;

    let sumConf = 0;
    for (let i = 0; i < confidences.length; i++) sumConf += confidences[i];
    const avgConf = confidences.length > 0 ? Math.round(sumConf / confidences.length) : 100;

    const finalFatigue = FatigueEngine.evaluate(finalLoss, avgConf, validReps);

    const setRecord = {
      exercise: 'bicep_curl',
      startTimestamp: this.setStartTime,
      endTimestamp: endTime,
      totalReps: totalDetectedReps,
      validReps: validReps.length,
      rejectedReps: this.detector.rejectedReps.length,
      baselineVelocity: baselineVel,
      firstValidConcentricVelocity: firstVel,
      lastValidConcentricVelocity: lastVel,
      maximumVelocityLoss: Math.round(maxLoss),
      averageVelocityLoss: Math.round(avgLoss),
      finalVelocityLoss: Math.round(finalLoss),
      averageRepConfidence: avgConf,
      fatigueLevel: finalFatigue.fatigueLevel,
      fatigueScore: finalFatigue.fatigueScore,
      fatigueConfidence: finalFatigue.fatigueConfidence,
      reps: validReps
    };

    // Store set locally
    WorkoutStorage.saveWorkoutSet(setRecord);

    // Save set summary for setResult page
    getApp().globalData = getApp().globalData || {};
    getApp().globalData.lastSetResult = setRecord;

    push({ url: 'pages/setResult' });
  }

  cleanup() {
    this.isWorkoutActive = false;
    if (this.sensorManager) {
      this.sensorManager.stop();
    }
  }

  onDestroy() {
    this.cleanup();
  }
});
