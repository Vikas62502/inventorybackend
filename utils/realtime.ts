import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketIOServer | null = null;

const normalizeOrigins = (origins: string[]): Set<string> => {
  return new Set(origins.map((origin) => origin.trim()).filter(Boolean));
};

export const attachRealtimeServer = (app: any, allowedOrigins: string[]): HttpServer => {
  const httpServer = createServer(app);
  const allowed = normalizeOrigins(allowedOrigins);

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);
        if (allowed.has(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    }
  });

  io.use((socket: Socket, next: (err?: Error) => void) => {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers.authorization;
    const rawToken = typeof authToken === 'string'
      ? authToken
      : (typeof headerToken === 'string' ? headerToken : '');
    const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;

    if (!token) {
      socket.data.identity = null;
      next();
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      socket.data.identity = null;
      next();
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as { id?: string; role?: string };
      if (decoded?.id && decoded?.role) {
        socket.data.identity = { id: decoded.id, role: decoded.role };
      } else {
        socket.data.identity = null;
      }
    } catch {
      socket.data.identity = null;
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const identity = socket.data.identity as { id: string; role: string } | null;
    if (identity) {
      socket.join(`user:${identity.id}`);
      socket.join(`role:${identity.role}`);
      socket.join('stream:backend');
    }

    socket.on('realtime:subscribe', (roomOrRooms: string | string[]) => {
      const rooms = typeof roomOrRooms === 'string' ? [roomOrRooms] : roomOrRooms;
      if (!Array.isArray(rooms)) return;

      const roomList = rooms.map((room) => (typeof room === 'string' ? room.trim() : '')).filter(Boolean);
      for (const room of roomList) {
        // Protect role/user scoped streams.
        if (room.startsWith('role:')) {
          if (identity && room === `role:${identity.role}`) socket.join(room);
          continue;
        }
        if (room.startsWith('user:')) {
          if (identity && room === `user:${identity.id}`) socket.join(room);
          continue;
        }
        // Generic backend streams require auth.
        if (room.startsWith('stream:') && !identity) continue;
        socket.join(room);
      }
    });

    socket.on('realtime:unsubscribe', (roomOrRooms: string | string[]) => {
      if (typeof roomOrRooms === 'string') {
        socket.leave(roomOrRooms);
        return;
      }
      if (Array.isArray(roomOrRooms)) {
        for (const room of roomOrRooms) {
          if (typeof room === 'string' && room.trim()) {
            socket.leave(room.trim());
          }
        }
      }
    });
  });

  return httpServer;
};

export const realtimeEvents = {
  backendMutation: 'backend:mutation',
  dealerDirectoryUpdated: 'dealer:directory-updated',
  callingActionsUpdated: 'calling:actions-updated',
  callingUploadsUpdated: 'calling:uploads-updated'
} as const;

export const emitRealtime = (event: string, payload: unknown, room?: string | string[]): void => {
  if (!io) return;
  if (!room) {
    io.emit(event, payload);
    return;
  }
  const rooms = (Array.isArray(room) ? room : [room])
    .map((r) => String(r || '').trim())
    .filter(Boolean);
  if (!rooms.length) {
    io.emit(event, payload);
    return;
  }
  // Socket.IO: chained .to() = union of rooms (HR ∪ dealers), not intersection.
  let target: ReturnType<SocketIOServer['to']> | SocketIOServer = io;
  for (const r of rooms) {
    target = target.to(r);
  }
  target.emit(event, payload);
};

/** HR Social Media + dealer calling queues (same event as CSV uploads). */
export const CALLING_UPLOADS_STREAM_ROOMS = ['stream:hr', 'stream:dealers'] as const;

/** Call Analytics live refresh (§AY) — dealers + HR. */
export const CALLING_ACTIONS_STREAM_ROOMS = ['stream:dealers', 'stream:hr'] as const;

export const emitCallingUploadsUpdated = (
  payload: Record<string, unknown>,
  rooms: readonly string[] = CALLING_UPLOADS_STREAM_ROOMS
): void => {
  emitRealtime(realtimeEvents.callingUploadsUpdated, payload, [...rooms]);
};

/** §AY — after dealer Current Lead Submit (and HR/admin outcome edits). */
export const emitCallingActionsUpdated = (payload: {
  reason?: string;
  dealerId?: string | null;
  leadId?: string | null;
  action?: string | null;
  actionAt?: string | null;
  [key: string]: unknown;
}): void => {
  const actionAt = payload.actionAt || new Date().toISOString();
  emitRealtime(
    realtimeEvents.callingActionsUpdated,
    {
      reason: payload.reason || 'dealer_action',
      dealerId: payload.dealerId || null,
      leadId: payload.leadId || null,
      action: payload.action || null,
      actionAt,
      ...payload
    },
    [...CALLING_ACTIONS_STREAM_ROOMS]
  );
  emitRealtime(
    realtimeEvents.backendMutation,
    {
      domain: 'dealer',
      path: '/dealers/me/calling-queue/action',
      reason: payload.reason || 'dealer_action',
      dealerId: payload.dealerId || null,
      leadId: payload.leadId || null,
      action: payload.action || null,
      actionAt
    },
    'stream:backend'
  );
};

export type SheetSyncSocketReason = 'sheet_sync' | 'sheet_auto_sync';

/** P0: emit after sheet sync/assign so SPA HR Social Media live-updates. */
export const emitSheetSyncUploadsUpdated = (opts: {
  reason: SheetSyncSocketReason;
  spreadsheetId: string;
  sourceId?: string | null;
  path?: string;
}): void => {
  const syncedAt = new Date().toISOString();
  const payload: Record<string, unknown> = {
    reason: opts.reason,
    spreadsheetId: opts.spreadsheetId,
    syncedAt
  };
  if (opts.sourceId) payload.sourceId = opts.sourceId;

  emitCallingUploadsUpdated(payload);

  const path =
    opts.path ||
    (opts.reason === 'sheet_auto_sync' ? '/hr/sheet-sources/sync-all' : '/hr/sheet-sources/sync');
  emitRealtime(
    realtimeEvents.backendMutation,
    {
      domain: 'hr',
      path,
      reason: opts.reason,
      syncedAt,
      ...(opts.sourceId ? { sourceId: opts.sourceId } : {})
    },
    'stream:backend'
  );
};
