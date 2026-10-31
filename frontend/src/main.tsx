import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App.tsx'

// 3D 화면의 글자는 캔버스에 한 번 그려지므로 Pretendard 를 받은 뒤에 띄운다. 못 받으면 시스템 글꼴로 그냥 띄운다
document.fonts
  .load("16px 'Pretendard Variable'", '가A1')
  .catch(() => {})
  .finally(() =>
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
