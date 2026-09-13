import { createWidget, widget, prop, align } from '@zos/ui';
import { SensorManager } from '../core/sensorManager';
import { WorkoutStorage } from '../storage/workoutStorage';
import { mathUtils } from '../utils/math';

Page({
  build() {
    this.sensorManager = new SensorManager();
    
    // UI Layout suitable for Amazfit Active Edge (Round Screen, typ. 360x360)
    
    createWidget(widget.TEXT, {
      x: 0, y: 30, w: 360, h: 40,
      color: 0xffffff,
      text_size: 24,
      align_h: align.CENTER_H,
      text: 'PULSE SENSOR LAB'
    });
    
    this.accText = createWidget(widget.TEXT, {
       x: 20, y: 80, w: 320, h: 30,
       color: 0x4CAF50, // Green for Acc
       text_size: 18,
       align_h: align.CENTER_H,
       text: 'ACC: X:0 Y:0 Z:0'
    });
    
    this.gyroText = createWidget(widget.TEXT, {
       x: 20, y: 120, w: 320, h: 30,
       color: 0x03A9F4, // Blue for Gyro
       text_size: 18,
       align_h: align.CENTER_H,
       text: 'GYR: X:0 Y:0 Z:0'
    });
    
    this.statsText = createWidget(widget.TEXT, {
       x: 20, y: 160, w: 320, h: 40,
       color: 0xFFC107, // Amber for Stats
       text_size: 18,
       align_h: align.CENTER_H,
       text: 'RATE: 0 Hz | SAMPLES: 0'
    });
    
    this.btnStart = createWidget(widget.BUTTON, {
       x: 40, y: 220, w: 80, h: 40,
       text: 'START',
       color: 0xffffff,
       normal_color: 0x333333,
       press_color: 0x555555,
       click_func: () => {
          this.sensorManager.startRecording();
          this.errorText.setProperty(prop.MORE, { text: 'Recording...' });
       }
    });
    
    this.btnStop = createWidget(widget.BUTTON, {
       x: 140, y: 220, w: 80, h: 40,
       text: 'STOP',
       color: 0xffffff,
       normal_color: 0x333333,
       press_color: 0x555555,
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
       x: 240, y: 220, w: 80, h: 40,
       text: 'CLEAR',
       color: 0xffffff,
       normal_color: 0x333333,
       press_color: 0x555555,
       click_func: () => {
          this.sensorManager.clearData();
          this.updateUI(null, this.sensorManager.getStats());
          this.errorText.setProperty(prop.MORE, { text: 'Cleared.' });
       }
    });
    
    this.errorText = createWidget(widget.TEXT, {
       x: 20, y: 280, w: 320, h: 60,
       color: 0xff0000,
       text_size: 16,
       align_h: align.CENTER_H,
       text: 'Waiting to start.'
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
  
  onDestroy() {
     if (this.sensorManager) {
        this.sensorManager.stop();
     }
  }
});
