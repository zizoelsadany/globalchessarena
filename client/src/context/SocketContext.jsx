import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext.jsx";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : "http://localhost:5000");
const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);

  useEffect(() => {
    if (!token) return undefined;

    const nextSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"]
    });

    nextSocket.on("connect_error", (error) => toast.error(error.message || "Socket connection failed"));
    nextSocket.on("onlinePlayers", setOnlinePlayers);
    nextSocket.on("socketError", ({ message }) => toast.error(message));
    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setSocket(null);
      setOnlinePlayers([]);
    };
  }, [token]);

  const value = useMemo(() => ({ socket, onlinePlayers }), [onlinePlayers, socket]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  return useContext(SocketContext);
}
