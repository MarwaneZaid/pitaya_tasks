import { describe, it, expect } from 'vitest';
import {
  slugFromRestaurantName,
  emailFromRestaurantName,
  domainFromEmail,
  AUTH_DOMAIN,
} from './authPrefs.js';

describe('authPrefs', () => {
  it('slugFromRestaurantName normalizes accents and spaces', () => {
    expect(slugFromRestaurantName('Café Node20')).toBe('cafe-node20');
  });

  it('emailFromRestaurantName uses default domain', () => {
    expect(emailFromRestaurantName('Pitaya Lyon')).toBe(`pitaya-lyon@${AUTH_DOMAIN}`);
  });

  it('domainFromEmail handles host with dots', () => {
    expect(domainFromEmail('user@restaurant.dailydo.app')).toBe('restaurant.dailydo.app');
  });
});
