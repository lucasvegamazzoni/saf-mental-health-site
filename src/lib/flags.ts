/**
 * Feature flags — the "Must" set for v1 (decided with Lucas 2026-08-27, LUC-67):
 * hero + emergency, check-in, timeline, resources, stories (read + share).
 * Everything else is built and kept, just not shown yet. Flip to true to re-enable.
 */
export const FEATURES = {
  companion: false,   // "Talk it through" guided companion (LUC-77)
  polls: false,       // weekly shared poll on the home page (LUC-76)
  recognition: false, // recognition wall (LUC-76)
  challenges: false,  // growth challenges tab on Me (LUC-71)
  trends: false,      // /trends aggregate view (LUC-78)
  qrTree: true,       // blossom-tree QR on the home page (LUC-84/91)
  glassButtons: false, // glass texture on every button (LUC-89) — tried 2026-08-27, Lucas preferred the solid buttons; flip to true to re-enable
} as const;

export type FeatureKey = keyof typeof FEATURES;
export const isOn = (key: FeatureKey): boolean => FEATURES[key];
