export const CONSTANTS = {
  SAMPLE_RATE_TARGET: 50,
  STORAGE_FILE_NAME: 'sensor_lab_data.json',
  WORKOUT_STORAGE_FILE_NAME: 'pulse_bicep_curl_workout.json',
  STORAGE_SCHEMA_VERSION: 2,
  // Enable only when collecting logs for tuning; avoid allocating a debug
  // object for every sensor callback during normal on-watch workouts.
  DEBUG_ENABLED: false,
  MAX_RAW_SAMPLES: 6000,
  MAX_DEBUG_SAMPLES: 1200,
  UI_UPDATE_INTERVAL_MS: 250,
  CALIBRATION_MIN_REPS: 3,
  CALIBRATION_MAX_REPS: 5,
  BOTTOM_REFERENCE_DURATION_MS: 800,
  MIN_REP_DURATION_MS: 650,
  MAX_REP_DURATION_MS: 7000,
  MIN_CONCENTRIC_DURATION_MS: 180,
  MIN_ECCENTRIC_DURATION_MS: 180,
  REARM_QUIET_MS: 250,
  MIN_REP_CONFIDENCE: 55,
  MIN_BASELINE_CONFIDENCE: 70,
  FATIGUE_BANDS: [5, 10, 20, 30]
};
