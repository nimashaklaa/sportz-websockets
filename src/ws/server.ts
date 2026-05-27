import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { Match, Commentary } from '../db/schema';
import {wsArcjet} from '../arcjet';

const matchSubscriptions = new Map<string, Set<WebSocket>>();

function subscribe(matchId: string, socket: WebSocket): void {
  if (!matchSubscriptions.has(matchId)) {
    matchSubscriptions.set(matchId, new Set());
  }
  matchSubscriptions.get(matchId)!.add(socket);
}

function unsubscribe(matchId: string, socket: WebSocket): void {
  const subscriptions = matchSubscriptions.get(matchId);
  if (!subscriptions) return;
  if (subscriptions) {
    subscriptions.delete(socket);
    if (subscriptions.size === 0) {
      matchSubscriptions.delete(matchId);
    }
  }
}

function clearSubscriptions(socket: WebSocket): void {
  for (const matchId of socket.subscriptions){
    unsubscribe(matchId, socket);
  }
}

function sendJson(socket: WebSocket, payload: unknown): void {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss: WebSocketServer, payload: unknown): void {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    client.send(JSON.stringify(payload));
  }
}

function broadcastMatchUpdate(matchId:string, payload:unknown): void {
  const subscribers = matchSubscriptions.get(matchId);
  if(!subscribers|| subscribers.size ===0) return;

  const message = JSON.stringify(payload);
  for(const socket of subscribers){
    if(socket.readyState !== WebSocket.OPEN) continue;
    socket.send(message);
  }
}

function handleMessage(socket: WebSocket, data:unknown): void {
  let message;
  try{
    message = JSON.parse(data.toString());
  }catch(err){
    sendJson(socket, { type: 'error', message: 'Invalid JSON' });
  }
  if(message?.type === subscribe && Number.isInteger(message.matchId)){
    subscribe(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: 'subscribed', matchId: message.matchId });
    return;
  }
  if(message?.type === unsubscribe && Number.isInteger(message.matchId) ){
    unsubscribe(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: 'unsubscribed', matchId: message.matchId });
    return;
  }
}

export function attachWebSocketServer(server: Server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 1024 * 1024,
  });

  wss.on('connection', async(socket, req) => {
    if(wsArcjet){
      try{
        const decision = await wsArcjet.protect(req);
        if(decision.isDenied()){
           const code = decision.reason.isRateLimit() ? 1013 : 1008;
           const reason = decision.reason.isRateLimit() ? 'Rate limit exceeded' : 'Internal server error';
           socket.close(code, reason);
           return;
        }
      }catch(err){
        console.error('WS connection error:', err);
        socket.close(1011, 'Server security error: ' + err.message);
        return;
      }
    }
    socket.isAlive = true;
    socket.on('pong', () => {socket.isAlive = true})

    socket.subscriptions = new Set();
    socket.on('message', (data) => handleMessage(socket, data));
    socket.on('error', () => {
      socket.terminate();
    });
    socket.on('close', () => {
      clearSubscriptions(socket);
    })
    sendJson(socket, { type: 'welcome' });
    socket.on('error', console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (!socket.isAlive) return socket.terminate();
      socket.isAlive = false;
      socket.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  function broadcastMatchCreated(match: Match): void {
    broadcastToAll(wss, { type: 'match_created', data: match });
  }

  function broadcastCommentary(matchId:string, comment): void {
    broadcastMatchUpdate(matchId, { type: 'commentary_update', data: comment });
  }

  return { broadcastMatchCreated, broadcastCommentary };
}