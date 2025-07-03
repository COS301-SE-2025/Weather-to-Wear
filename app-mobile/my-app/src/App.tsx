import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import ClosetPage from "./pages/ClosetPage";
import CalendarPage from "./pages/CalendarPage";
import FeedPage from "./pages/FeedPage";
import Appearance from "./pages/Appearance";
import ProfilePage from "./pages/Profile";
import CreateAnOutfit from "./pages/UnderConstruction";
import PostToFeed from "./pages/PostToFeed";
import UnderConstruction from "./pages/UnderConstruction";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AddItem from "./pages/AddItem";
import AddPage from "./pages/AddPage";
import HelpPage from "./pages/HelpPage";
import LandingPage from "./pages/LandingPage";
import { ImageProvider } from "./components/ImageContext";

function App() {
  return (
    <ImageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/*"
            element={
              <>
                <NavBar />
                <Routes>
                  <Route path="dashboard" element={<HomePage />} />
                  <Route path="closet" element={<ClosetPage />} />
                  <Route path="add" element={<AddPage />} />
                  <Route path="add-item" element={<AddItem />} />
                  <Route path="calendar" element={<CalendarPage />} />
                  <Route path="feed" element={<FeedPage />} />
                  <Route path="appearance" element={<Appearance />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="create-outfit" element={<CreateAnOutfit />} />
                  <Route path="post-to-feed" element={<PostToFeed />} /> {/* Ensure this route renders PostToFeed */}
                  <Route path="help" element={<HelpPage />} />
                  <Route path="*" element={<UnderConstruction />} /> {/* Catch-all for unmatched routes */}
                </Routes>
              </>
            }
          />
        </Routes>
  </Router>
    </ImageProvider>
  );
}

export default App;