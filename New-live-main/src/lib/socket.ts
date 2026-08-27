import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// The Socket.IO / WebRTC-signaling service (mini-services/ws-service) is a
// long-running Node process — it cannot run on Vercel's serverless
// functions. Deploy it separately (Railway, Render, Fly.io, a VPS, etc.)
// and point NEXT_PUBLIC_WS_URL at its public URL. Falls back to same-origin
// (useful only when both are actually served from the same host, e.g. a
// VPS running both processes behind one reverse proxy).
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || undefined;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(WS_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    timeout: 10000,
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};
