import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import ClosetPage from "./pages/ClosetPage";
import CalendarPage from "./pages/UnderConstruction";
import FeedPage from "./pages/FeedPage";
import ProfilePage from "./pages/UnderConstruction";
import CreateAnOutfit from "./pages/UnderConstruction";
import Post from "./pages/Post";
import UnderConstruction from "./pages/UnderConstruction";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AddItem from "./pages/AddItem";
import AddPage from "./pages/AddPage";
import { ImageProvider } from "./components/ImageContext";

function App() {
  return (
    <ImageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
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
    </ImageProvider>
  );
}

export default App;
