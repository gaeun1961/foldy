// 시험용 (커밋하지 않음): /backend 를 이 PC 의 backend(8000)로 대신 전달한다. 휴대폰·다른 포트에서도 CORS 없이 사진 인식을 시험한다
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/backend': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend/, ''),
        configure: (proxy) => proxy.on('proxyReq', (req) => req.removeHeader('origin')),
      },
    },
  },
})
