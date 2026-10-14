import { describe, it, expect } from 'vitest';
import { DEVICE_FAMILIES } from '../../src/data/devices';

describe('Devices Data Contract (src/data/devices.ts)', () => {
  it('1. Contains exactly the four required device families', () => {
    expect(DEVICE_FAMILIES).toHaveLength(4);
    const families = DEVICE_FAMILIES.map(d => d.deviceFamily);
    expect(families).toContain('Samsung Smart TV');
    expect(families).toContain('LG Smart TV');
    expect(families).toContain('Android TV / Google TV');
    expect(families).toContain('Amazon Fire TV');
  });

  it('2. Associates each family with its genuine operating system/platform', () => {
    const samsung = DEVICE_FAMILIES.find(d => d.deviceFamily === 'Samsung Smart TV');
    const lg = DEVICE_FAMILIES.find(d => d.deviceFamily === 'LG Smart TV');
    const android = DEVICE_FAMILIES.find(d => d.deviceFamily === 'Android TV / Google TV');
    const amazon = DEVICE_FAMILIES.find(d => d.deviceFamily === 'Amazon Fire TV');

    expect(samsung?.platform).toBe('Tizen OS');
    expect(lg?.platform).toBe('webOS');
    expect(android?.platform).toContain('Android TV');
    expect(amazon?.platform).toBe('Fire OS');
  });

  it('3. All families default to verification status (requires_verification or unknown)', () => {
    for (const device of DEVICE_FAMILIES) {
      expect(device.verificationStatus).toBe('requires_verification');
    }
  });

  it('4. Provides verified instructions for checking OS and model for each family', () => {
    for (const device of DEVICE_FAMILIES) {
      expect(device.osCheckInstructions).toBeDefined();
      expect(device.osCheckInstructions.length).toBeGreaterThan(10);
      expect(device.modelCheckInstructions).toBeDefined();
      expect(device.modelCheckInstructions.length).toBeGreaterThan(10);
    }
  });

  it('5. Unpublished guides are undefined until validated', () => {
    for (const device of DEVICE_FAMILIES) {
      // In initial state without approved evidence, no guide URL is published
      expect(device.publishedGuideUrl).toBeUndefined();
    }
  });
});
