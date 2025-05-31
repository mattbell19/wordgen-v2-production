import { Document, Schema, model } from 'mongoose';

export interface ArticleQueueItem {
  keyword: string;
  settings: {
    wordCount: number;
    tone: string;
    callToAction?: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  articleId?: string;
}

export interface ArticleQueue extends Document {
  userId: string;
  items: ArticleQueueItem[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
  batchName?: string;
}

const articleQueueItemSchema = new Schema<ArticleQueueItem>({
  keyword: { type: String, required: true },
  settings: {
    wordCount: { type: Number, required: true },
    tone: { type: String, required: true },
    callToAction: { type: String },
  },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  error: { type: String },
  articleId: { type: String },
});

const articleQueueSchema = new Schema<ArticleQueue>({
  userId: { type: String, required: true, index: true },
  items: [articleQueueItemSchema],
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  progress: { type: Number, default: 0 },
  totalItems: { type: Number, required: true },
  completedItems: { type: Number, default: 0 },
  failedItems: { type: Number, default: 0 },
  batchName: { type: String },
  error: { type: String },
  completedAt: { type: Date },
}, {
  timestamps: true,
});

// Add indexes for better query performance
articleQueueSchema.index({ userId: 1, status: 1 });
articleQueueSchema.index({ createdAt: 1 });

export const ArticleQueueModel = model<ArticleQueue>('ArticleQueue', articleQueueSchema);
