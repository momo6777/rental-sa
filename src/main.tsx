import { Buffer as BufferPolyfill } from 'buffer';
(window as any).Buffer = BufferPolyfill;
(globalThis as any).Buffer = BufferPolyfill;

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);