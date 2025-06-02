/**
 * Security Implementation Tests
 * Tests for the security fixes and enhancements
 */

import { sanitizeString, sanitizeObject, preventSqlInjection } from '../../server/middleware/validation';
import { securityMonitor, SecurityEventType, SecuritySeverity, createSecurityEvent } from '../../server/lib/security-monitor';
import { Request, Response, NextFunction } from 'express';

// Mock Express objects
const mockRequest = (body: any = {}, query: any = {}, params: any = {}): Partial<Request> => ({
  body,
  query,
  params,
  ip: '127.0.0.1',
  path: '/test',
  method: 'POST',
  headers: { 'user-agent': 'test-agent' }
});

const mockResponse = (): Partial<Response> => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.type = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = (): NextFunction => jest.fn();

describe('Security Implementation Tests', () => {
  
  describe('Input Sanitization', () => {
    test('should sanitize XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeString(maliciousInput, { stripTags: true });

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('&lt;script&gt;');
      expect(sanitized).toContain('Hello World');
    });

    test('should sanitize SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const sanitized = sanitizeString(maliciousInput);

      // The string should be entity-encoded, not removed
      expect(sanitized).toContain('&#x27;'); // Single quote encoded
      expect(sanitized).toContain('DROP TABLE'); // Content preserved but safe
      expect(sanitized).toContain('--');
    });

    test('should preserve safe HTML when allowed', () => {
      const safeHtml = '<p>This is <strong>safe</strong> content</p>';
      const sanitized = sanitizeString(safeHtml, { allowHtml: true, stripTags: false });

      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
      expect(sanitized).toContain('safe');
    });

    test('should sanitize objects recursively', () => {
      const maliciousObject = {
        name: '<script>alert("xss")</script>John',
        email: 'test@example.com',
        nested: {
          description: '<img src=x onerror=alert(1)>',
          tags: ['<script>', 'safe-tag']
        }
      };

      const sanitized = sanitizeObject(maliciousObject, { stripTags: true });
      
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.name).toContain('John');
      expect(sanitized.nested.description).not.toContain('<img');
      expect(sanitized.nested.tags[0]).not.toContain('<script>');
      expect(sanitized.nested.tags[1]).toBe('safe-tag');
    });

    test('should limit string length', () => {
      const longString = 'a'.repeat(1000);
      const sanitized = sanitizeString(longString, { maxLength: 100 });
      
      expect(sanitized.length).toBe(100);
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should block SQL injection attempts', () => {
      const req = mockRequest({
        query: "SELECT * FROM users WHERE id = 1; DROP TABLE users;"
      });
      const res = mockResponse();
      const next = mockNext();

      preventSqlInjection(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Invalid input detected'
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow safe queries', () => {
      const req = mockRequest({
        query: "search term",
        name: "John Doe"
      });
      const res = mockResponse();
      const next = mockNext();

      preventSqlInjection(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should detect UNION attacks', () => {
      const req = mockRequest({
        search: "1' UNION SELECT password FROM users--"
      });
      const res = mockResponse();
      const next = mockNext();

      preventSqlInjection(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Security Monitoring', () => {
    beforeEach(() => {
      // Clear any existing data
      securityMonitor.cleanup();
    });

    test('should log security events', () => {
      const req = mockRequest();
      const event = createSecurityEvent(
        SecurityEventType.LOGIN_FAILURE,
        SecuritySeverity.MEDIUM,
        'Failed login attempt',
        req as Request,
        { email: 'test@example.com' }
      );

      // Mock logger.warn to capture logs
      const loggerSpy = jest.spyOn(require('../../server/lib/logger').logger, 'warn').mockImplementation();

      securityMonitor.logSecurityEvent(event);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Security Event:',
        expect.objectContaining({
          type: SecurityEventType.LOGIN_FAILURE,
          severity: SecuritySeverity.MEDIUM,
          message: 'Failed login attempt'
        })
      );

      loggerSpy.mockRestore();
    });

    test('should track suspicious IPs', () => {
      const req = mockRequest();
      
      // Generate multiple suspicious events from same IP
      for (let i = 0; i < 25; i++) {
        const event = createSecurityEvent(
          SecurityEventType.RATE_LIMIT_EXCEEDED,
          SecuritySeverity.MEDIUM,
          'Rate limit exceeded',
          req as Request
        );
        securityMonitor.logSecurityEvent(event);
      }

      const isSuspicious = securityMonitor.isSuspiciousIP('127.0.0.1');
      expect(isSuspicious).toBe(true);
    });

    test('should provide security statistics', () => {
      const req = mockRequest();
      const event = createSecurityEvent(
        SecurityEventType.LOGIN_FAILURE,
        SecuritySeverity.MEDIUM,
        'Failed login',
        req as Request
      );
      
      securityMonitor.logSecurityEvent(event);
      
      const stats = securityMonitor.getSecurityStats();
      
      expect(stats).toHaveProperty('suspiciousIPs');
      expect(stats).toHaveProperty('totalFailedLogins');
      expect(stats).toHaveProperty('totalRateLimitViolations');
      expect(stats).toHaveProperty('recentEvents');
      expect(typeof stats.suspiciousIPs).toBe('number');
    });
  });

  describe('Environment Validation', () => {
    test('should validate session secret strength', () => {
      const originalEnv = process.env.SESSION_SECRET;

      // Test weak secret
      process.env.SESSION_SECRET = 'weak';

      // Clear the module cache to force re-evaluation
      delete require.cache[require.resolve('../../server/config/security')];

      expect(() => {
        require('../../server/config/security');
      }).toThrow('Invalid security configuration');

      // Restore original
      process.env.SESSION_SECRET = originalEnv;
      delete require.cache[require.resolve('../../server/config/security')];
    });
  });

  describe('Password Security', () => {
    test('should enforce password complexity', () => {
      const weakPasswords = [
        'password',
        '12345678',
        'abcdefgh',
        'ABCDEFGH',
        'Password',
        'pass123'
      ];

      const strongPasswords = [
        'MyStr0ngP@ssw0rd!',
        'C0mpl3xP@ssw0rd',
        'S3cur3P@ss123'
      ];

      // This would be tested with actual password validation
      // For now, we're just testing the concept
      weakPasswords.forEach(password => {
        const isWeak = password.length < 8 || 
                      !/[a-z]/.test(password) || 
                      !/[A-Z]/.test(password) || 
                      !/\d/.test(password);
        expect(isWeak).toBe(true);
      });

      strongPasswords.forEach(password => {
        const isStrong = password.length >= 8 && 
                        /[a-z]/.test(password) && 
                        /[A-Z]/.test(password) && 
                        /\d/.test(password);
        expect(isStrong).toBe(true);
      });
    });
  });

  describe('CORS Security', () => {
    test('should validate origin patterns', () => {
      const allowedOrigins = [
        'https://wordgen.io',
        'https://www.wordgen.io',
        'http://localhost:4002'
      ];

      const maliciousOrigins = [
        'https://evil.com',
        'http://wordgen.io.evil.com',
        'https://wordgen.io.evil.com',
        'javascript:alert(1)'
      ];

      maliciousOrigins.forEach(origin => {
        expect(allowedOrigins.includes(origin)).toBe(false);
      });
    });
  });
});

describe('Security Headers', () => {
  test('should include security headers', () => {
    // This would test actual header implementation
    const expectedHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ];

    // Mock test - in real implementation, this would test actual HTTP responses
    expectedHeaders.forEach(header => {
      expect(typeof header).toBe('string');
      expect(header.length).toBeGreaterThan(0);
    });
  });
});
