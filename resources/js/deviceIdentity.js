import fpPromise from '@fingerprintjs/fingerprintjs';

const DEVICE_FINGERPRINT_KEY = 'wonten_teka_device_fingerprint';

/**
 * Returns the browser identity used when the device was first bound.
 * FingerprintJS may produce a different visitorId after a browser restart or
 * privacy-setting change, so the approved value must be persisted locally.
 * Backend status checks still scope it to the authenticated employee.
 */
export const getDeviceFingerprint = async () => {
    const stored = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
    if (stored) return stored;

    const fp = await fpPromise.load();
    const result = await fp.get();
    localStorage.setItem(DEVICE_FINGERPRINT_KEY, result.visitorId);
    return result.visitorId;
};

export const saveDeviceFingerprint = (fingerprint) => {
    if (fingerprint) localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
};
