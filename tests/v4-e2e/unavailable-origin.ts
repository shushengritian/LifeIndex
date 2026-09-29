import http from 'node:http'
import https from 'node:https'

export async function createUnavailableOrigin(upstreamUrl: string) {
  const upstream = new URL(upstreamUrl)
  let available = true
  let refused = 0
  const server = http.createServer((request, response) => {
    // Reject at the transport boundary, including service-worker requests; browser route mocks cannot do that reliably.
    if (!available) {
      refused++
      request.socket.destroy()
      return
    }
    const forwarded = (upstream.protocol === 'https:' ? https : http).request(
      {
        hostname: upstream.hostname,
        port: upstream.port || (upstream.protocol === 'https:' ? 443 : 80),
        path: request.url,
        method: request.method,
        headers: { ...request.headers, host: upstream.host },
      },
      (result) => {
        response.writeHead(result.statusCode ?? 502, result.headers)
        result.pipe(response)
      },
    )
    forwarded.on('error', () => {
      console.warn('v4.qa.origin.upstream-unavailable', { transport: upstream.protocol })
      response.writeHead(502)
      response.end()
    })
    request.pipe(forwarded)
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Synthetic proxy address unavailable')
  return {
    origin: `http://127.0.0.1:${address.port}`,
    disconnect: () => {
      available = false
      console.info('v4.qa.origin.disconnected', { transport: 'tcp-refusal' })
    },
    get refused() {
      return refused
    },
    close: async () => {
      server.closeAllConnections()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
    },
  }
}
