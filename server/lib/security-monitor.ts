/**
 * Security Monitoring and Logging System
 * Tracks security events and potential threats
 */

import { Request } from 'express';
import { logger } from './logger';

// Security event types
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_REQUEST = 'SUSPICIOUS_REQUEST',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  ACCOUNT_LOCKOUT = 'ACCOUNT_LOCKOUT',
  CSP_VIOLATION = 'CSP_VIOLATION',
  CORS_VIOLATION = 'CORS_VIOLATION',
  FILE_UPLOAD_VIOLATION = 'FILE_UPLOAD_VIOLATION',
  SESSION_HIJACK_ATTEMPT = 'SESSION_HIJACK_ATTEMPT'
}

// Security event severity levels
export enum SecuritySeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Security event interface
export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  userId?: number;
  email?: string;
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// In-memory store for tracking suspicious activity
class SecurityMonitor {
  private suspiciousIPs = new Map<string, { count: number; lastSeen: Date; events: SecurityEventType[] }>();
  private failedLogins = new Map<string, { count: number; lastAttempt: Date }>();
  private rateLimitViolations = new Map<string, { count: number; lastViolation: Date }>();

  /**
   * Log a security event
   */
  logSecurityEvent(event: SecurityEvent): void {
    // Log to console/file
    logger.warn('Security Event:', {
      type: event.type,
      severity: event.severity,
      message: event.message,
      userId: event.userId,
      email: event.email,
      ip: event.ip,
      userAgent: event.userAgent,
      path: event.path,
      method: event.method,
      timestamp: event.timestamp.toISOString(),
      metadata: event.metadata
    });

    // Track suspicious activity
    this.trackSuspiciousActivity(event);

    // Send alerts for critical events
    if (event.severity === SecuritySeverity.CRITICAL) {
      this.sendSecurityAlert(event);
    }
  }

  /**
   * Track suspicious activity patterns
   */
  private trackSuspiciousActivity(event: SecurityEvent): void {
    const { ip, type } = event;

    // Track suspicious IPs
    if (!this.suspiciousIPs.has(ip)) {
      this.suspiciousIPs.set(ip, { count: 0, lastSeen: new Date(), events: [] });
    }

    const ipData = this.suspiciousIPs.get(ip)!;
    ipData.count++;
    ipData.lastSeen = new Date();
    ipData.events.push(type);

    // Keep only recent events (last 100)
    if (ipData.events.length > 100) {
      ipData.events = ipData.events.slice(-100);
    }

    // Track failed logins
    if (type === SecurityEventType.LOGIN_FAILURE) {
      const key = `${ip}_${event.email || 'unknown'}`;
      if (!this.failedLogins.has(key)) {
        this.failedLogins.set(key, { count: 0, lastAttempt: new Date() });
      }
      const loginData = this.failedLogins.get(key)!;
      loginData.count++;
      loginData.lastAttempt = new Date();
    }

    // Track rate limit violations
    if (type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
      if (!this.rateLimitViolations.has(ip)) {
        this.rateLimitViolations.set(ip, { count: 0, lastViolation: new Date() });
      }
      const rateLimitData = this.rateLimitViolations.get(ip)!;
      rateLimitData.count++;
      rateLimitData.lastViolation = new Date();
    }

    // Check for patterns that indicate attacks
    this.analyzeAttackPatterns(ip, ipData);
  }

  /**
   * Analyze patterns to detect potential attacks
   */
  private analyzeAttackPatterns(ip: string, ipData: { count: number; events: SecurityEventType[] }): void {
    const recentEvents = ipData.events.slice(-20); // Last 20 events
    const eventCounts = recentEvents.reduce((acc, event) => {
      acc[event] = (acc[event] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Detect brute force attacks
    if (eventCounts[SecurityEventType.LOGIN_FAILURE] >= 5) {
      this.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_REQUEST,
        severity: SecuritySeverity.HIGH,
        message: `Potential brute force attack detected from IP ${ip}`,
        ip,
        path: '/auth',
        method: 'POST',
        timestamp: new Date(),
        metadata: { pattern: 'brute_force', failedAttempts: eventCounts[SecurityEventType.LOGIN_FAILURE] }
      });
    }

    // Detect scanning attempts
    if (eventCounts[SecurityEventType.UNAUTHORIZED_ACCESS] >= 10) {
      this.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_REQUEST,
        severity: SecuritySeverity.HIGH,
        message: `Potential scanning attack detected from IP ${ip}`,
        ip,
        path: '/various',
        method: 'GET',
        timestamp: new Date(),
        metadata: { pattern: 'scanning', unauthorizedAttempts: eventCounts[SecurityEventType.UNAUTHORIZED_ACCESS] }
      });
    }

