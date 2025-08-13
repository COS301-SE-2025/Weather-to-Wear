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
        <ImageProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/*"
                element={
                  <UploadQueueProvider>
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
                  <Route path="my-posts" element={<PostsPage />} />
                  <Route path="*" element={<UnderConstruction />} /> {/* Catch-all for unmatched routes */}
                    </Routes>
                  </UploadQueueProvider>
                }
              />
            </Routes>
          </Router>
        </ImageProvider>
      </QueryClientProvider>
    </PersistQueryClientProvider>
  );
}

export default App;