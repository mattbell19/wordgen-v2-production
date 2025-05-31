/**
 * Application startup tasks
 * This module handles tasks that need to be run when the application starts.
 */

import { taskManager } from './services/data-for-seo/task-manager.service';
import { gscService } from './services/gsc.service';

/**
 * Initialize all application services
 */
export function initializeServices() {
  console.log('Initializing application services...');

  // Initialize SEO audit task manager
  taskManager.initialize();

  console.log('Application services initialized successfully.');
}

/**
 * Clean up application resources before shutdown
 */
export function cleanupServices() {
  console.log('Cleaning up application resources...');

  // Shutdown SEO audit task manager
  taskManager.shutdown();

  console.log('Application resources cleaned up successfully.');
}

/**
 * Schedule periodic cleanup tasks
 */
export function scheduleCleanupTasks() {
  // Run task cleanup every 24 hours
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  setInterval(async () => {
    console.log('Running scheduled cleanup tasks...');

    try {
      // Clean up expired SEO audit tasks
      const cleanedTasks = await taskManager.cleanupTasks();
      console.log(`Cleaned up ${cleanedTasks} expired SEO audit tasks.`);

      // Clean up expired GSC cache entries
      await gscService.cleanupExpiredCache();
    } catch (error) {
      console.error('Error running scheduled cleanup tasks:', error);
    }

    console.log('Scheduled cleanup tasks completed.');
  }, CLEANUP_INTERVAL);

  console.log('Scheduled cleanup tasks have been set up.');
}