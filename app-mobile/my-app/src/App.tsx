import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import ClosetPage from "./pages/ClosetPage";
import AddPage from "./pages/UnderConstruction";
import CalendarPage from "./pages/UnderConstruction";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/UnderConstruction";
import CreateAnOutfit from "./pages/UnderConstruction";
import Post from "./pages/Post";
import UnderConstruction from "./pages/UnderConstruction";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect to login by default */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Main App Routes */}
        <Route
          path="/*"
          element={
            <>
              <NavBar />
              <Routes>
                <Route path="dashboard" element={<HomePage />} />
                <Route path="closet" element={<ClosetPage />} />
                <Route path="add" element={<AddPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="feed" element={<FeedPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="create-outfit" element={<CreateAnOutfit />} />
                <Route path="post-to-feed" element={<Post />} />
                <Route path="*" element={<UnderConstruction />} />
              </Routes>
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;