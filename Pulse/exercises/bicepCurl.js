/**
 * Bicep Curl Kinematic Configuration
 * Configurable thresholds and signatures for wrist-worn IMU
 */
export const BicepCurlConfig = {
  id: 'bicep_curl',
  name: 'Bicep Curl',
  description: 'Dumbbell or barbell bicep flexion & extension',

  // Calibration requirements
  calibration: {
    minRepsRequired: 3,
    targetReps: 5,
    maxAllowedReps: 8,
    minBaselineVelocity: 0.1,
    maxVarianceRatio: 0.55 // Max allowed relative standard deviation during baseline
  },

  // State-Machine Rep Detection Parameters
  detection: {
    // Primary movement axis for wrist during curl (pitch/roll dominant depending on grip,
    // so we utilize both primary axis projection and dynamic gyro/acc magnitude)
    minMovementAmplitude: 3.5,     // m/s^2 dynamic acceleration deviation from resting
    gyroActiveThreshold: 28.0,      // deg/s - minimum rotational activity during curl
    gyroRestingThreshold: 12.0,     // deg/s - threshold to confirm rest / boundary

    minRepDurationMs: 900,         // Realistic minimum for a controlled curl rep
    maxRepDurationMs: 6500,        // Maximum allowed duration before timeout
    minTimeBetweenRepsMs: 400,     // Debounce to strictly prevent double-counting

    // Phase segmentation heuristics
    minConcentricDurationMs: 350,
    maxConcentricDurationMs: 4000,
    minEccentricDurationMs: 350,
    maxEccentricDurationMs: 4000,

    // Turnaround inflection threshold (concentric to eccentric peak)
    inflectionThresholdFraction: 0.45
  },

  // Validation thresholds
  validation: {
    minConfidence: 55,            // Reps below this are deemed 'MOVEMENT UNCLEAR'
    minBaselineSimilarity: 0.40,  // Minimum amplitude & timing similarity to baseline
    maxAsymmetryRatio: 4.5        // Unrealistic ratio of eccentric to concentric time
  },

  // Velocity Estimation Weights
  velocity: {
    // Relative velocity proxy weights:
    // v_proxy ~ (integrated dynamic acceleration / duration) combined with rotational sweep
    rotationalWeight: 0.55,
    linearAccWeight: 0.45
  }
};
