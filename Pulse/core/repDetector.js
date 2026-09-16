import { CONSTANTS } from '../utils/constants';
import { BicepCurlConfig } from '../exercises/bicepCurl';
import { PhaseDetector } from './phaseDetector';
import { VelocityEstimator } from './velocityEstimator';
import { ConfidenceEvaluator } from './confidence';
import { mathUtils } from '../utils/math';

/**
 * State-Machine Rep Detector
 * States:
 * IDLE -> MOVEMENT_START -> MOVING -> DIRECTION_CHANGE -> RETURNING -> REP_CANDIDATE -> REP_VALIDATED
 * 
 * Rejects random wrist twitches, prevents double-counting, and segments phases cleanly.
 */
export class RepDetector {
  constructor(baseline = null) {
    this.baseline = baseline;
    this.state = CONSTANTS.STATE.IDLE;
    this.repBuffer = [];
    this.lastRepEndTime = 0;
    this.repCount = 0;
    this.detectedReps = [];
    this.rejectedReps = [];

    this.candidateStartTimestamp = 0;
    this.maxAmplitudeInRep = 0;
    this.maxGyroInRep = 0;

    this.onRepValidated = null;
    this.onRepRejected = null;
    this.onStateChange = null;
  }

  setBaseline(baseline) {
    this.baseline = baseline;
  }

