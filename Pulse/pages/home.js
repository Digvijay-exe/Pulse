import { createWidget, widget, prop, align } from '@zos/ui';
import { push } from '@zos/router';
import { WorkoutStorage } from '../storage/workoutStorage';
import { CONSTANTS } from '../utils/constants';

Page({
  build() {
    this.baseline = WorkoutStorage.getBaseline();

    // App Header
    createWidget(widget.TEXT, {
      x: 0,
      y: 28,
      w: CONSTANTS.SCREEN_WIDTH,
      h: 30,
      color: CONSTANTS.COLORS.PRIMARY,
      text_size: 20,
      align_h: align.CENTER_H,
      text: 'PULSE'
    });

    createWidget(widget.TEXT, {
      x: 20,
      y: 56,
      w: 320,
      h: 22,
      color: CONSTANTS.COLORS.ACCENT_CYAN,
      text_size: 13,
      align_h: align.CENTER_H,
      text: 'Kinematic Fatigue Tracker'
    });

    // Baseline Status Indicator
    const baselineText = this.baseline 
      ? `Baseline: Ready (${this.baseline.baselineConcentricVelocity.toFixed(2)}x)`
      : 'Baseline: Not Calibrated';
    const baselineColor = this.baseline ? CONSTANTS.COLORS.PRIMARY : CONSTANTS.COLORS.ACCENT_YELLOW;

    this.statusWidget = createWidget(widget.TEXT, {
      x: 20,
      y: 84,
      w: 320,
      h: 22,
      color: baselineColor,
      text_size: 13,
      align_h: align.CENTER_H,
      text: baselineText
    });

    // Exercise Card: Bicep Curl
    createWidget(widget.TEXT, {
      x: 40,
      y: 115,
      w: 280,
      h: 26,
      color: CONSTANTS.COLORS.TEXT_WHITE,
      text_size: 16,
      align_h: align.CENTER_H,
      text: 'Exercise: BICEP CURL'
    });

    // Button 1: START SET (Primary action)
    createWidget(widget.BUTTON, {
      x: 50,
      y: 152,
      w: 260,
      h: 46,
      text: 'START SET',
      color: 0x000000,
      normal_color: CONSTANTS.COLORS.PRIMARY,
      press_color: 0x00b248,
      radius: 23,
      text_size: 18,
      click_func: () => {
        if (!this.baseline) {
          // Guide user to calibration if baseline is missing
          push({ url: 'pages/calibration' });
        } else {
          push({ url: 'pages/workout' });
        }
      }
    });

    // Button 2: CALIBRATE
    createWidget(widget.BUTTON, {
      x: 50,
      y: 206,
      w: 260,
      h: 42,
      text: this.baseline ? 'RE-CALIBRATE' : 'CALIBRATE (3-5 REPS)',
      color: CONSTANTS.COLORS.TEXT_WHITE,
      normal_color: 0x242424,
      press_color: 0x3a3a3a,
      radius: 21,
      text_size: 14,
      click_func: () => {
        push({ url: 'pages/calibration' });
      }
    });

    // Button 3: SENSOR LAB (Phase 1 Raw Diagnostics)
    createWidget(widget.BUTTON, {
      x: 50,
      y: 256,
      w: 260,
      h: 38,
      text: 'PHASE 1 SENSOR LAB',
      color: CONSTANTS.COLORS.ACCENT_CYAN,
      normal_color: 0x181818,
      press_color: 0x282828,
      radius: 19,
      text_size: 13,
      click_func: () => {
        push({ url: 'pages/sensorLab' });
      }
    });

    // Scientific notice footer
    createWidget(widget.TEXT, {
      x: 20,
      y: 308,
      w: 320,
      h: 36,
      color: CONSTANTS.COLORS.TEXT_MUTED,
      text_size: 11,
      align_h: align.CENTER_H,
      text: 'Relative velocity & kinematic loss\nOffline IMU estimate'
    });
  }
});
