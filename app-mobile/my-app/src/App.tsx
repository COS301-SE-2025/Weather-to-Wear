// 

// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import ClosetPage from "./pages/ClosetPage";
import CalendarPage from "./pages/CalendarPage";
import FeedPage from "./pages/FeedPage";
import Profile from "./pages/Profile"; // Current user's profile
import UsersPostsPage from "./pages/usersProfilePage"; // Other users' profiles
import CreateAnOutfit from "./pages/CreateAnOutfit";
import PostToFeed from "./pages/PostToFeed";
import UnderConstruction from "./pages/UnderConstruction";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AddItem from "./pages/AddItem";
import AddPage from "./pages/AddPage";
import HelpPage from "./pages/HelpPage";
import LandingPage from "./pages/LandingPage";
import InspoPage from "./pages/InspoPage";
import { ImageProvider } from "./components/ImageContext";
import PostsPage from "./pages/PostsPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";
import { UploadQueueProvider } from "./context/UploadQueueContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient } from "./queryClient";
import { persister } from "./persist";
import "./services/http";
import { scheduleTokenAutoLogout } from "./services/auth";

function App() {
  React.useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) scheduleTokenAutoLogout(t);

    const onFocus = () => {
      const t2 = localStorage.getItem("token");
      if (t2) scheduleTokenAutoLogout(t2);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister, maxAge: 15 * 60 * 1000 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ImageProvider>
            <Router>
              <Routes>
                {/* Public routes - only accessible when not logged in */}
                <Route
                  path="/"
                  element={
                    <PublicRoute>
                      <LandingPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <Login />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/signup"
                  element={
                    <PublicRoute>
                      <Signup />
                    </PublicRoute>
                  }
                />

                {/* Protected routes - only accessible when logged in */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <UploadQueueProvider>
                        <NavBar />
                        <main className="mx-auto w-full max-w-screen-xl pt-[57px] lg:pt-[110px] pb-[calc(env(safe-area-inset-bottom)+80px)] lg:pb-0">
                          <Routes>
                            <Route path="dashboard" element={<HomePage />} />
                            <Route path="closet" element={<ClosetPage />} />
                            <Route path="add" element={<AddPage />} />
                            <Route path="add-item" element={<AddItem />} />
                            <Route path="calendar" element={<CalendarPage />} />
                            <Route path="feed" element={<FeedPage />} />
                            <Route path="inspo" element={<InspoPage />} />
                            <Route path="profile" element={<Profile />} /> {/* Current user's profile */}
                            <Route path="user/:userId/posts" element={<UsersPostsPage />} />
                            <Route path="create-outfit" element={<CreateAnOutfit />} />
                            <Route path="post-to-feed" element={<PostToFeed />} />
                            <Route path="help" element={<HelpPage />} />
                            <Route path="my-posts" element={<PostsPage />} />
                            <Route path="*" element={<UnderConstruction />} />
                          </Routes>
                        </main>
                      </UploadQueueProvider>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Router>
          </ImageProvider>
        </AuthProvider>
      </QueryClientProvider>
    </PersistQueryClientProvider>
  );
}

export default App;