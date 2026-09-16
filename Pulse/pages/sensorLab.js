import { createWidget, widget, prop, align } from '@zos/ui';
import { back } from '@zos/router';
import { SensorManager } from '../core/sensorManager';
import { WorkoutStorage } from '../storage/workoutStorage';
import { mathUtils } from '../utils/math';

Page({
  build() {
    this.sensorManager = new SensorManager();
    
    // UI Layout suitable for Amazfit Active Edge (Round Screen, 360x360)
    createWidget(widget.TEXT, {
      x: 0, y: 24, w: 360, h: 32,
      color: 0x00e676,
      text_size: 20,
      align_h: align.CENTER_H,
      text: 'PHASE 1 SENSOR LAB'
    });
    
    this.accText = createWidget(widget.TEXT, {
       x: 20, y: 64, w: 320, h: 30,
       color: 0x4CAF50, // Green for Acc
       text_size: 16,
       align_h: align.CENTER_H,
       text: 'ACC: X:0 Y:0 Z:0'
    });
    
    this.gyroText = createWidget(widget.TEXT, {
       x: 20, y: 100, w: 320, h: 30,
       color: 0x03A9F4, // Blue for Gyro
       text_size: 16,
       align_h: align.CENTER_H,
       text: 'GYR: X:0 Y:0 Z:0'
    });
    
    this.statsText = createWidget(widget.TEXT, {
       x: 20, y: 136, w: 320, h: 34,
       color: 0xFFC107, // Amber for Stats
       text_size: 16,
       align_h: align.CENTER_H,
       text: 'RATE: 0 Hz | SAMPLES: 0'
    });
    
    this.btnStart = createWidget(widget.BUTTON, {
       x: 35, y: 180, w: 85, h: 38,
       text: 'START',
       color: 0xffffff,
       normal_color: 0x2e7d32,
       press_color: 0x388e3c,
       radius: 19,
       click_func: () => {
          this.sensorManager.startRecording();
          this.errorText.setProperty(prop.MORE, { text: 'Recording...' });
       }
    });
    
    this.btnStop = createWidget(widget.BUTTON, {
       x: 135, y: 180, w: 85, h: 38,
       text: 'STOP',
       color: 0xffffff,
       normal_color: 0xc62828,
       press_color: 0xd32f2f,
       radius: 19,
       click_func: () => {
          this.sensorManager.stopRecording();
          this.errorText.setProperty(prop.MORE, { text: 'Saving data...' });
          const data = this.sensorManager.getData();
          if (data.length > 0) {
              const success = WorkoutStorage.saveData(data);
              if (success) {
                  this.errorText.setProperty(prop.MORE, { text: 'Saved successfully.' });
              } else {
                  this.errorText.setProperty(prop.MORE, { text: 'Unable to record sensor data.' });
              }
          } else {
              this.errorText.setProperty(prop.MORE, { text: 'No data to save.' });
          }
       }
    });
    
    this.btnClear = createWidget(widget.BUTTON, {
       x: 235, y: 180, w: 85, h: 38,
       text: 'CLEAR',
       color: 0xffffff,
       normal_color: 0x424242,
       press_color: 0x616161,
       radius: 19,
       click_func: () => {
          this.sensorManager.clearData();
          this.updateUI(null, this.sensorManager.getStats());
          this.errorText.setProperty(prop.MORE, { text: 'Cleared.' });
       }
    });

    // Return to Pulse Home button
    createWidget(widget.BUTTON, {
       x: 80, y: 230, w: 200, h: 38,
       text: 'RETURN TO PULSE',
       color: 0xffffff,
       normal_color: 0x1f1f1f,
       press_color: 0x333333,
       radius: 19,
       text_size: 14,
       click_func: () => {
          this.cleanup();
          back();
       }
    });
    
    this.errorText = createWidget(widget.TEXT, {
       x: 20, y: 280, w: 320, h: 48,
       color: 0xffeb3b,
       text_size: 13,
       align_h: align.CENTER_H,
       text: 'Phase 1 Sensor Diagnostics Ready'
    });

    const result = this.sensorManager.start((sample, stats) => {
       this.updateUI(sample, stats);
    });
    
    if (result && result.error) {
       this.errorText.setProperty(prop.MORE, { text: result.error });
    }
  },
  
  updateUI(sample, stats) {
     if (sample) {
        // UI rendering is expensive. Throttle updates.
        // Assuming ~50Hz sample rate, updating every 10 samples (5 Hz UI refresh).
        if (stats.numSamples % 10 === 0) {
           this.accText.setProperty(prop.MORE, { 
               text: `ACC X:${sample.ax.toFixed(2)} Y:${sample.ay.toFixed(2)} Z:${sample.az.toFixed(2)}` 
           });
           this.gyroText.setProperty(prop.MORE, { 
               text: `GYR X:${sample.gx.toFixed(2)} Y:${sample.gy.toFixed(2)} Z:${sample.gz.toFixed(2)}` 
           });
           this.statsText.setProperty(prop.MORE, { 
               text: `RATE: ${stats.avgFreq.toFixed(1)}Hz SAMPLES: ${stats.numSamples}` 
           });
        }
     } else {
         this.accText.setProperty(prop.MORE, { text: 'ACC X:0 Y:0 Z:0' });
         this.gyroText.setProperty(prop.MORE, { text: 'GYR X:0 Y:0 Z:0' });
         this.statsText.setProperty(prop.MORE, { text: 'RATE: 0Hz SAMPLES: 0' });
     }
  },

  cleanup() {
     if (this.sensorManager) {
        this.sensorManager.stop();
     }
  },
  
  onDestroy() {
     this.cleanup();
  }
});
