import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GameRoom from "./pages/GameRoom.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import Login from "./pages/Login.jsx";
import MatchHistory from "./pages/MatchHistory.jsx";
import Matchmaking from "./pages/Matchmaking.jsx";
import Profile from "./pages/Profile.jsx";
import Register from "./pages/Register.jsx";
import JoinInvite from "./pages/JoinInvite.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matchmaking" element={<Matchmaking />} />
          <Route path="/game/:roomId" element={<GameRoom />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<MatchHistory />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/join-invite/:token" element={<JoinInvite />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
