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
import Post from "./pages/UnderConstruction";
import UnderConstruction from "./pages/UnderConstruction";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AddItem from "./pages/AddItem";
import AddPage from "./pages/AddPage";
import HelpPage from "./pages/HelpPage";
import { ImageProvider } from "./components/ImageContext";
import Footer from "./components/Footer";
import LandingPage from "./pages/LandingPage";

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
                  <Route path="post-to-feed" element={<Post />} />
                  <Route path="help" element={<HelpPage />} />
                  <Route path="*" element={<UnderConstruction />} />
                </Routes>
                <Footer />
              </>
            }
          />
        </Routes>
      </Router>
    </ImageProvider>
  );
}

export default App;