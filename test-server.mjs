import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import materiasHandler from './api/materias.js';
import adminHandler from './api/admin.js';
import validarPinHandler from './api/validar-pin.js';
import validarPinDocenteHandler from './api/validar-pin-docente.js';
import usuariosHandler from './api/usuarios.js';
import driveHandler from './api/drive.js';

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://fake-supabase-project.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'fake-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fake-service-role-key';
process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'https://portal-educativo-tinteral.vercel.app,http://localhost:3000,http://127.0.0.1:5500';
process.env.DOCENTES_PIN = process.env.DOCENTES_PIN || '1234';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (data) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(data));
    return this;
  };

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  req.query = Object.fromEntries(parsedUrl.searchParams);

  let bodyStr = '';
  for await (const chunk of req) {
    bodyStr += chunk;
  }
  if (bodyStr) {
    try {
      req.body = JSON.parse(bodyStr);
    } catch (e) {
      req.body = bodyStr;
    }
  }

  const pathname = parsedUrl.pathname;

  if (pathname === '/api/materias') return materiasHandler(req, res);
  if (pathname === '/api/admin') return adminHandler(req, res);
  if (pathname === '/api/validar-pin') return validarPinHandler(req, res);
  if (pathname === '/api/validar-pin-docente') return validarPinDocenteHandler(req, res);
  if (pathname === '/api/usuarios') return usuariosHandler(req, res);
  if (pathname === '/api/drive') return driveHandler(req, res);

  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    res.status(404).end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
  fs.createReadStream(filePath).pipe(res);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
