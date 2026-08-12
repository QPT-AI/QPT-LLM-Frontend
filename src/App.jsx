import { ThemeProvider } from "./context/ThemeContext";
import SceneManager from "./components/SceneManager";

export default function App() {
  return (
    <ThemeProvider>
      <SceneManager />
    </ThemeProvider>
  );
}
