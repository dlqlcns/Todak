import { createServer } from 'http';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { pipeline } from 'stream';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, 'dist');
const port = process.env.PORT || 4173;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const pipe = promisify(pipeline);

const sendFile = async (filePath, res) => {
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    res.writeHead(200, { 'Content-Type': contentType });
    await pipe(createReadStream(filePath), res);
  } catch (error) {
    console.error(`Failed to serve file: ${filePath}`, error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    res.end('Internal Server Error');
  }
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    let filePath = path.join(distDir, pathname);
    const hasExtension = path.extname(pathname) !== '';

    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    let fileStats;
    try {
      fileStats = await stat(filePath);
      if (fileStats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        fileStats = await stat(filePath);
      }
    } catch (error) {
      if (hasExtension) {
        console.error(`Asset not found: ${pathname}`, error);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      filePath = path.join(distDir, 'index.html');
      fileStats = await stat(filePath);
    }

    if (fileStats.isFile()) {
      await sendFile(filePath, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
