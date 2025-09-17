import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import ClosetPage from "./pages/ClosetPage";
import CalendarPage from "./pages/CalendarPage";
import FeedPage from "./pages/FeedPage";
import Appearance from "./pages/Appearance";
import ProfilePage from "./pages/Profile";
import CreateAnOutfit from "./pages/CreateAnOutfit";
import PostToFeed from "./pages/PostToFeed";
import UnderConstruction from "./pages/UnderConstruction";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AddItem from "./pages/AddItem";
import AddPage from "./pages/AddPage";
import HelpPage from "./pages/HelpPage";
import LandingPage from "./pages/LandingPage";
import { ImageProvider } from "./components/ImageContext";
import PostsPage from "./pages/PostsPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "./components/ProtectedRoute";

import Footer from "./components/Footer";
import { UploadQueueProvider } from "./context/UploadQueueContext";

import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { queryClient } from './queryClient';
import { persister } from './persist';

// const persister = createAsyncStoragePersister({
//   storage: {
//     getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
//     setItem: (key, value) => {
//       window.localStorage.setItem(key, value);
//       return Promise.resolve();
//     },
//     removeItem: (key) => {
//       window.localStorage.removeItem(key);
//       return Promise.resolve();
//     },
//   },
//   key: 'REACT_QUERY_OFFLINE_CACHE', 
//   throttleTime: 1000,               
// });

function App() {
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
                        <main className="mx-auto w-full max-w-screen-xl 
                       pt-[120px] lg:pt-[140px] 
                       pb-[calc(env(safe-area-inset-bottom)+80px)] lg:pb-0">
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