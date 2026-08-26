/**
 * Client-Server Clock Offset Synchronization Helper
 * Eliminates reliance on user local clock for quiz timing.
 */

let serverClockOffsetMs = 0;

export function setServerClockOffset(serverTimeMs, clientSendTimeMs = Date.now()) {
  const now = Date.now();
  const rtt = Math.max(0, now - clientSendTimeMs);
  // Estimated server time at moment of receipt
  const estimatedServerTime = serverTimeMs + Math.round(rtt / 2);
  serverClockOffsetMs = estimatedServerTime - now;
}

export function getServerNow() {
  return Date.now() + serverClockOffsetMs;
}

export function getClockOffset() {
  return serverClockOffsetMs;
}
