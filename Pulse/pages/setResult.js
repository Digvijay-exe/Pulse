import { createWidget, widget, align } from '@zos/ui';
import { replace } from '@zos/router';
import { CONSTANTS } from '../utils/constants';

Page({
  build() {
    const globalData = (getApp && getApp().globalData) || {};
    const set = globalData.lastSetResult || {
      exercise: 'bicep_curl',
      validReps: 0,
      totalReps: 0,
      baselineVelocity: 1.0,
      lastValidConcentricVelocity: 1.0,
      finalVelocityLoss: 0,
      fatigueLevel: 'LOW',
      fatigueScore: 0,
      averageRepConfidence: 95
    };

    // 1. Header
    createWidget(widget.TEXT, {
      x: 0,
      y: 22,
      w: CONSTANTS.SCREEN_WIDTH,
      h: 24,
      color: CONSTANTS.COLORS.PRIMARY,
      text_size: 16,
      align_h: align.CENTER_H,
      text: 'SET COMPLETE'
    });

    // 2. Rep count title
    createWidget(widget.TEXT, {
      x: 20,
      y: 48,
      w: 320,
      h: 38,
      color: CONSTANTS.COLORS.TEXT_WHITE,
      text_size: 32,
      align_h: align.CENTER_H,
      text: `${set.validReps} REPS`
    });

    // 3. Grid of Summary Metrics
    // Row 1: Baseline vs Final Velocity Ratio
    createWidget(widget.TEXT, {
      x: 25,
      y: 92,
      w: 150,
      h: 44,
      color: CONSTANTS.COLORS.TEXT_WHITE,
      text_size: 14,
      align_h: align.CENTER_H,
      text: `BASELINE\n1.00x`
    });

    const finalRatio = set.baselineVelocity > 0 ? (set.lastValidConcentricVelocity / set.baselineVelocity).toFixed(2) : '1.00';
    createWidget(widget.TEXT, {
      x: 185,
      y: 92,
      w: 150,
      h: 44,
      color: CONSTANTS.COLORS.ACCENT_CYAN,
      text_size: 14,
      align_h: align.CENTER_H,
      text: `FINAL VEL\n${finalRatio}x`
    });

    // Row 2: Final Velocity Loss vs Kinematic Fatigue Level
    let fatigueColor = CONSTANTS.COLORS.PRIMARY;
    if (set.fatigueLevel === 'VERY HIGH') fatigueColor = CONSTANTS.COLORS.ACCENT_RED;
    else if (set.fatigueLevel === 'HIGH') fatigueColor = CONSTANTS.COLORS.ACCENT_ORANGE;
    else if (set.fatigueLevel === 'MODERATE') fatigueColor = CONSTANTS.COLORS.ACCENT_YELLOW;
    else if (set.fatigueLevel === 'MILD') fatigueColor = CONSTANTS.COLORS.ACCENT_CYAN;

    createWidget(widget.TEXT, {
      x: 25,
      y: 142,
      w: 150,
      h: 44,
      color: fatigueColor,
      text_size: 14,
      align_h: align.CENTER_H,
      text: `LOSS\n${set.finalVelocityLoss}%`
    });

    createWidget(widget.TEXT, {
      x: 185,
      y: 142,
      w: 150,
      h: 44,
      color: fatigueColor,
      text_size: 14,
      align_h: align.CENTER_H,
      text: `FATIGUE\n${set.fatigueLevel}`
    });

    // Row 3: Confidence & Score
    createWidget(widget.TEXT, {
      x: 20,
      y: 194,
      w: 320,
      h: 24,
      color: CONSTANTS.COLORS.TEXT_MUTED,
      text_size: 13,
      align_h: align.CENTER_H,
      text: `Score: ${set.fatigueScore || 0}/100  |  Confidence: ${set.averageRepConfidence || 90}%`
    });

    // 4. Return Home Button
    createWidget(widget.BUTTON, {
      x: 55,
      y: 236,
      w: 250,
      h: 46,
      text: 'FINISH & RETURN',
      color: 0x000000,
      normal_color: CONSTANTS.COLORS.PRIMARY,
      press_color: 0x00b248,
      radius: 23,
      text_size: 16,
      click_func: () => {
        replace({ url: 'pages/home' });
      }
    });

    // Subtitle
    createWidget(widget.TEXT, {
      x: 20,
      y: 295,
      w: 320,
      h: 30,
      color: CONSTANTS.COLORS.TEXT_MUTED,
      text_size: 11,
      align_h: align.CENTER_H,
      text: 'Saved locally to watch storage\nKinematic performance estimate'
    });
  }
});
