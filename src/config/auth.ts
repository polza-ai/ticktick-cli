import axios from 'axios';
import { createServer, type Server } from 'node:http';

const AUTH_URL = 'https://ticktick.com/oauth/authorize';
const TOKEN_URL = 'https://ticktick.com/oauth/token';
const REDIRECT_URI = 'http://localhost:18321/callback';
const SCOPE = 'tasks:read tasks:write';

export function buildAuthUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SCOPE,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state: Math.random().toString(36).slice(2),
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  refresh_token?: string;
}

export async function exchangeCode(
  clientId: string,
  clientSecret: string,
  code: string,
): Promise<TokenResponse> {
  const { data } = await axios.post<TokenResponse>(TOKEN_URL, new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret,
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const { data } = await axios.post<TokenResponse>(TOKEN_URL, new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export function waitForAuthCode(timeoutMs: number = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    let server: Server;
    const timer = setTimeout(() => {
      server?.close();
      reject(new Error('Таймаут: не получен код авторизации.'));
    }, timeoutMs);

    server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', `http://localhost:18321`);
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body><h2>Авторизация успешна! Можете закрыть эту вкладку.</h2></body></html>');
          clearTimeout(timer);
          server.close();
          resolve(code);
        } else {
          const errorMsg = (url.searchParams.get('error') ?? 'unknown').replace(/[<>&"']/g, c => `&#${c.charCodeAt(0)};`);
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body><h2>Ошибка: ${errorMsg}</h2></body></html>`);
          clearTimeout(timer);
          server.close();
          reject(new Error(`OAuth error: ${errorMsg}`));
        }
      }
    });

    server.listen(18321, () => {});
    server.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
