export const mathUtils = {
  magnitude(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);
  },

  averageVector(samples) {
    if (!samples || !samples.length) return null;
    let x = 0; let y = 0; let z = 0;
    for (let i = 0; i < samples.length; i += 1) {
      if (!samples[i] || !this.isFiniteNumber(samples[i].x) || !this.isFiniteNumber(samples[i].y) || !this.isFiniteNumber(samples[i].z)) continue;
      x += samples[i].x; y += samples[i].y; z += samples[i].z;
    }
    return { x: x / samples.length, y: y / samples.length, z: z / samples.length };
  },

  angleBetweenVectors(first, second) {
    if (!first || !second) return 0;
    const firstMagnitude = this.magnitude(first.x, first.y, first.z);
    const secondMagnitude = this.magnitude(second.x, second.y, second.z);
    if (!this.isFiniteNumber(firstMagnitude) || !this.isFiniteNumber(secondMagnitude) || firstMagnitude <= 0 || secondMagnitude <= 0) return 0;
    const dot = first.x * second.x + first.y * second.y + first.z * second.z;
    const cosine = this.clamp(dot / (firstMagnitude * secondMagnitude), -1, 1);
    return Math.acos(cosine) * (180 / Math.PI);
  },

  isFiniteNumber(value) {
    return typeof value === 'number' && isFinite(value);
  },

  clamp(value, min, max) {
    if (!this.isFiniteNumber(value)) return min;
    return Math.max(min, Math.min(max, value));
  },

  median(values) {
    const valid = values.filter((value) => this.isFiniteNumber(value)).sort((a, b) => a - b);
    if (!valid.length) return 0;
    const middle = Math.floor(valid.length / 2);
    return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
  },

  medianAbsoluteDeviation(values, medianValue) {
    const center = this.isFiniteNumber(medianValue) ? medianValue : this.median(values);
    return this.median(values.map((value) => Math.abs(value - center)));
  },

  mean(values) {
    const valid = values.filter((value) => this.isFiniteNumber(value));
    if (!valid.length) return 0;
    return valid.reduce((total, value) => total + value, 0) / valid.length;
  },

  similarity(value, baseline, tolerance) {
    if (!this.isFiniteNumber(value) || !this.isFiniteNumber(baseline) || tolerance <= 0) return 0;
    return this.clamp(1 - Math.abs(value - baseline) / tolerance, 0, 1);
  }
};
