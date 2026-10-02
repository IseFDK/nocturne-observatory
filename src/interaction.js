/** Direction-gated touch gestures: native vertical scroll, deliberate horizontal orbit. */
export function classifyGesture(dx, dy, threshold = 9, bias = 1.25) {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return 'pending';
  if (Math.abs(dx) > Math.abs(dy) * bias) return 'orbit';
  if (Math.abs(dy) > Math.abs(dx) * bias) return 'scroll';
  return 'pending';
}
export function dragAngle(deltaX, width) {
  return -deltaX / Math.max(width, 160) * Math.PI * 1.2;
}
export function flightCanRun({ enabled, paused, now, manualUntil }) {
  return Boolean(enabled && !paused && now >= manualUntil);
}
export function fitDistance(aspect, { radius = 3.5, fov = 38, minimum = 8.6, maximum = 32 } = {}) {
  const verticalHalf = fov * Math.PI / 360;
  const horizontalHalf = Math.atan(Math.tan(verticalHalf) * Math.max(aspect, .2));
  const distance = radius * 1.08 / Math.sin(Math.min(verticalHalf, horizontalHalf));
  return Math.min(maximum, Math.max(minimum, distance));
}
