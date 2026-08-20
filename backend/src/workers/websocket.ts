import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../middleware/auth';

const AUTH_SECRET = process.env.AUTH_SECRET || 'CHANGE_ME_IN_PRODUCTION';

interface ConnectedClient {
  ws: WebSocket;
  user: AuthUser;
}

const clients = new Map<string, ConnectedClient>();

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Authenticate via query parameter token
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'Authentication required');
      return;
    }

    try {
      const user = jwt.verify(token, AUTH_SECRET) as AuthUser;
      const clientId = `${user.userId}-${user.deviceId}`;

      clients.set(clientId, { ws, user });

      console.log(`WebSocket connected: ${clientId}`);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          handleMessage(clientId, user, message);
        } catch (e) {
          console.error('Invalid WebSocket message');
        }
      });

      ws.on('close', () => {
        clients.delete(clientId);
        // Notify partner of offline status
        broadcastToCouple(user.coupleId, user.userId, {
          type: 'presence',
          status: 'offline',
          userId: user.userId,
        });
      });

      // Notify partner of online status
      broadcastToCouple(user.coupleId, user.userId, {
        type: 'presence',
        status: 'online',
        userId: user.userId,
      });
    } catch (e) {
      ws.close(4001, 'Invalid token');
    }
  });
}

function handleMessage(clientId: string, user: AuthUser, message: any) {
  switch (message.type) {
    case 'chat':
      broadcastToCouple(user.coupleId, user.userId, {
        type: 'chat',
        message: message.data,
      });
      break;

    case 'typing':
      broadcastToCouple(user.coupleId, user.userId, {
        type: 'typing',
        userId: user.userId,
        isTyping: message.isTyping,
      });
      break;

    case 'seen':
      broadcastToCouple(user.coupleId, user.userId, {
        type: 'seen',
        messageId: message.messageId,
        userId: user.userId,
      });
      break;

    case 'mood_update':
      broadcastToCouple(user.coupleId, user.userId, {
        type: 'mood_update',
        mood: message.mood,
        userId: user.userId,
      });
      break;
  }
}

function broadcastToCouple(coupleId: string, senderId: string, data: any) {
  clients.forEach((client) => {
    if (client.user.coupleId === coupleId && client.user.userId !== senderId) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(data));
      }
    }
  });
}
