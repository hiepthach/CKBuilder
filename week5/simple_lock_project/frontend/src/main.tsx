import React from 'react'
import ReactDOM from 'react-dom/client'
import { ccc } from '@ckb-ccc/connector-react'
import App from './App.tsx'
import './index.css'

console.log("main.tsx is running");
console.log("Root element:", document.getElementById("root"));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ccc.Provider>
      <App />
    </ccc.Provider>
  </React.StrictMode>,
)
