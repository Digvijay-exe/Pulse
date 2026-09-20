import { openSync, writeSync, closeSync, O_WRONLY, O_CREAT } from '@zos/fs';
import { CONSTANTS } from '../utils/constants';

export const WorkoutStorage = {
  writeJson(path, payload) {
    try {
      const jsonString = JSON.stringify(payload);
      // Convert to UTF-8 buffer format for Zepp OS
      const buffer = new ArrayBuffer(jsonString.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < jsonString.length; i++) {
        view[i] = jsonString.charCodeAt(i);
      }
      
      const fd = openSync({
         path,
         // Keep the Phase 1-compatible flags. Some Active Edge firmware builds
         // do not expose O_TRUNC even though it appears in newer type bundles.
         flag: O_WRONLY | O_CREAT
      });
      
      if (fd !== undefined) {
         writeSync({ fd, buffer });
         closeSync({ fd });
         console.log(`Saved data to ${path}`);
         return true;
      }
      return false;
    } catch (e) {
      console.log('Unable to record sensor data:', e);
      return false;
    }
  },

  saveData(data) {
    return this.writeJson(CONSTANTS.STORAGE_FILE_NAME, data);
  },

  saveWorkout(workout) {
    return this.writeJson(CONSTANTS.WORKOUT_STORAGE_FILE_NAME, workout);
  }
};
