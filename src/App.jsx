import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import { lazyWithReload } from "./utils/lazyWithReload";

// Everything but the landing page loads on first visit.
const Login = lazyWithReload(() => import("./pages/Login"));
const OnePager = lazyWithReload(() => import("./pages/OnePager"));
const OurTeam = lazyWithReload(() => import("./pages/OurTeam"));
const Chat = lazyWithReload(() => import("./pages/Chat"));
const Monitor = lazyWithReload(() => import("./pages/Monitor"));
const Panel = lazyWithReload(() => import("./pages/Panel"));
const Education = lazyWithReload(() => import("./pages/Education"));
const Blog = lazyWithReload(() => import("./pages/Blog"));

function Protected() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/one-pager" element={<OnePager />} />
            <Route path="/our-team" element={<OurTeam />} />
            <Route path="/blog" element={<Blog />} />
            <Route element={<Protected />}>
              <Route path="/panel" element={<Panel />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/monitor" element={<Monitor />} />
              <Route path="/education" element={<Education />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}