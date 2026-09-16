import { createWidget, widget, prop, align } from '@zos/ui';
import { push, back } from '@zos/router';
import { SensorManager } from '../core/sensorManager';
import { SignalProcessor } from '../core/signalProcessor';
import { RepDetector } from '../core/repDetector';
import { CalibrationManager } from '../core/calibration';
import { WorkoutStorage } from '../storage/workoutStorage';
import { CONSTANTS } from '../utils/constants';

Page({
  build() {
    this.sensorManager = new SensorManager();
    this.processor = new SignalProcessor();
    this.detector = new RepDetector(null);
    this.calibration = new CalibrationManager();
    this.isCalibrating = false;

    // Header
    createWidget(widget.TEXT, {
      x: 0,
      y: 26,
      w: CONSTANTS.SCREEN_WIDTH,
      h: 28,
      color: CONSTANTS.COLORS.PRIMARY,
      text_size: 19,
      align_h: align.CENTER_H,
      text: 'CALIBRATION'
    });

    this.subTitleWidget = createWidget(widget.TEXT, {
      x: 20,
      y: 52,
      w: 320,
      h: 22,
      color: CONSTANTS.COLORS.ACCENT_CYAN,
      text_size: 13,
      align_h: align.CENTER_H,
      text: 'Perform 3-5 Controlled Curls'
    });

    // Big Progress Rep Counter
    this.counterWidget = createWidget(widget.TEXT, {
      x: 30,
      y: 80,
      w: 300,
      h: 56,
      color: CONSTANTS.COLORS.TEXT_WHITE,
      text_size: 42,
      align_h: align.CENTER_H,
      text: '0 / 5'
    });

    // Status / Instruction Box
    this.statusWidget = createWidget(widget.TEXT, {
      x: 20,
      y: 142,
      w: 320,
      h: 30,
      color: CONSTANTS.COLORS.ACCENT_YELLOW,
      text_size: 15,
      align_h: align.CENTER_H,
      text: 'Press START to begin'
    });

    // Live Metrics Feedback (Last Rep Speed & Durations)
    this.metricsWidget = createWidget(widget.TEXT, {
      x: 20,
      y: 176,
      w: 320,
      h: 46,
      color: CONSTANTS.COLORS.TEXT_MUTED,
      text_size: 13,
      align_h: align.CENTER_H,
      text: 'Concentric: --  Eccentric: --\nEstimated Vel: --'
    });

    // Primary Action Button (Start / Cancel / Proceed)
    this.btnAction = createWidget(widget.BUTTON, {
      x: 50,
      y: 236,
      w: 260,
      h: 46,
      text: 'START CALIBRATION',
      color: 0x000000,
      normal_color: CONSTANTS.COLORS.PRIMARY,
      press_color: 0x00b248,
      radius: 23,
      text_size: 16,
      click_func: () => {
        this.handleButtonAction();
      }
    });

    // Back / Exit Button
    createWidget(widget.BUTTON, {
      x: 90,
      y: 292,
      w: 180,
      h: 36,
      text: 'CANCEL',
      color: CONSTANTS.COLORS.TEXT_MUTED,
      normal_color: 0x1f1f1f,
      press_color: 0x333333,
      radius: 18,
      text_size: 13,
      click_func: () => {
        this.cleanup();
        back();
      }
    });

    // Setup Detector Event Callbacks
    this.detector.onRepValidated = (rep) => {
      this.handleCalibrationRep(rep);
    };

    this.detector.onRepRejected = (rep) => {
      this.statusWidget.setProperty(prop.MORE, {
        text: 'Rep unclear (keep controlled)'
      });
    };
  }

  handleButtonAction() {
    if (this.calibration.isComplete) {
      // Proceed to workout
      this.cleanup();
      push({ url: 'pages/workout' });
      return;
    }

    if (!this.isCalibrating) {
      this.startCalibration();
    }
  }

  startCalibration() {
    this.isCalibrating = true;
    this.calibration.reset();
    this.detector.reset();
    this.processor.reset();

    this.btnAction.setProperty(prop.MORE, {
      text: 'CALIBRATING...',
      normal_color: 0x333333,
      color: 0x888888
    });

    this.statusWidget.setProperty(prop.MORE, {
      text: 'Curl 1: Lift dumbbell smoothly'
    });

    this.sensorManager.setStreamCallback((rawSample) => {
      const processed = this.processor.process(rawSample);
      this.detector.processSample(processed);
    });

    const res = this.sensorManager.start();
    if (res && res.error) {
      this.statusWidget.setProperty(prop.MORE, { text: res.error });
      this.isCalibrating = false;
    }
  }

  handleCalibrationRep(rep) {
    const result = this.calibration.addRep(rep);

    if (result.status === 'PROGRESS') {
      this.counterWidget.setProperty(prop.MORE, {
        text: `${result.repsCount} / ${result.targetReps}`
      });

      this.statusWidget.setProperty(prop.MORE, {
        text: `Rep ${result.repsCount} recorded! Next curl...`
      });

      this.metricsWidget.setProperty(prop.MORE, {
        text: `Concentric: ${(rep.concentricDurationMs / 1000).toFixed(1)}s  Eccentric: ${(rep.eccentricDurationMs / 1000).toFixed(1)}s\nEst Vel: ${rep.estimatedConcentricVelocity.toFixed(2)}x`
      });
    } else if (result.status === 'COMPLETE') {
      this.counterWidget.setProperty(prop.MORE, {
        text: '5 / 5'
      });

      this.statusWidget.setProperty(prop.MORE, {
        text: 'CALIBRATION COMPLETE\nBASELINE READY'
      });

      const b = result.baseline;
      this.metricsWidget.setProperty(prop.MORE, {
        text: `Baseline: ${b.baselineConcentricVelocity.toFixed(2)}x (Median)\nConcentric: ${(b.concentricDurationMedian / 1000).toFixed(1)}s`
      });

      // Save baseline locally
      WorkoutStorage.saveBaseline(b);

      this.btnAction.setProperty(prop.MORE, {
        text: 'PROCEED TO SET',
        normal_color: CONSTANTS.COLORS.PRIMARY,
        color: 0x000000
      });

      this.sensorManager.stop();
    } else if (result.status === 'FAILED') {
      this.statusWidget.setProperty(prop.MORE, {
        text: 'CALIBRATION FAILED\nTRY AGAIN'
      });

      this.btnAction.setProperty(prop.MORE, {
        text: 'RETRY CALIBRATION',
        normal_color: CONSTANTS.COLORS.ACCENT_RED,
        color: 0xffffff
      });

      this.isCalibrating = false;
      this.sensorManager.stop();
    }
  }

  cleanup() {
    if (this.sensorManager) {
      this.sensorManager.stop();
    }
  }

  onDestroy() {
    this.cleanup();
  }
});
