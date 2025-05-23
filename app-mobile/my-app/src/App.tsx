import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import ClosetPage from "./pages/ClosetPage";
import AddPage from "./pages/UnderConstruction";
import CalendarPage from "./pages/UnderConstruction";
import FeedPage from "./pages/UnderConstruction";
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
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Main App Routes with NavBar */}
        <Route
          path="/"
          element={
            <>
              <NavBar />
              <HomePage />
            </>
          }
        />
        <Route
          path="/closet"
          element={
            <>
              <NavBar />
              <ClosetPage />
            </>
          }
        />
        <Route
          path="/add"
          element={
            <>
              <NavBar />
              <AddPage />
            </>
          }
        />
        <Route
          path="/calendar"
          element={
            <>
              <NavBar />
              <CalendarPage />
            </>
          }
        />
        <Route
          path="/feed"
          element={
            <>
              <NavBar />
              <FeedPage />
            </>
          }
        />
        <Route
          path="/profile"
          element={
            <>
              <NavBar />
              <ProfilePage />
            </>
          }
        />
        <Route
          path="/create-outfit"
          element={
            <>
              <NavBar />
              <CreateAnOutfit />
            </>
          }
        />
        <Route
          path="/post-to-feed"
          element={
            <>
              <NavBar />
              <Post />
            </>
          }
        />
        <Route
          path="*"
          element={
            <>
              <NavBar />
              <UnderConstruction />
            </>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
