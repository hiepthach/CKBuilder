import React from 'react'
import ReactDOM from 'react-dom/client'
import { ccc } from '@ckb-ccc/connector-react'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ccc.Provider>
      <App />
    </ccc.Provider>
  </React.StrictMode>,
)
