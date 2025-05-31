import { router } from './trpc';
import { stripeRouter } from './routes/stripe';
import { userRouter } from './routes/user';
import { articlesRouter } from './routes/articles';
import { projectsRouter } from './routes/projects';
import { adminRouter } from './routes/admin';

// Create the root router
export const appRouter = router({
  user: userRouter,
  stripe: stripeRouter,
  articles: articlesRouter,
  projects: projectsRouter,
  admin: adminRouter,
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter; 