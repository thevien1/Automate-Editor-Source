import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ProjectProvider } from './context/ProjectContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ProjectProvider>
        <App />
      </ProjectProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
