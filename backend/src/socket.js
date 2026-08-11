import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createRedisConnection } from './config/redis.js';

export function initSocket(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  io.use((socket, next) => {
    try {
      socket.userId = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET).sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => socket.join(socket.userId));

  // Worker runs in a separate process, so it notifies connected clients
  // through a Redis pub/sub channel rather than calling io.emit directly.
  const subscriber = createRedisConnection();
  subscriber.subscribe('analysis-updates');
  subscriber.on('message', (_channel, message) => {
    const { userId, ...payload } = JSON.parse(message);
    io.to(userId).emit('analysis-update', payload);
  });

  return io;
}
