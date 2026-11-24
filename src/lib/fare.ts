// Shared by the browser (price preview) and the server (the price that is stored).
export const BASE_FARE = 4.5;
export const RATE_PER_MILE = 1.45;
export const MAX_RIDERS = 4;

const cents = (value: number) => Math.round(value * 100) / 100;

/** Total trip fare the driver receives, and each rider's share of it. */
export function tripFare(distanceMiles: number, riders: number) {
  const total = cents(BASE_FARE + RATE_PER_MILE * Math.max(0, distanceMiles));
  return { total, perRider: cents(total / Math.max(1, riders)) };
}