    // Detect injection attempts
    const injectionAttempts = (eventCounts[SecurityEventType.SQL_INJECTION_ATTEMPT] || 0) + 
                             (eventCounts[SecurityEventType.XSS_ATTEMPT] || 0);
    if (injectionAttempts >= 3) {
      this.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_REQUEST,
        severity: SecuritySeverity.CRITICAL,
        message: `Multiple injection attempts detected from IP ${ip}`,
        ip,
        path: '/various',
        method: 'POST',
        timestamp: new Date(),
        metadata: { pattern: 'injection_attack', attempts: injectionAttempts }
      });
    }
  }

  /**
   * Send security alerts for critical events
   */
  private sendSecurityAlert(event: SecurityEvent): void {
    // In a real application, this would send alerts via email, Slack, etc.
    console.error('🚨 CRITICAL SECURITY ALERT 🚨', {
      type: event.type,
      message: event.message,
      ip: event.ip,
      timestamp: event.timestamp.toISOString(),
      metadata: event.metadata
    });

    // TODO: Implement actual alerting mechanism
    // - Send email to security team
    // - Post to Slack channel
    // - Create incident in monitoring system
  }

  /**
   * Check if an IP is suspicious
   */
  isSuspiciousIP(ip: string): boolean {
    const ipData = this.suspiciousIPs.get(ip);
    if (!ipData) return false;

    // Consider IP suspicious if it has many recent security events
    const recentThreshold = Date.now() - (60 * 60 * 1000); // 1 hour
    return ipData.lastSeen.getTime() > recentThreshold && ipData.count > 20;
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    suspiciousIPs: number;
    totalFailedLogins: number;
    totalRateLimitViolations: number;
    recentEvents: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    let recentEvents = 0;
    let totalFailedLogins = 0;
    let totalRateLimitViolations = 0;

    // Count recent suspicious IPs
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.lastSeen.getTime() > oneHourAgo) {
        recentEvents += data.count;
      }
    }

    // Count failed logins
    for (const [key, data] of this.failedLogins.entries()) {
      totalFailedLogins += data.count;
    }

    // Count rate limit violations
    for (const [ip, data] of this.rateLimitViolations.entries()) {
      totalRateLimitViolations += data.count;
    }

    return {
      suspiciousIPs: this.suspiciousIPs.size,
      totalFailedLogins,
      totalRateLimitViolations,
      recentEvents
    };
  }

  /**
   * Clean up old data
   */
  cleanup(): void {
    const now = Date.now();
    const cleanupThreshold = now - (24 * 60 * 60 * 1000); // 24 hours

    // Clean up suspicious IPs
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (data.lastSeen.getTime() < cleanupThreshold) {
        this.suspiciousIPs.delete(ip);
      }
    }

    // Clean up failed logins
    for (const [key, data] of this.failedLogins.entries()) {
      if (data.lastAttempt.getTime() < cleanupThreshold) {
        this.failedLogins.delete(key);
      }
    }

    // Clean up rate limit violations
    for (const [ip, data] of this.rateLimitViolations.entries()) {
      if (data.lastViolation.getTime() < cleanupThreshold) {
        this.rateLimitViolations.delete(ip);
      }
    }
  }
}

// Create singleton instance
export const securityMonitor = new SecurityMonitor();

// Helper function to create security events from requests
export function createSecurityEvent(
  type: SecurityEventType,
  severity: SecuritySeverity,
  message: string,
  req: Request,
  metadata?: Record<string, any>
): SecurityEvent {
  return {
    type,
    severity,
    message,
    userId: (req as any).user?.id,
    email: (req as any).user?.email || req.body?.email,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    timestamp: new Date(),
    metadata
  };
}

// Schedule cleanup every hour
setInterval(() => {
  securityMonitor.cleanup();
}, 60 * 60 * 1000);

export default securityMonitor;
