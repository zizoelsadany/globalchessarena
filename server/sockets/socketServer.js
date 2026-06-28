let ioInstance = null;

export function setSocketServer(io) {
  ioInstance = io;
}

export function getSocketServer() {
  if (!ioInstance) {
    throw new Error("Socket server has not been initialized yet.");
  }
  return ioInstance;
}
