export const mathUtils = {
  magnitude(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);
  },

  clamp(val, min, max) {
    if (isNaN(val)) return min;
    return Math.min(Math.max(val, min), max);
  },

  median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    }
    return (sorted[mid - 1] + sorted[mid]) / 2;
  },

  mean(arr) {
    if (!arr || arr.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum += arr[i];
    }
    return sum / arr.length;
  },

  variance(arr) {
    if (!arr || arr.length < 2) return 0;
    const m = this.mean(arr);
    let sumSq = 0;
    for (let i = 0; i < arr.length; i++) {
      const diff = arr[i] - m;
      sumSq += diff * diff;
    }
    return sumSq / arr.length;
  },

  stdDev(arr) {
    return Math.sqrt(this.variance(arr));
  },

  round(val, decimals = 2) {
    if (isNaN(val) || !isFinite(val)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }
};
