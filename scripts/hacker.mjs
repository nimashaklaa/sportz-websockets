/**
 * Arcjet stress test script
 *
 * Tests:
 *  1. Rate limit (HTTP)  — floods GET /matches to trigger 429
 *  2. Bot detection      — sends requests with a known bot user-agent
 *  3. Shield             — sends a request with SQL injection in the body
 *  4. Rate limit (WS)    — opens many WebSocket connections rapidly to trigger WS rate limit
 *
 * Usage:
 *   node scripts/hacker.mjs [base_url]
 *   node scripts/hacker.mjs http://localhost:8000
 */

import { createServer } from 'http';
import { WebSocket } from 'ws';

const BASE = process.argv[2] ?? 'http://localhost:8000';
const WS_BASE = BASE.replace('http', 'ws');

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

function log(label, status, message) {
  const color = status >= 500 ? RED : status >= 400 ? YELLOW : GREEN;
  console.log(`  ${color}[${status}]${RESET} ${label.padEnd(12)} ${message}`);
}

async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  return res;
}

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return res;
}

// ─── Test 1: HTTP Rate Limit ────────────────────────────────────────────────

async function testRateLimit() {
  console.log(`\n${BOLD}${CYAN}[1] HTTP Rate Limit — firing 60 requests (limit is 50 per 10s)${RESET}`);

  let allowed = 0;
  let blocked = 0;

  const requests = Array.from({ length: 60 }, (_, i) =>
    get('/matches').then(res => {
      if (res.status === 429) blocked++;
      else allowed++;
      if (i === 0 || i === 49 || i === 59) log(`req #${i + 1}`, res.status, res.statusText);
    })
  );

  await Promise.all(requests);
  console.log(`  → allowed: ${GREEN}${allowed}${RESET}  blocked: ${YELLOW}${blocked}${RESET}`);
}

// ─── Test 2: Bot Detection ──────────────────────────────────────────────────
// Note: Arcjet uses more than User-Agent — it fingerprints TLS settings and
// header ordering. All requests from Node fetch look identical regardless of
// the User-Agent header, so results here may not reflect real bot blocking.

async function testBotDetection() {
  console.log(`\n${BOLD}${CYAN}[2] Bot Detection — sending known bot user-agents${RESET}`);
  console.log(`  ${YELLOW}(Note: Node fetch has same TLS fingerprint regardless of User-Agent)${RESET}`);

  const bots = [
    'curl/7.68.0',
    'python-requests/2.28.0',
    'Go-http-client/1.1',
    'Googlebot/2.1',
    'Twitterbot/1.0',
  ];

  for (const ua of bots) {
    const res = await get('/matches', { 'User-Agent': ua });
    log(ua.split('/')[0], res.status, ua);
  }
}

// ─── Test 3: Shield — Injection Attempts ────────────────────────────────────
// Shield inspects the URL path and query params, not the JSON body.
// Payloads must be in the query string to trigger it.

async function testShield() {
  console.log(`\n${BOLD}${CYAN}[3] Shield — sending malicious payloads in query params${RESET}`);

  const attacks = [
    {
      label: 'SQL injection',
      path: "/matches?search=' OR 1=1; DROP TABLE matches; --",
      headers: {},
    },
    {
      label: 'XSS',
      path: '/matches?q=<script>alert(1)</script>',
      headers: {},
    },
    {
      label: 'Path traversal',
      path: '/matches?file=../../etc/passwd',
      headers: {},
    },
    {
      label: 'IP spoofing',
      path: '/matches',
      headers: { 'X-Forwarded-For': '127.0.0.1, 127.0.0.1, 127.0.0.1, 127.0.0.1' },
    },
  ];

  for (const { label, path, headers } of attacks) {
    const res = await get(path, headers);
    log(label, res.status, res.status === 403 ? 'blocked by shield' : 'passed through (check Arcjet dashboard)');
  }
}

// ─── Test 4: WebSocket Rate Limit ───────────────────────────────────────────

async function testWsRateLimit() {
  console.log(`\n${BOLD}${CYAN}[4] WebSocket Rate Limit — opening 10 connections rapidly (limit is 5 per 2s)${RESET}`);

  let accepted = 0;
  let rejected = 0;

  const connections = Array.from({ length: 10 }, (_, i) =>
    new Promise(resolve => {
      const ws = new WebSocket(`${WS_BASE}/ws`);

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'welcome') {
          accepted++;
          log(`conn #${i + 1}`, 101, 'accepted');
        }
        ws.close();
        resolve();
      });

      ws.on('close', (code) => {
        if (code === 1013 || code === 1008) {
          rejected++;
          log(`conn #${i + 1}`, code, 'rejected by arcjet');
        }
        resolve();
      });

      ws.on('error', () => {
        rejected++;
        log(`conn #${i + 1}`, 0, 'connection error');
        resolve();
      });
    })
  );

  await Promise.all(connections);
  console.log(`  → accepted: ${GREEN}${accepted}${RESET}  rejected: ${YELLOW}${rejected}${RESET}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wait(ms) {
  console.log(`  ${YELLOW}⏳ waiting ${ms / 1000}s for rate limit window to reset...${RESET}`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Run ─────────────────────────────────────────────────────────────────────

console.log(`${BOLD}Arcjet Stress Test${RESET}`);
console.log(`Target: ${CYAN}${BASE}${RESET}`);
console.log(`Make sure the server is running and ARCJET_MODE=LIVE\n`);

try {
  await testRateLimit();
  await wait(11000); // sliding window is 10s — wait for it to clear
  await testBotDetection();
  await wait(11000);
  await testShield();
  await testWsRateLimit();
  console.log(`\n${BOLD}Done.${RESET}\n`);
} catch (err) {
  console.error(`\n${RED}Error: ${err.message}${RESET}`);
  console.error('Is the server running?');
  process.exit(1);
}