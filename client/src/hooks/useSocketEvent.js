import { useEffect } from "react";

export function useSocketEvent(socket, event, handler) {
  useEffect(() => {
    if (!socket || !handler) return undefined;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [event, handler, socket]);
}
