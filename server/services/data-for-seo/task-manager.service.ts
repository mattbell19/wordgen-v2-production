/**
 * SEO Audit Task Manager Service
 * 
 * This service provides task management capabilities for SEO audit tasks, including:
 * - Task creation and persistence
 * - Status monitoring and updating
 * - Task queuing for rate limiting
 * - Automatic retry for failed tasks
 * - Task cleanup for completed or expired tasks
 */

import { SeoAuditService, SeoAuditStatus } from './seo-audit.service';

// In-memory storage for tasks (replace with database in production)
const taskStore = new Map();

// Queue configuration
const QUEUE_PROCESSING_INTERVAL = 60000; // Process queue every minute
const MAX_CONCURRENT_TASKS = 5; // Maximum number of concurrent tasks
const TASK_MONITOR_INTERVAL = 300000; // Check task status every 5 minutes
const TASK_EXPIRY_TIME = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const RETRY_DELAY = 3 * 60 * 1000; // 3 minutes between retries
const MAX_RETRY_ATTEMPTS = 3; // Maximum number of retry attempts

// Task queue
let taskQueue: string[] = [];
let runningTasks = 0;
let isProcessingQueue = false;
let queueInterval: NodeJS.Timeout | null = null;
let monitorInterval: NodeJS.Timeout | null = null;

/**
 * Task with additional management metadata
 */
interface ManagedTask {
  id: string;
  taskId?: string;
  userId: number;
  target: string;
  status: SeoAuditStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  lastCheckedAt?: Date;
  progress?: number;
  error?: string;
  retryCount: number;
  priority: number;
  options: any;
  // Additional fields for task management
  queuedAt?: Date;
  startedAt?: Date;
  nextRetryAt?: Date;
  expiresAt: Date;
}

/**
 * Task Manager Service for SEO Audit tasks
 */
class TaskManagerService {
  private seoAuditService: any;

  constructor() {
    this.seoAuditService = new SeoAuditService();
    this.startQueueProcessor();
    this.startTaskMonitor();
  }

  /**
   * Initialize the task manager service
   * This should be called on application startup
   */
  initialize() {
    this.startQueueProcessor();
    this.startTaskMonitor();
    console.log('SEO Audit Task Manager initialized');
  }

  /**
   * Shutdown the task manager service
   * This should be called before application shutdown
   */
  shutdown() {
    if (queueInterval) {
      clearInterval(queueInterval);
      queueInterval = null;
    }
    
    if (monitorInterval) {
      clearInterval(monitorInterval);
      monitorInterval = null;
    }
    
    console.log('SEO Audit Task Manager shut down');
  }

  /**
   * Create a new SEO audit task and add it to the queue
   * 
   * @param target Website URL to analyze
   * @param userId User ID who created the task
   * @param options Task options
   * @param priority Task priority (higher number = higher priority)
   * @returns Created task with ID
   */
  async createTask(target: string, userId: number, options: any = {}, priority: number = 1): Promise<ManagedTask> {
    // Create a new task with management metadata
    const task: ManagedTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      target,
      status: SeoAuditStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      priority,
      options,
      queuedAt: new Date(),
      expiresAt: new Date(Date.now() + TASK_EXPIRY_TIME),
    };

    // Store the task
    taskStore.set(task.id, task);

    // Add task to the queue
    this.enqueueTask(task);

