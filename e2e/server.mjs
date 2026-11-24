import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const portFlag = process.argv.indexOf('--port')
const PORT = Number(portFlag !== -1 ? process.argv[portFlag + 1] : process.env.PORT || 8080)

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    let pathname = decodeURIComponent(url.pathname)
    if (pathname === '/') pathname = '/index.html'

    const filePath = normalize(join(ROOT, pathname))
    if (filePath !== ROOT && !filePath.startsWith(`${ROOT}\\`) && !filePath.startsWith(`${ROOT}/`)) {
      res.writeHead(403).end('Forbidden')
      return
    }

    const info = await stat(filePath).catch(() => null)
    if (!info || !info.isFile()) {
      res.writeHead(404).end('Not found')
      return
    }

    const data = await readFile(filePath)
    res.writeHead(200, {
      'content-type': MIME[extname(filePath)] || 'application/octet-stream',
      'cache-control': 'no-store'
    })
    res.end(data)
  } catch {
    res.writeHead(500).end('Server error')
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Casa de cambio en http://127.0.0.1:${PORT}`)
})
