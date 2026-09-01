import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Monitor from "./pages/Monitor";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/monitor" element={<Monitor />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
