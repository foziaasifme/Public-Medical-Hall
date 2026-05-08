import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { DialogProvider } from './DialogContext';
import { checkVersionAndClearCache, registerServiceWorker } from './cacheManager';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Check if there is a new deployment version, and register service worker
checkVersionAndClearCache().then(() => {
  registerServiceWorker();

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <DialogProvider>
          <App />
        </DialogProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
});
