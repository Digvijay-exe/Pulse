export const CONSTANTS = {
  SAMPLE_RATE_TARGET: 50,
  STORAGE_FILE_NAME: 'pulse_workouts.json',
  CALIBRATION_FILE_NAME: 'pulse_calibration.json',
  DEBUG_LOG_FILE: 'pulse_debug.json',
  SCREEN_WIDTH: 360,
  SCREEN_HEIGHT: 360,

  // Detecor States
  STATE: {
    IDLE: 'IDLE',
    MOVEMENT_START: 'MOVEMENT_START',
    MOVING: 'MOVING',
    DIRECTION_CHANGE: 'DIRECTION_CHANGE',
    RETURNING: 'RETURNING',
    REP_CANDIDATE: 'REP_CANDIDATE',
    REP_VALIDATED: 'REP_VALIDATED'
  },

  // UI Colors (360x360 round high contrast)
  COLORS: {
    BACKGROUND: 0x000000,
    PRIMARY: 0x00e676,    // Neon emerald green
    ACCENT_CYAN: 0x00e5ff,
    ACCENT_YELLOW: 0xffea00,
    ACCENT_ORANGE: 0xff9100,
    ACCENT_RED: 0xff1744,
    TEXT_WHITE: 0xffffff,
    TEXT_MUTED: 0x9e9e9e,
    CARD_BG: 0x1a1a1a,
    BORDER: 0x2e2e2e
  },

  // Velocity loss heuristic bands for UI
  VELOCITY_LOSS_BANDS: {
    LOW: { max: 5, label: 'LOW MOVEMENT LOSS', color: 0x00e676 },
    MILD: { max: 10, label: 'MILD LOSS', color: 0x00e5ff },
    MODERATE: { max: 20, label: 'MODERATE LOSS', color: 0xffea00 },
    HIGH: { max: 30, label: 'HIGH LOSS', color: 0xff9100 },
    VERY_HIGH: { max: Infinity, label: 'VERY HIGH LOSS', color: 0xff1744 }
  }
};