    return task;
  }

  /**
   * Get a task by ID
   * 
   * @param taskId Task ID
   * @returns Task if found, null otherwise
   */
  getTask(taskId: string): ManagedTask | null {
    return taskStore.get(taskId) || null;
  }

  /**
   * Get all tasks for a user
   * 
   * @param userId User ID
   * @returns Array of tasks for the user
   */
  getUserTasks(userId: number): ManagedTask[] {
    const userTasks: ManagedTask[] = [];
    
    taskStore.forEach((task) => {
      if (task.userId === userId) {
        userTasks.push(task);
      }
    });
    
    return userTasks;
  }

  /**
   * Cancel a task
   * 
   * @param taskId Task ID
   * @returns true if task was canceled, false if not found or already completed
   */
  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.getTask(taskId);
    
    if (!task) {
      return false;
    }
    
    // If the task is already completed or failed, we can't cancel it
    if (task.status === SeoAuditStatus.COMPLETED || task.status === SeoAuditStatus.FAILED) {
      return false;
    }
    
    // If the task has a DataForSEO task ID, try to cancel it
    if (task.taskId) {
      try {
        await this.seoAuditService.cancelAuditTask(task.taskId);
      } catch (error) {
        console.error(`Failed to cancel DataForSEO task ${task.taskId}:`, error);
      }
    }
    
    // Update task status
    task.status = SeoAuditStatus.FAILED;
    task.error = 'Task canceled by user';
    task.updatedAt = new Date();
    taskStore.set(task.id, task);
    
    // Remove from queue if it's there
    taskQueue = taskQueue.filter(queuedTaskId => queuedTaskId !== task.id);
    
    return true;
  }

  /**
   * Delete a task and its data
   * 
   * @param taskId Task ID
   * @returns true if task was deleted, false if not found
   */
  deleteTask(taskId: string): boolean {
    const task = this.getTask(taskId);
    
    if (!task) {
      return false;
    }
    
    // Remove from store
    taskStore.delete(taskId);
    
    // Remove from queue if it's there
    taskQueue = taskQueue.filter(queuedTaskId => queuedTaskId !== taskId);
    
    return true;
  }

  /**
   * Start the queue processor
   * This will process tasks in the queue at regular intervals
   */
  private startQueueProcessor() {
    if (queueInterval) {
      clearInterval(queueInterval);
    }
    
    queueInterval = setInterval(() => {
      this.processQueue();
    }, QUEUE_PROCESSING_INTERVAL);
  }

  /**
   * Start the task monitor
   * This will check the status of running tasks at regular intervals
   */
  private startTaskMonitor() {
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }
    
    monitorInterval = setInterval(() => {
      this.monitorTasks();
    }, TASK_MONITOR_INTERVAL);
  }

  /**
   * Process the task queue
   * This will start new tasks if there are slots available
   */
  private async processQueue() {
    if (isProcessingQueue || taskQueue.length === 0 || runningTasks >= MAX_CONCURRENT_TASKS) {
      return;
    }
    
    isProcessingQueue = true;
    
    try {
      // Sort queue by priority (higher first) and then by creation time (older first)
      const sortedQueue = [...taskQueue].sort((a, b) => {
        const taskA = taskStore.get(a);
        const taskB = taskStore.get(b);
        
        if (taskA.priority !== taskB.priority) {
          return taskB.priority - taskA.priority;
        }
        
        return taskA.queuedAt.getTime() - taskB.queuedAt.getTime();
      });
      
      // Process as many tasks as we can
      while (sortedQueue.length > 0 && runningTasks < MAX_CONCURRENT_TASKS) {
        const taskId = sortedQueue.shift();
        const task = taskStore.get(taskId);
        
        if (!task) {
          // Task was deleted, remove from queue
          taskQueue = taskQueue.filter(id => id !== taskId);
          continue;
        }
        
        // Check if it's time to retry failed tasks
        if (task.status === SeoAuditStatus.FAILED && task.nextRetryAt) {
          if (task.nextRetryAt.getTime() > Date.now()) {
            // Not time to retry yet
            continue;
          }
        }
        
        // Start the task
        this.startTask(task);
        
        // Remove from queue
        taskQueue = taskQueue.filter(id => id !== taskId);
        
        // Increment running tasks count
        runningTasks++;
      }
    } catch (error) {
      console.error('Error processing task queue:', error);
    } finally {
      isProcessingQueue = false;
    }
  }

  /**
   * Monitor running tasks
   * This will check the status of running tasks and update accordingly
   */
  private async monitorTasks() {
    try {
      // Find all running tasks
      // Use Array.from to convert Map entries to array for compatibility
      Array.from(taskStore.entries()).forEach(async ([taskId, task]) => {
        if (task.status === SeoAuditStatus.IN_PROGRESS || task.status === SeoAuditStatus.PENDING) {
          if (task.taskId) {
            await this.updateTaskStatus(task);
          }
        }
        
        // Check for expired tasks
        if (task.expiresAt && task.expiresAt.getTime() < Date.now()) {
          // Keep completed tasks for reference, but remove pending/failed tasks
          if (task.status !== SeoAuditStatus.COMPLETED) {
            console.log(`Task ${taskId} expired, removing from store`);
            taskStore.delete(taskId);
          }
        }
      });
    } catch (error) {
      console.error('Error monitoring tasks:', error);
    }
  }

  /**
   * Add a task to the queue
   * 
   * @param task Task to add to the queue
   */
  private enqueueTask(task: ManagedTask) {
    taskQueue.push(task.id);
    console.log(`Task ${task.id} added to queue. Queue length: ${taskQueue.length}`);
  }

  /**
   * Start a task execution
   * 
   * @param task Task to start
   */
  private async startTask(task: ManagedTask) {
    try {
      console.log(`Starting task ${task.id} for target ${task.target}`);
      
      // Update task status
      task.status = SeoAuditStatus.IN_PROGRESS;
      task.startedAt = new Date();
      task.updatedAt = new Date();
      taskStore.set(task.id, task);
      
      // Create the actual audit task
      const auditTask = await this.seoAuditService.createAuditTask(
        task.target,
        task.userId,
        task.options
      );
      
      // Update task with DataForSEO task ID
      task.taskId = auditTask.taskId;
      task.updatedAt = new Date();
      taskStore.set(task.id, task);
      
      console.log(`Task ${task.id} started with DataForSEO task ID ${task.taskId}`);
    } catch (error) {
      console.error(`Error starting task ${task.id}:`, error);
      
      // Handle failed task start
      this.handleTaskFailure(task, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Update the status of a task
   * 
   * @param task Task to update
   */
  private async updateTaskStatus(task: ManagedTask) {
    try {
      // Don't check too frequently
      if (task.lastCheckedAt && Date.now() - task.lastCheckedAt.getTime() < 60000) {
        return;
      }
      
      console.log(`Checking status for task ${task.id} (DataForSEO task ID: ${task.taskId})`);
      
      // Get the status from the SEO audit service
      const result = await this.seoAuditService.getAuditStatus(task.taskId);
      
      // Update task with the latest status
      task.status = result.status;
      task.progress = result.progress;
      task.lastCheckedAt = new Date();
      task.updatedAt = new Date();
      
      // Handle task completion
      if (task.status === SeoAuditStatus.COMPLETED) {
        task.completedAt = new Date();
        runningTasks--;
        console.log(`Task ${task.id} completed`);
      }
      
      // Handle task failure
      if (task.status === SeoAuditStatus.FAILED) {
        this.handleTaskFailure(task, result.error || 'Unknown error');
      }
      
      // Save updated task
      taskStore.set(task.id, task);
    } catch (error) {
      console.error(`Error checking status for task ${task.id}:`, error);
      
      // If we can't check the status, consider it a temporary failure
      // We don't mark the task as failed yet, will retry checking the status
      task.lastCheckedAt = new Date();
      task.updatedAt = new Date();
      taskStore.set(task.id, task);
    }
  }

  /**
   * Handle a task failure
   * 
   * @param task Failed task
   * @param errorMessage Error message
   */
  private handleTaskFailure(task: ManagedTask, errorMessage: string) {
    task.error = errorMessage;
    
    // Check if we should retry
    if (task.retryCount < MAX_RETRY_ATTEMPTS) {
      task.retryCount++;
      task.status = SeoAuditStatus.PENDING;
      task.nextRetryAt = new Date(Date.now() + RETRY_DELAY * task.retryCount);
      
      console.log(`Task ${task.id} failed, will retry (${task.retryCount}/${MAX_RETRY_ATTEMPTS}) at ${task.nextRetryAt}`);
      
      // Add back to queue
      this.enqueueTask(task);
    } else {
      // Max retries reached, mark as permanently failed
      task.status = SeoAuditStatus.FAILED;
      runningTasks--;
      
      console.log(`Task ${task.id} permanently failed after ${MAX_RETRY_ATTEMPTS} retries: ${errorMessage}`);
    }
    
    task.updatedAt = new Date();
    taskStore.set(task.id, task);
  }

  /**
   * Clean up old tasks
   * This will remove tasks that are older than the expiry time
   */
  async cleanupTasks() {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Use Array.from to convert Map entries to array for compatibility
    Array.from(taskStore.entries()).forEach(([taskId, task]) => {
      if (task.expiresAt && task.expiresAt.getTime() < now) {
        taskStore.delete(taskId);
        cleanedCount++;
      }
    });
    
    console.log(`Cleaned up ${cleanedCount} expired tasks`);
    return cleanedCount;
  }
}

// Export singleton instance
const taskManager = new TaskManagerService();
export { taskManager, TaskManagerService }; 