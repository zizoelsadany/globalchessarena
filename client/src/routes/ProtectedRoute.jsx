import { Navigate, Outlet, useLocation } from "react-router-dom";
import Loader from "../components/Loader.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();
  // If context not yet available (e.g. hot-reload ordering), show loader to avoid crash
  if (!auth) return <Loader label="Loading..." />;
  const { isAuthenticated, user, loading } = auth;
  if (loading) return <Loader label="Loading arena" />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  
  if (user && !user.is_verified) {
    return <Navigate to="/verify-otp" replace />;
  }

  return <Outlet />;
}
