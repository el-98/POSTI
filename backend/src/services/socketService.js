let ioInstance = null;
const connectedUsers = new Map(); // socketId -> { userId, role }

export const setSocketIO = (io) => {
  ioInstance = io;
};

export const getSocketIO = () => ioInstance;

export const emitSocketEvent = (event, payload) => {
  if (!ioInstance) return;
  ioInstance.emit(event, payload);
};

export const registerSocketUser = ({ socketId, userId, role }) => {
  connectedUsers.set(socketId, { userId, role });
};

export const unregisterSocketUser = (socketId) => {
  connectedUsers.delete(socketId);
};

export const emitToUserRoom = ({ userId, event, payload }) => {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};

export const getConnectedUserIdsByRole = (role) => {
  const unique = new Set();
  for (const { userId, role: userRole } of connectedUsers.values()) {
    if (userRole === role) unique.add(userId);
  }
  return [...unique];
};
