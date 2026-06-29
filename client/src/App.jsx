import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import GameRoom from "./pages/GameRoom.jsx";
import Leaderboard from "./pages/Leaderboard.jsx";
import Login from "./pages/Login.jsx";
import MatchAnalysis from "./pages/MatchAnalysis.jsx";
import MatchHistory from "./pages/MatchHistory.jsx";
import Matchmaking from "./pages/Matchmaking.jsx";
import Profile from "./pages/Profile.jsx";
import Register from "./pages/Register.jsx";
import JoinInvite from "./pages/JoinInvite.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import TournamentManagement from "./pages/TournamentManagement.jsx";
import TournamentDetails from "./pages/TournamentDetails.jsx";
import Tournaments from "./pages/Tournaments.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminReports from "./pages/AdminReports.jsx";
import AdminNotifications from "./pages/AdminNotifications.jsx";
import VerifyOtp from "./pages/VerifyOtp.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import AICoach from "./pages/AICoach.jsx";
import Puzzles from "./pages/Puzzles.jsx";
import CheckoutMock from "./pages/CheckoutMock.jsx";
import AdminAnalyses from "./pages/AdminAnalyses.jsx";
import AdminPayments from "./pages/AdminPayments.jsx";
import Quests from "./pages/Quests.jsx";
import Shop from "./pages/Shop.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/checkout-mock" element={<CheckoutMock />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/matchmaking" element={<Matchmaking />} />
          <Route path="/game/:roomId" element={<GameRoom />} />
          <Route path="/analysis" element={<MatchAnalysis />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<MatchHistory />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournament/:id" element={<TournamentDetails />} />
          <Route path="/puzzles" element={<Puzzles />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="/quests" element={<Quests />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/tournaments" element={<TournamentManagement />} />
          <Route path="/admin/analyses" element={<AdminAnalyses />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/join-invite/:token" element={<JoinInvite />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
