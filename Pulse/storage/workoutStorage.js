import { openSync, writeSync, closeSync, O_WRONLY, O_CREAT } from '@zos/fs';
import { CONSTANTS } from '../utils/constants';

export const WorkoutStorage = {
  saveData(data) {
    try {
      const jsonString = JSON.stringify(data);
      // Convert to UTF-8 buffer format for Zepp OS
      const buffer = new ArrayBuffer(jsonString.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < jsonString.length; i++) {
        view[i] = jsonString.charCodeAt(i);
      }
      
      const fd = openSync({
         path: CONSTANTS.STORAGE_FILE_NAME,
         flag: O_WRONLY | O_CREAT
      });
      
      if (fd !== undefined) {
         writeSync({ fd, buffer });
         closeSync({ fd });
         console.log(`Saved ${data.length} samples to ${CONSTANTS.STORAGE_FILE_NAME}`);
         return true;
      }
      return false;
    } catch (e) {
      console.log('Unable to record sensor data:', e);
      return false;
    }
  }
};
