import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './webPush';

describe('webPush', () => {
  it('urlBase64ToUint8Array decodes VAPID-style key', () => {
    const encoded = btoa(String.fromCharCode(1, 2, 3, 4))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const bytes = urlBase64ToUint8Array(encoded);
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });
});
