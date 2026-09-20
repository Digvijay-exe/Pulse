import { CONSTANTS } from '../utils/constants';
import { mathUtils } from '../utils/math';

export const DETECTOR_STATES = {
  IDLE: 'IDLE', MOVEMENT_START: 'MOVEMENT_START', MOVING: 'MOVING',
  DIRECTION_CHANGE: 'DIRECTION_CHANGE', RETURNING: 'RETURNING',
  REP_CANDIDATE: 'REP_CANDIDATE', REP_VALIDATED: 'REP_VALIDATED'
};

// Ported from the phone prototype: detect wrist rotation from its calibrated
// arm-down gravity vector, rather than treating every acceleration peak as a rep.
export class RepDetector {
  constructor() { this.reset(null); }
  reset(calibration) {
    this.calibration = calibration; this.state = DETECTOR_STATES.IDLE; this.current = null;
    this.lastRepEndTimestamp = 0; this.liftSamples = 0; this.topSamples = 0; this.bottomSamples = 0;
  }
  getThresholds() {
    return this.calibration || { liftStartAngle: 20, topAngle: 75, bottomAngle: 15,
      movementAmplitude: 75, amplitudeTolerance: 45, normalRepDurationMs: 2500,
      durationToleranceMs: 1800, gyroThreshold: 10 };
  }
  process(sample) {
    if (!sample || !mathUtils.isFiniteNumber(sample.orientationAngle)) return null;
    const thresholds = this.getThresholds();
    const angle = mathUtils.isFiniteNumber(sample.filteredOrientationAngle) ? sample.filteredOrientationAngle : sample.orientationAngle;
    if (this.state === DETECTOR_STATES.IDLE) {
      this.liftSamples = angle >= thresholds.liftStartAngle ? this.liftSamples + 1 : 0;
      if (this.liftSamples >= 2 && sample.timestamp - this.lastRepEndTimestamp >= CONSTANTS.REARM_QUIET_MS) {
        this.current = this.createCandidate(sample); this.state = DETECTOR_STATES.MOVEMENT_START;
        this.topSamples = 0; this.bottomSamples = 0;
      }
      return null;
    }
    if (!this.current) { this.state = DETECTOR_STATES.IDLE; return null; }
    this.addSample(sample);
    const elapsed = sample.timestamp - this.current.startTimestamp;
    if (this.state === DETECTOR_STATES.MOVEMENT_START) this.state = DETECTOR_STATES.MOVING;
    this.topSamples = angle >= thresholds.topAngle ? this.topSamples + 1 : 0;
    this.bottomSamples = angle <= thresholds.bottomAngle ? this.bottomSamples + 1 : 0;
    if (this.state === DETECTOR_STATES.MOVING && this.topSamples >= 2) {
      this.current.turnIndex = this.current.samples.length - 1; this.current.turnTimestamp = sample.timestamp;
      this.state = DETECTOR_STATES.DIRECTION_CHANGE;
    }
    if (this.state === DETECTOR_STATES.DIRECTION_CHANGE) this.state = DETECTOR_STATES.RETURNING;
    // A rep is emitted only after reaching top and returning to bottom; pauses
    // at the top therefore cannot cause a duplicate count.
    if (this.state === DETECTOR_STATES.RETURNING && this.bottomSamples >= 2) {
      this.state = DETECTOR_STATES.REP_CANDIDATE;
      const rep = this.finishCandidate(sample.timestamp, true);
      this.lastRepEndTimestamp = sample.timestamp;
      this.state = rep.valid ? DETECTOR_STATES.REP_VALIDATED : DETECTOR_STATES.IDLE;
      return rep;
    }
    if (this.state === DETECTOR_STATES.MOVING && this.bottomSamples >= 2) {
      // Reached neither top nor a valid range of motion: record a deliberate
      // incomplete attempt, but ignore brief bottom-position wrist jitter.
      if (elapsed >= 800) {
        const rep = this.finishCandidate(sample.timestamp, false);
        this.lastRepEndTimestamp = sample.timestamp; this.state = DETECTOR_STATES.IDLE;
        return rep;
      }
      this.current = null; this.state = DETECTOR_STATES.IDLE;
    }
    if (elapsed > CONSTANTS.MAX_REP_DURATION_MS) { this.current = null; this.lastRepEndTimestamp = sample.timestamp; this.state = DETECTOR_STATES.IDLE; }
    return null;
  }
  createCandidate(sample) {
    return { startTimestamp: sample.timestamp, samples: [sample], peakAngle: sample.orientationAngle,
      peakLinearAcceleration: Math.abs(sample.linearAcceleration), peakGyro: sample.filteredGyro,
      noiseEstimate: sample.noiseEstimate, turnIndex: -1 };
  }
  addSample(sample) {
    this.current.samples.push(sample); this.current.peakAngle = Math.max(this.current.peakAngle, sample.orientationAngle);
    this.current.peakLinearAcceleration = Math.max(this.current.peakLinearAcceleration, Math.abs(sample.linearAcceleration));
    this.current.peakGyro = Math.max(this.current.peakGyro, sample.filteredGyro);
    this.current.noiseEstimate = Math.max(this.current.noiseEstimate, sample.noiseEstimate);
  }
  finishCandidate(endTimestamp, reachedTop) {
    const candidate = this.current; this.current = null; const thresholds = this.getThresholds();
    const durationMs = endTimestamp - candidate.startTimestamp;
    const amplitudeSimilarity = this.calibration ? mathUtils.similarity(candidate.peakAngle, thresholds.movementAmplitude, thresholds.amplitudeTolerance) : 1;
    const durationSimilarity = this.calibration ? mathUtils.similarity(durationMs, thresholds.normalRepDurationMs, thresholds.durationToleranceMs) : 1;
    const gyroQuality = candidate.peakGyro >= thresholds.gyroThreshold ? 1 : 0.5;
    const confidence = Math.round(100 * (amplitudeSimilarity * 0.35 + durationSimilarity * 0.25 + gyroQuality * 0.15 + (reachedTop ? 1 : 0) * 0.25));
    const valid = reachedTop && durationMs >= CONSTANTS.MIN_REP_DURATION_MS && durationMs <= CONSTANTS.MAX_REP_DURATION_MS && confidence >= CONSTANTS.MIN_REP_CONFIDENCE;
    return { startTimestamp: candidate.startTimestamp, endTimestamp, durationMs, movementAmplitude: candidate.peakAngle,
      peakGyro: candidate.peakGyro, noiseEstimate: candidate.noiseEstimate, directionSign: 1,
      turnIndex: candidate.turnIndex, samples: candidate.samples, confidence, valid };
  }
}
