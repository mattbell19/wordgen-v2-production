/**
 * Logger utility for consistent application logging
 */

// Log levels in order of severity
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

interface LogOptions {
  level?: LogLevel;
  context?: string;
  data?: Record<string, any>;
  timestamp?: boolean;
  error?: Error;
}

// Default options
const defaultOptions: LogOptions = {
  level: LogLevel.INFO,
  context: 'app',
  timestamp: true
};

/**
 * Format a log message with consistent structure
 */
function formatLogMessage(message: string, options: LogOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  const timestamp = opts.timestamp ? `[${new Date().toISOString()}]` : '';
  const level = `[${opts.level?.toUpperCase()}]`;
  const context = opts.context ? `[${opts.context}]` : '';
  
  return `${timestamp} ${level} ${context} ${message}`;
}

/**
 * Format object data for logging
 */
function formatData(data: any): string {
  if (!data) return '';
  try {
    return JSON.stringify(data, null, process.env.NODE_ENV === 'development' ? 2 : 0);
  } catch (error) {
    return `[Unserializable data: ${error instanceof Error ? error.message : 'Unknown error'}]`;
  }
}

/**
 * Main logger class
 */
class Logger {
  private minLevel: LogLevel = process.env.NODE_ENV === 'production' 
    ? LogLevel.INFO 
    : LogLevel.DEBUG;

  /**
   * Log a debug message
   */
  debug(message: string, options: Omit<LogOptions, 'level'> = {}) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(formatLogMessage(message, { ...options, level: LogLevel.DEBUG }));
      if (options.data) console.debug(formatData(options.data));
    }
  }

  /**
   * Log an info message
   */
  info(message: string, options: Omit<LogOptions, 'level'> = {}) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(formatLogMessage(message, { ...options, level: LogLevel.INFO }));
      if (options.data) console.info(formatData(options.data));
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, options: Omit<LogOptions, 'level'> = {}) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(formatLogMessage(message, { ...options, level: LogLevel.WARN }));
      if (options.data) console.warn(formatData(options.data));
    }
  }

  /**
   * Log an error message
   */
  error(message: string, options: Omit<LogOptions, 'level'> = {}) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(formatLogMessage(message, { ...options, level: LogLevel.ERROR }));
      
      // Log additional error details if provided
      if (options.error) {
        const err = options.error;
        console.error(`Error: ${err.name} - ${err.message}`);
        if (err.stack) console.error(`Stack: ${err.stack}`);
      }
      
      if (options.data) console.error(formatData(options.data));
    }
  }

  /**
   * Log a fatal error message
   */
  fatal(message: string, options: Omit<LogOptions, 'level'> = {}) {
    if (this.shouldLog(LogLevel.FATAL)) {
      console.error(formatLogMessage(message, { ...options, level: LogLevel.FATAL }));
      
      // Log additional error details if provided
      if (options.error) {
        const err = options.error;
        console.error(`Error: ${err.name} - ${err.message}`);
        if (err.stack) console.error(`Stack: ${err.stack}`);
      }
      
      if (options.data) console.error(formatData(options.data));
    }
  }

  /**
   * Determine if a message should be logged based on level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const minLevelIndex = levels.indexOf(this.minLevel);
    const currentLevelIndex = levels.indexOf(level);
    
    return currentLevelIndex >= minLevelIndex;
  }

  /**
   * Set the minimum log level
   */
  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }
}

// Create a singleton instance
export const logger = new Logger();

export default logger; 