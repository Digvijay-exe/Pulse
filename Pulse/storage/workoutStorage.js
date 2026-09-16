import { openSync, writeSync, readSync, statSync, closeSync, O_WRONLY, O_CREAT, O_RDONLY } from '@zos/fs';
import { CONSTANTS } from '../utils/constants';

export const WorkoutStorage = {
  /**
   * Save complete workout set and its individual repetitions
   */
  saveWorkoutSet(setRecord) {
    try {
      const existing = this.getAllWorkouts();
      existing.unshift(setRecord); // Most recent first

      // Keep up to 30 sets locally on device
      const trimmed = existing.slice(0, 30);
      const jsonString = JSON.stringify(trimmed);

      return this._writeString(CONSTANTS.STORAGE_FILE_NAME, jsonString);
    } catch (e) {
      console.log('Unable to save workout set:', e);
      return false;
    }
  },

  /**
   * Get all stored workout sets
   */
  getAllWorkouts() {
    try {
      const jsonStr = this._readString(CONSTANTS.STORAGE_FILE_NAME);
      if (!jsonStr) return [];
      return JSON.parse(jsonStr);
    } catch (e) {
      console.log('Error reading workouts:', e);
      return [];
    }
  },

  /**
   * Save calibrated baseline
   */
  saveBaseline(baseline) {
    try {
      const jsonString = JSON.stringify(baseline);
      return this._writeString(CONSTANTS.CALIBRATION_FILE_NAME, jsonString);
    } catch (e) {
      console.log('Unable to save baseline:', e);
      return false;
    }
  },

  /**
   * Get saved baseline
   */
  getBaseline() {
    try {
      const jsonStr = this._readString(CONSTANTS.CALIBRATION_FILE_NAME);
      if (!jsonStr) return null;
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  },

  /**
   * Backward compatible Phase 1 raw data saver
   */
  saveData(data) {
    try {
      const jsonString = JSON.stringify(data);
      return this._writeString(CONSTANTS.DEBUG_LOG_FILE, jsonString);
    } catch (e) {
      return false;
    }
  },

  _writeString(fileName, str) {
    const buffer = new ArrayBuffer(str.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i);
    }

    const fd = openSync({
      path: fileName,
      flag: O_WRONLY | O_CREAT
    });

    if (fd !== undefined && fd >= 0) {
      writeSync({ fd, buffer });
      closeSync({ fd });
      return true;
    }
    return false;
  },

  _readString(fileName) {
    try {
      const stat = statSync({ path: fileName });
      if (!stat || !stat.size) return null;

      const buffer = new ArrayBuffer(stat.size);
      const fd = openSync({
        path: fileName,
        flag: O_RDONLY
      });

      if (fd !== undefined && fd >= 0) {
        readSync({ fd, buffer });
        closeSync({ fd });

        const view = new Uint8Array(buffer);
        let str = '';
        for (let i = 0; i < view.length; i++) {
          str += String.fromCharCode(view[i]);
        }
        return str;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
};
