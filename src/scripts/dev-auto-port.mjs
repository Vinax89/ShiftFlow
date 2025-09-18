import {createServer} from 'net';
import {spawn} from 'child_process';

const findFreePort = (start) =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findFreePort(start + 1).then(resolve, reject);
      } else {
        reject(err);
      }
    });
    server.listen(start, '0.0.0.0', () => {
      const {port} = server.address();
      server.close(() => resolve(port));
    });
  });

async function main() {
  try {
    const port = await findFreePort(9002);
    console.log(`Found free port: ${port}`);
    const child = spawn(
      'next',
      ['dev', '-p', port, '-H', '0.0.0.0'],
      {stdio: 'inherit', shell: true}
    );

    child.on('close', (code) => {
      process.exit(code);
    });
  } catch (err) {
    console.error('Could not find a free port.', err);
    process.exit(1);
  }
}

main();
