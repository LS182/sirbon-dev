import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { dispatchApiRequest } from './functions/_lib/router'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'cloudflare-pages-functions-dev',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/api')) return next()
          try {
            const origin = `http://${req.headers.host || 'localhost:5173'}`
            const url = new URL(req.url, origin)
            const headers = new Headers()
            for (const [key, value] of Object.entries(req.headers)) {
              if (Array.isArray(value)) {
                for (const item of value) headers.append(key, item)
              } else if (typeof value === 'string') {
                headers.set(key, value)
              }
            }
            const method = req.method || 'GET'
            let body: Uint8Array<ArrayBuffer> | undefined
            if (method !== 'GET' && method !== 'HEAD') {
              const chunks: Buffer[] = []
              for await (const chunk of req) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
              }
              body = new Uint8Array(Buffer.concat(chunks))
            }
            const response = await dispatchApiRequest(
              new Request(url.toString(), { method, headers, body }),
              {},
            )
            res.statusCode = response.status
            response.headers.forEach((val, key) => {
              if (key.toLowerCase() === 'set-cookie') {
                res.setHeader('set-cookie', response.headers.getSetCookie())
              } else {
                res.setHeader(key, val)
              }
            })
            const buffer = Buffer.from(await response.arrayBuffer())
            res.end(buffer)
          } catch (error) {
            next(error)
          }
        })
      },
    },
  ],
})
