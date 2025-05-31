import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Add PostHog to window type
declare global {
  interface Window {
    posthog?: any;
  }
}

// Initialize app without PostHog first
const initApp = async () => {
  try {
    // Only load PostHog if it's not already initialized
    if (!window.posthog) {
      const [{ default: posthog }, { PostHogProvider }] = await Promise.all([
        import('posthog-js'),
        import('posthog-js/react')
      ]);

      const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
      const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

      // Initialize PostHog only if both key and host are available
      if (posthogKey && posthogHost) {
        posthog.init(posthogKey, {
          api_host: posthogHost,
          loaded: (ph) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('PostHog initialized successfully');
            }
          },
          bootstrap: {
            distinctID: 'anonymous-user'
          }
        });

        createRoot(document.getElementById("root")!).render(
          <StrictMode>
            <PostHogProvider client={posthog}>
              <App />
            </PostHogProvider>
          </StrictMode>
        );
        return;
      }
    }

    // Load app without PostHog if it's already initialized or credentials are missing
    console.log('Loading app without PostHog');
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (error) {
    console.error('Failed to initialize PostHog:', error);

    // Load app without PostHog if it fails
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
};

initApp();