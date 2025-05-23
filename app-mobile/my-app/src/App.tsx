import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import UnderConstruction from "./pages/UnderConstruction"; // <-- import here
import ClosetPage from "./pages/ClosetPage";
import AddPage from "./pages/UnderConstruction";
import CalendarPage from "./pages/UnderConstruction";
import FeedPage from "./pages/FeedPage";

function App() {
  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/profile" element={<UnderConstruction />} /> {/* fixed */}
        <Route path="/" element={<HomePage />} />
        <Route path="/closet" element={<ClosetPage />} />
        <Route path="/add" element={<AddPage />} />
        
        <Route path="/create-outfit" element={<UnderConstruction />} />
        <Route path="/post-to-feed" element={<AddPage />} />

        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/feed" element={<FeedPage />} />
      </Routes>
    </Router>
  );
}

export default App;
