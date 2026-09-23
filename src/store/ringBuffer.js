// Fixed-capacity numeric ring buffer backing the HUD sparklines.
// Mutated in place; consumers re-render on a version counter, not on the data.

export function createRingBuffer(cap) {
  const data = new Float32Array(cap);
  let head = 0;
  let len = 0;

  return {
    cap,
    get length() { return len; },
    push(v) {
      data[head] = v;
      head = (head + 1) % cap;
      if (len < cap) len++;
    },
    /** i = 0 is the oldest sample. */
    at(i) { return data[(head - len + i + cap) % cap]; },
    last() { return len ? data[(head - 1 + cap) % cap] : NaN; },
    prev() { return len > 1 ? data[(head - 2 + cap) % cap] : NaN; },
    minMax() {
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < len; i++) {
        const v = this.at(i);
        if (v < min) min = v;
        if (v > max) max = v;
      }
      return [min, max];
    },
    clear() { head = 0; len = 0; },
  };
}
