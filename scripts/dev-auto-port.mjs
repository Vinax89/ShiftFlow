import { spawn } from 'child_process';
import { createServer } from 'net';

async function findOpenPort(start = 3000, end = 4000) {
  for (let port = start; port < end; port++) {
    try {
      await new Promise((resolve, reject) => {
        const server = createServer();
        server.unref();
        server.on('error', reject);
        server.listen({ port }, () => {
          server.close(() => resolve(port));
        });
      });
      return port;
    } catch (e) {
      if (e.code !== 'EADDRINUSE') throw e;
    }
  }
  throw new Error('No open ports found');
}

async function main() {
  try {
    const port = await findOpenPort();
    console.log(`[dev-auto-port] Found open port: ${port}. Starting Next.js dev server...`);

    const env = { 
      ...process.env, 
      PORT: String(port),
      NEXT_PUBLIC_BASE_URL: `http://localhost:${port}`,
    };
    
    // Check if turbopack is disabled via env var in package.json script
    const useTurbo = process.env.NEXT_DISABLE_TURBOPACK !== '1';
    
    const args = ['dev', '-p', String(port), '-H', '0.0.0.0'];
    if (useTurbo) {
        args.push('--turbopack');
    }

    const child = spawn('next', args, { stdio: 'inherit', env });

    child.on('close', (code) => {
      process.exit(code ?? 1);
    });
  } catch (err) {
    console.error('[dev-auto-port] Error:', err);
    process.exit(1);
  }
}

main();
