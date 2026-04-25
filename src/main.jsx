import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppWrapper from './App.jsx'
import AnalyticsRouteTracker from './components/common/AnalyticsRouteTracker.jsx'
import './index.css'

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <AnalyticsRouteTracker />
        <AppWrapper />
      </BrowserRouter>
    </React.StrictMode>
  );
}
