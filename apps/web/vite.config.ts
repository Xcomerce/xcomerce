import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Evita duas cópias de React no bundle (quebra hooks: useEffect of null)
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@keve/shared': path.resolve(__dirname, '../../packages/shared/src'),
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
    },
  },
  server: {
    port: 5173,
  },
})
