/** Shared motion tokens. Keep durations short so lists and charts stay snappy. */
export const MOTION = {
  /** Screen / card enter */
  enter: 220,
  /** Press scale down */
  pressIn: 80,
  /** Press release */
  pressOut: 140,
  /** Lock-screen biometric pulse half-cycle */
  pulse: 900,
  /** Native-stack fade */
  stack: 200,
} as const;

export const PRESS_SCALE = 0.97;
export const PULSE_SCALE = 1.06;
