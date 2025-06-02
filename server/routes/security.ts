/**
 * Security-related routes
 * Handles CSP violations, security reports, and monitoring endpoints
 */

import { Router } from 'express';
import { Request, Response } from 'express';
import ApiResponse from '../lib/api-response';
import { securityMonitor, SecurityEventType, SecuritySeverity, createSecurityEvent } from '../lib/security-monitor';
import { requireAdmin } from '../middleware/authMiddleware';

const router = Router();

/**
 * CSP violation reporting endpoint
 */
router.post('/csp-report', (req: Request, res: Response) => {
  try {
    const report = req.body;
    
    // Log CSP violation
    console.warn('CSP Violation Report:', {
      documentUri: report['document-uri'],
      violatedDirective: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
      columnNumber: report['column-number'],
      originalPolicy: report['original-policy'],
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // Create security event
    const securityEvent = createSecurityEvent(
      SecurityEventType.CSP_VIOLATION,
      SecuritySeverity.MEDIUM,
      `CSP violation: ${report['violated-directive']} blocked ${report['blocked-uri']}`,
      req,
      {
        documentUri: report['document-uri'],
        violatedDirective: report['violated-directive'],
        blockedUri: report['blocked-uri'],
        sourceFile: report['source-file'],
        lineNumber: report['line-number'],
        columnNumber: report['column-number']
      }
    );

    securityMonitor.logSecurityEvent(securityEvent);

    // Return 204 No Content as per CSP specification
    res.status(204).send();
  } catch (error) {
    console.error('Error processing CSP report:', error);
    res.status(204).send(); // Still return 204 to not break CSP reporting
  }
});

/**
 * Security statistics endpoint (admin only)
 */
router.get('/stats', requireAdmin, (req: Request, res: Response) => {
  try {
    const stats = securityMonitor.getSecurityStats();
    
    return ApiResponse.success(res, {
      ...stats,
      timestamp: new Date().toISOString()
    }, 'Security statistics retrieved successfully');
  } catch (error) {
    console.error('Error retrieving security stats:', error);
    return ApiResponse.error(res, 500, 'Failed to retrieve security statistics', 'STATS_ERROR');
  }
});

/**
 * Check if IP is suspicious (admin only)
 */
router.get('/check-ip/:ip', requireAdmin, (req: Request, res: Response) => {
  try {
    const { ip } = req.params;
    
    if (!ip || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip)) {
      return ApiResponse.badRequest(res, 'Invalid IP address format', 'INVALID_IP');
    }

    const isSuspicious = securityMonitor.isSuspiciousIP(ip);
    
    return ApiResponse.success(res, {
      ip,
      suspicious: isSuspicious,
      timestamp: new Date().toISOString()
    }, 'IP check completed');
  } catch (error) {
    console.error('Error checking IP:', error);
    return ApiResponse.error(res, 500, 'Failed to check IP', 'IP_CHECK_ERROR');
  }
});

/**
 * Health check endpoint for security monitoring
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const stats = securityMonitor.getSecurityStats();
    
    // Determine health status based on security metrics
    let status = 'healthy';
    let warnings = [];

    if (stats.recentEvents > 100) {
      status = 'warning';
      warnings.push('High number of recent security events');
    }

    if (stats.suspiciousIPs > 50) {
      status = 'warning';
      warnings.push('High number of suspicious IPs');
    }

    if (stats.totalFailedLogins > 1000) {
      status = 'critical';
      warnings.push('Very high number of failed login attempts');
    }

    return ApiResponse.success(res, {
      status,
      warnings,
      stats,
      timestamp: new Date().toISOString()
    }, 'Security health check completed');
  } catch (error) {
    console.error('Error in security health check:', error);
    return ApiResponse.error(res, 500, 'Security health check failed', 'HEALTH_CHECK_ERROR');
  }
});

/**
 * Manual security event logging endpoint (admin only)
 */
router.post('/log-event', requireAdmin, (req: Request, res: Response) => {
  try {
    const { type, severity, message, metadata } = req.body;

    if (!type || !severity || !message) {
      return ApiResponse.badRequest(res, 'Type, severity, and message are required', 'MISSING_FIELDS');
    }

    // Validate event type and severity
    if (!Object.values(SecurityEventType).includes(type)) {
      return ApiResponse.badRequest(res, 'Invalid security event type', 'INVALID_EVENT_TYPE');
    }

    if (!Object.values(SecuritySeverity).includes(severity)) {
      return ApiResponse.badRequest(res, 'Invalid security severity', 'INVALID_SEVERITY');
    }

    const securityEvent = createSecurityEvent(
      type as SecurityEventType,
      severity as SecuritySeverity,
      message,
      req,
      metadata
    );

    securityMonitor.logSecurityEvent(securityEvent);

    return ApiResponse.success(res, {
      eventLogged: true,
      timestamp: new Date().toISOString()
    }, 'Security event logged successfully');
  } catch (error) {
    console.error('Error logging security event:', error);
    return ApiResponse.error(res, 500, 'Failed to log security event', 'LOG_EVENT_ERROR');
  }
});

/**
 * Security configuration endpoint (admin only)
 */
router.get('/config', requireAdmin, (req: Request, res: Response) => {
  try {
    const config = {
      environment: process.env.NODE_ENV,
      securityHeaders: {
        csp: 'enabled',
        hsts: process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled',
        xssProtection: 'enabled',
        contentTypeOptions: 'enabled',
        frameOptions: 'enabled'
      },
      rateLimiting: {
        auth: 'enabled',
        api: 'enabled',
        strict: 'enabled'
      },
      monitoring: {
        securityEvents: 'enabled',
        suspiciousIpTracking: 'enabled',
        failedLoginTracking: 'enabled'
      },
      validation: {
        inputSanitization: 'enabled',
        sqlInjectionPrevention: 'enabled',
        xssPrevention: 'enabled',
        fileUploadValidation: 'enabled'
      }
    };

    return ApiResponse.success(res, config, 'Security configuration retrieved');
  } catch (error) {
    console.error('Error retrieving security config:', error);
    return ApiResponse.error(res, 500, 'Failed to retrieve security configuration', 'CONFIG_ERROR');
  }
});

export default router;
