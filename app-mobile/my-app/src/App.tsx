// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";  // Updated import path
import HomePage from "./pages/HomePage";
import ClosetPage from "./pages/UnderConstruction";
import AddPage from "./pages/UnderConstruction";
import CalendarPage from "./pages/UnderConstruction";
import FeedPage from "./pages/UnderConstruction";

function App() {
  return (
    <Router>
      <NavBar />  {/* Updated component name */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/closet" element={<ClosetPage />} />
        <Route path="/add" element={<AddPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/feed" element={<FeedPage />} />
      </Routes>
    </Router>
  );
}

export default App;