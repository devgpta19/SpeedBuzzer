/**
 * Generates or retrieves a persistent unique Device ID for this browser / client.
 * This ensures different devices on the same WiFi network are properly differentiated.
 */
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('sb_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('sb_device_id', deviceId);
  }
  return deviceId;
}
