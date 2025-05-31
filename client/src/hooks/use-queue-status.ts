import { useState, useEffect, useCallback } from 'react';

interface QueueItem {
  id: number;
  keyword: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  articleId?: number;
}

interface Queue {
  id: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  progress: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface QueueStatusResponse {
  ok: boolean;
  queue: Queue;
  items: QueueItem[];
  articles: any[];
}

export function useQueueStatus(queueId: number | null) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const fetchQueueStatus = useCallback(async () => {
    if (!queueId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bulk/queue/${queueId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/auth';
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch queue status');
      }
      
      const data: QueueStatusResponse = await response.json();
      
      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch queue status');
      }
      
      setQueue(data.queue);
      setItems(data.items || []);
      setArticles(data.articles || []);
      
      // Continue polling if the queue is still processing
      return data.queue.status === 'pending' || data.queue.status === 'processing';
    } catch (error: any) {
      setError(error.message || 'Failed to fetch queue status');
      return false;
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  const startPolling = useCallback(() => {
    if (!queueId || isPolling) return;
    
    setIsPolling(true);
    
    const poll = async () => {
      const shouldContinue = await fetchQueueStatus();
      
      if (shouldContinue) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      } else {
        setIsPolling(false);
      }
    };
    
    poll();
  }, [queueId, fetchQueueStatus, isPolling]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  // Start polling when queueId changes
  useEffect(() => {
    if (queueId) {
      startPolling();
    }
    
    return () => {
      stopPolling();
    };
  }, [queueId, startPolling, stopPolling]);

  return {
    queue,
    items,
    articles,
    loading,
    error,
    isPolling,
    startPolling,
    stopPolling,
    refresh: fetchQueueStatus
  };
}