  reset() {
    this.state = CONSTANTS.STATE.IDLE;
    this.repBuffer = [];
    this.lastRepEndTime = 0;
    this.repCount = 0;
    this.detectedReps = [];
    this.rejectedReps = [];
    this.candidateStartTimestamp = 0;
    this.maxAmplitudeInRep = 0;
    this.maxGyroInRep = 0;
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      if (this.onStateChange) {
        this.onStateChange(newState);
      }
    }
  }

  /**
   * Process incoming filtered sample
   */
  processSample(sample) {
    const config = BicepCurlConfig.detection;
    const now = sample.timestamp;
    const linAcc = sample.linAccMagnitude;
    const gyro = sample.gyroMagnitude;

    // Maintain a rolling window of recent samples for candidate rep analysis
    // Debounce check: if rep finished very recently, remain in IDLE/debouncing
    if (now - this.lastRepEndTime < config.minTimeBetweenRepsMs) {
      return null;
    }

    switch (this.state) {
      case CONSTANTS.STATE.IDLE:
        // Wait for movement start: both linear acceleration and gyro must exceed threshold
        if (gyro > config.gyroActiveThreshold && linAcc > (config.minMovementAmplitude * 0.4)) {
          this.setState(CONSTANTS.STATE.MOVEMENT_START);
          this.candidateStartTimestamp = now;
          this.repBuffer = [sample];
          this.maxAmplitudeInRep = linAcc;
          this.maxGyroInRep = gyro;
        }
        break;

      case CONSTANTS.STATE.MOVEMENT_START:
        this.repBuffer.push(sample);
        if (linAcc > this.maxAmplitudeInRep) this.maxAmplitudeInRep = linAcc;
        if (gyro > this.maxGyroInRep) this.maxGyroInRep = gyro;

        // Verify movement continues (not just a single momentary click or tap)
        if (this.repBuffer.length >= 4) {
          if (this.maxAmplitudeInRep >= config.minMovementAmplitude && this.maxGyroInRep >= config.gyroActiveThreshold) {
            this.setState(CONSTANTS.STATE.MOVING);
          } else {
            // Momentary twitch - reset back to IDLE
            this.setState(CONSTANTS.STATE.IDLE);
            this.repBuffer = [];
          }
        }
        break;

      case CONSTANTS.STATE.MOVING:
        this.repBuffer.push(sample);
        if (linAcc > this.maxAmplitudeInRep) this.maxAmplitudeInRep = linAcc;
        if (gyro > this.maxGyroInRep) this.maxGyroInRep = gyro;

        // Detect direction change (apex of the curl where gyro dips and acceleration reverses)
        const elapsed = now - this.candidateStartTimestamp;
        if (elapsed > config.maxRepDurationMs) {
          // Exceeded maximum realistic rep duration
          this.setState(CONSTANTS.STATE.IDLE);
          this.repBuffer = [];
          break;
        }

        if (elapsed > config.minConcentricDurationMs && gyro < (this.maxGyroInRep * 0.6)) {
          this.setState(CONSTANTS.STATE.DIRECTION_CHANGE);
        }
        break;

      case CONSTANTS.STATE.DIRECTION_CHANGE:
        this.repBuffer.push(sample);
        // Transition to RETURNING (eccentric lowering)
        if (gyro > config.gyroActiveThreshold) {
          this.setState(CONSTANTS.STATE.RETURNING);
        }
        break;

      case CONSTANTS.STATE.RETURNING:
        this.repBuffer.push(sample);
        const currentDuration = now - this.candidateStartTimestamp;

        // Check if movement has settled back to resting state
        if (gyro <= config.gyroRestingThreshold && currentDuration >= config.minRepDurationMs) {
          this.setState(CONSTANTS.STATE.REP_CANDIDATE);
          return this.finalizeCandidateRep(now);
        }

        // Timeout check
        if (currentDuration > config.maxRepDurationMs) {
          this.finalizeCandidateRep(now);
          this.setState(CONSTANTS.STATE.IDLE);
        }
        break;

      default:
        this.setState(CONSTANTS.STATE.IDLE);
        break;
    }

    return null;
  }

  finalizeCandidateRep(endTimestamp) {
    const startTimestamp = this.candidateStartTimestamp;
    const durationMs = endTimestamp - startTimestamp;
    const repSamples = this.repBuffer.slice();

    // Reset buffer and update last rep end time
    this.lastRepEndTime = endTimestamp;
    this.repBuffer = [];
    this.setState(CONSTANTS.STATE.IDLE);

    // 1. Phase Segmentation
    const phaseData = PhaseDetector.segment(repSamples, this.baseline);
    if (!phaseData) {
      return null;
    }

    // 2. Velocity Estimation
    const estimatedConcentricVelocity = VelocityEstimator.estimate(
      phaseData.concentricSamples,
      phaseData.concentricDurationMs,
      this.maxAmplitudeInRep
    );

    // 3. Validation and Confidence
    const repData = {
      repNumber: this.repCount + 1,
      startTimestamp,
      endTimestamp,
      durationMs,
      concentricStartTimestamp: phaseData.concentricStartTimestamp,
      concentricEndTimestamp: phaseData.concentricEndTimestamp,
      eccentricStartTimestamp: phaseData.eccentricStartTimestamp,
      eccentricEndTimestamp: phaseData.eccentricEndTimestamp,
      concentricDurationMs: phaseData.concentricDurationMs,
      eccentricDurationMs: phaseData.eccentricDurationMs,
      movementAmplitude: mathUtils.round(this.maxAmplitudeInRep, 2),
      maxGyro: mathUtils.round(this.maxGyroInRep, 1),
      estimatedConcentricVelocity
    };

    const valResult = ConfidenceEvaluator.evaluate(repData, this.baseline);
    repData.confidence = valResult.confidence;
    repData.valid = valResult.valid;
    repData.validationReason = valResult.reason;

    // 4. Compute Velocity Loss if baseline is available
    const baselineVel = (this.baseline && this.baseline.baselineConcentricVelocity) || 0;
    repData.baselineVelocity = baselineVel;

    const lossInfo = VelocityEstimator.computeVelocityLoss(estimatedConcentricVelocity, baselineVel);
    repData.normalizedConcentricVelocity = lossInfo.normalizedConcentricVelocity;
    repData.velocityLossPercent = lossInfo.velocityLossPercent;
    repData.lossBand = lossInfo.lossBand;

    if (repData.valid) {
      this.repCount++;
      repData.repNumber = this.repCount;
      this.detectedReps.push(repData);
      if (this.onRepValidated) {
        this.onRepValidated(repData);
      }
    } else {
      this.rejectedReps.push(repData);
      if (this.onRepRejected) {
        this.onRepRejected(repData);
      }
    }

    return repData;
  }
}
