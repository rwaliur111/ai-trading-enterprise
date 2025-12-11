// src/infrastructure/security/security-manager.ts
export class SecurityManager {
  private static instance: SecurityManager;
  
  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  validateEncryptionKey(key: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(key);
  }

  generateSecureKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}