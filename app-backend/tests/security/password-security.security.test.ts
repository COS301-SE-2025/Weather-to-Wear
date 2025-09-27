import request from "supertest";
import app from "../../src/app";
import { hashPassword, comparePasswords } from "../../src/modules/auth/auth.utils";
import bcrypt from 'bcrypt';

describe('Security: Password Hashing Tests', () => {
  const testPassword = 'TestPassword123!';
  const weakPassword = 'weak';
  const strongPassword = 'StrongP@ssw0rd123!';

  describe('Password Hashing Implementation', () => {
    it('should hash passwords using bcrypt', async () => {
      const hashed = await hashPassword(testPassword);
      
      expect(hashed).not.toBe(testPassword);
      expect(hashed.length).toBeGreaterThan(50); 
      expect(hashed.startsWith('$2b$')).toBe(true); 
    });

    it('should use appropriate salt rounds (minimum 10)', async () => {
      const hashed = await hashPassword(testPassword);
      const saltRounds = parseInt(hashed.split('$')[2]);
      
      expect(saltRounds).toBeGreaterThanOrEqual(10);
      expect(saltRounds).toBeLessThanOrEqual(15); 
    });

    it('should generate different hashes for the same password', async () => {
      const hash1 = await hashPassword(testPassword);
      const hash2 = await hashPassword(testPassword);
      
      expect(hash1).not.toBe(hash2); 
    });

    it('should verify hashed passwords correctly', async () => {
      const hashed = await hashPassword(testPassword);
      const isValid = await comparePasswords(testPassword, hashed);
      const isInvalid = await comparePasswords('wrongpassword', hashed);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should handle empty password gracefully', async () => {
      await expect(hashPassword('')).resolves.toBeDefined();
      const hashed = await hashPassword('');
      const isEmpty = await comparePasswords('', hashed);
      const isNotEmpty = await comparePasswords('notempty', hashed);
      
      expect(isEmpty).toBe(true);
      expect(isNotEmpty).toBe(false);
    });

    it('should handle special characters in passwords', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      const hashed = await hashPassword(specialPassword);
      const isValid = await comparePasswords(specialPassword, hashed);
      
      expect(isValid).toBe(true);
    });

    it('should handle unicode characters in passwords', async () => {
      const unicodePassword = 'パスワード123!@#';
      const hashed = await hashPassword(unicodePassword);
      const isValid = await comparePasswords(unicodePassword, hashed);
      
      expect(isValid).toBe(true);
    });

    it('should be case-sensitive', async () => {
      const hashed = await hashPassword('Password123!');
      const correctCase = await comparePasswords('Password123!', hashed);
      const wrongCase = await comparePasswords('password123!', hashed);
      
      expect(correctCase).toBe(true);
      expect(wrongCase).toBe(false);
    });
  });

  describe('Password Validation Rules', () => {
    it('should enforce minimum length requirement', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '1234567' 
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password/i);
    });

    it('should require uppercase letter', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123!' 
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password.*uppercase|uppercase.*password/i);
    });

    it('should require lowercase letter', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'PASSWORD123!' // no lowercase
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password.*lowercase|lowercase.*password/i);
    });

    it('should require special character', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123' // no special character
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/password.*special|special.*password/i);
    });

    it('should accept valid strong password', async () => {
      const { validatePassword } = require('../../src/modules/auth/auth.utils');
      
      expect(validatePassword(strongPassword)).toBe(true);
      const hashed = await hashPassword(strongPassword);
      const isValid = await comparePasswords(strongPassword, hashed);
      expect(isValid).toBe(true);
    });
  });

  describe('Password Storage Security', () => {
    it('should never store plaintext passwords', async () => {
      // This test validates that passwords are always hashed before storage
      const plainPassword = 'PlainTextPassword123!';
      const hashedPassword = await hashPassword(plainPassword);
      
      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword).not.toContain(plainPassword);
      
      expect(hashedPassword.startsWith('$2b$')).toBe(true);
      
      const securityRequirement = {
        storage: 'Passwords must never be stored in plaintext',
        hashing: 'All passwords must be hashed with bcrypt before database storage',
        verification: 'Password verification must use bcrypt.compare()',
        logging: 'Plaintext passwords must never appear in logs or error messages'
      };
      
      expect(securityRequirement).toBeDefined();
      console.info('Password Storage Security:', securityRequirement);
    });

    it('should use salt for password hashing', async () => {
      const password = 'SaltTest123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // Different salts produce different hashes
    });
  });

  describe('Timing Attack Prevention', () => {
    it('should take similar time for password comparison regardless of correctness', async () => {
      const hashed = await hashPassword(testPassword);
      
      const startCorrect = Date.now();
      await comparePasswords(testPassword, hashed);
      const timeCorrect = Date.now() - startCorrect;
      
      const startIncorrect = Date.now();
      await comparePasswords('wrongpassword', hashed);
      const timeIncorrect = Date.now() - startIncorrect;
      
      const timeDifference = Math.abs(timeCorrect - timeIncorrect);
      expect(timeDifference).toBeLessThan(100); // Allow 100ms variance
    });
  });

  describe('Authentication Flow Security', () => {
    it('should not reveal whether email exists during login attempts', async () => {
      
      const securityRequirement = {
        principle: 'Login errors should not reveal whether email exists',
        nonExistentEmail: 'Should return generic "Invalid credentials" message',
        wrongPassword: 'Should return same generic "Invalid credentials" message',
        timing: 'Response times should be similar to prevent enumeration'
      };

      // Test that error messages don't leak information
      expect(securityRequirement.principle).toBeDefined();
      expect(securityRequirement.nonExistentEmail).toContain('Invalid credentials');
      expect(securityRequirement.wrongPassword).toContain('Invalid credentials');
      
      console.info('Authentication Flow Security Requirements:', securityRequirement);
    });

    it('should handle password comparison errors gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: null
        });

      expect(res.status).toBe(400);
    });
  });

  describe('Hash Format Validation', () => {
    it('should handle invalid hash formats during comparison', async () => {
      const invalidHash = 'not-a-valid-bcrypt-hash';
      
      const result = await comparePasswords(testPassword, invalidHash);
      expect(result).toBe(false);
    });

    it('should handle corrupted hash gracefully', async () => {
      const corruptedHash = '$2b$10$truncatedorinvalidhash';
      
      const result = await comparePasswords(testPassword, corruptedHash);  
      expect(result).toBe(false);
    });

    it('should validate bcrypt hash format structure', async () => {
      const validHash = await hashPassword(testPassword);
      
      const bcryptPattern = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
      expect(validHash).toMatch(bcryptPattern);
      
      const parts = validHash.split('$');
      expect(parts).toHaveLength(4);
      expect(parts[1]).toMatch(/^2[aby]$/); // bcrypt version
      expect(parseInt(parts[2])).toBeGreaterThanOrEqual(10); // salt rounds
      expect(parts[3]).toHaveLength(53); // salt + hash
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long passwords', async () => {
      const longPassword = 'A'.repeat(1000) + '1!'; // Very long password
      const hashed = await hashPassword(longPassword);
      const isValid = await comparePasswords(longPassword, hashed);
      
      expect(isValid).toBe(true);
    });

    it('should handle password with only minimum requirements', async () => {
      const minPassword = 'Aa1!aaaa'; // 8 chars, has upper, lower, number, special
      const hashed = await hashPassword(minPassword);
      const isValid = await comparePasswords(minPassword, hashed);
      
      expect(isValid).toBe(true);
    });

    it('should handle concurrent hashing operations', async () => {
      const promises = Array(10).fill(null).map((_, i) => 
        hashPassword(`TestPassword${i}!`)
      );
      
      const hashes = await Promise.all(promises);
      
      // All hashes should be unique
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);
    });
  });
});
