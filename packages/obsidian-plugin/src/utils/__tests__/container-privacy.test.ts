import { describe, it, expect } from 'vitest';
import { isContainerPublic } from '../container-privacy';

describe('isContainerPublic', () => {
  it('should return false if privacy is private', () => {
    expect(isContainerPublic({ id: 'cont-1', name: 'My Vault', privacy: 'private' })).toBe(false);
  });

  it('should return false if visibility is private', () => {
    expect(isContainerPublic({ id: 'cont-1', name: 'My Vault', visibility: 'private' })).toBe(false);
  });

  it('should return false if isPublic is false', () => {
    expect(isContainerPublic({ id: 'cont-1', name: 'My Vault', isPublic: false })).toBe(false);
  });

  it('should return true if privacy is public', () => {
    expect(isContainerPublic({ id: 'cont-1', name: 'My Vault', privacy: 'public' })).toBe(true);
  });

  it('should return true if visibility is public', () => {
    expect(isContainerPublic({ id: 'cont-1', name: 'My Vault', visibility: 'public' })).toBe(true);
  });

  it('should return true if isPublic is true', () => {
    expect(isContainerPublic({ id: 'cont-1', name: 'My Vault', isPublic: true })).toBe(true);
  });

  it('should return false for user key vaults without explicit public indicator', () => {
    expect(isContainerPublic({ id: 'asdkdkjdjdjdjdjdjdjddjdjda', name: 'asdkdkjdjdjdjdjdjdjddjdjda' })).toBe(false);
    expect(isContainerPublic({ id: 'asd1111111111111111', name: 'asd1111111111111111' })).toBe(false);
    expect(isContainerPublic({ id: 'testeststaa12333333', name: 'testeststaa12333333' })).toBe(false);
    expect(isContainerPublic({ id: 'lenta_obs_12345', name: 'User Key Vault' })).toBe(false);
  });

  it('should return true for standard presets, master feeds, and pub keys', () => {
    expect(isContainerPublic({ id: 'main-git-vault', name: 'Main Git Vault' })).toBe(true);
    expect(isContainerPublic({ id: 'simple-notes', name: 'Simple Notes Vault' })).toBe(true);
    expect(isContainerPublic({ id: 'feed-all', name: 'Master Feed' })).toBe(true);
    expect(isContainerPublic({ id: 'cont-lenta_jwt_pub_8klsytli_mt8aln56', name: 'Public Vault' })).toBe(true);
  });
});
