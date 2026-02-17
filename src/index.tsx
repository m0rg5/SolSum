import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Sol Sum: Initializing mount...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Sol Sum: Could not find root element to mount to");
} else {
  console.log("Sol Sum: Found root element, mounting React...");
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("Sol Sum: Render called successfully.");
  } catch (err) {
    console.error("Sol Sum: Error during React mount:", err);
    rootElement.innerHTML = `<div style="color: red; padding: 20px;">Mount Error: ${err.message}</div>`;
  }
}