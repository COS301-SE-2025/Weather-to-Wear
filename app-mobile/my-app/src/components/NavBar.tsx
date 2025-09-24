// src/components/NavBar.tsx
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
// import Toast from './Toast';

import {
  Plus,
  Home,
  Calendar,
  Shirt,
  Users,
  User,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { queryClient } from '../queryClient';
import { clearPersistedCache } from '../persist';
import { useAuth } from '../contexts/AuthContext';

const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const currentPath = location.pathname;

  const isAddRoute =
    currentPath === "/add" ||
    currentPath === "/add-item" ||
    currentPath.startsWith("/add/") ||
    currentPath === "/create-outfit" ||
    currentPath === "/post-to-feed";

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const profileRefMobile = useRef<HTMLDivElement>(null);
  const profileRefDesktop = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => currentPath === path;

  const toggleMenu = () => {
    setMenuOpen(o => !o);
    setProfileOpen(false);
  };
  const toggleProfile = () => {
    setProfileOpen(o => !o);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      // Clear React Query cache
      await queryClient.cancelQueries();
      queryClient.clear();

      // Remove the persisted dehydrated cache (localStorage copy)
      await clearPersistedCache();

      // Use AuthContext logout method to clear all auth state
      logout();

      // Close open UI bits
      setMenuOpen(false);
      setProfileOpen(false);

      // ! Merge Bemo Changes
//      navigate("/login", { replace: true });
//    } catch (err) {
//      console.error("Logout cleanup failed:", err);
//      navigate("/login", { replace: true });
//    }
//  };
// ! Merge Kyle Changes
     navigate("/login", { 
      replace: true, 
      state: { loggedOut: true } 
    });
  } catch (err) {
    console.error("Logout cleanup failed:", err);
    navigate("/login", { replace: true });
  }
};

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!profileOpen) return;
      const target = e.target as Node;
      const inMobile = profileRefMobile.current?.contains(target);
      const inDesktop = profileRefDesktop.current?.contains(target);
      if (!inMobile && !inDesktop) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  return (
    <>
      {/* Fixed top bar */}
      <div className="fixed top-0 left-0 w-full bg-white dark:bg-gray-900 z-50">
        {/* Top Banner */}
        <div className="bg-black dark:bg-gray-800 text-white py-2 px-4">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Logo" className="h-10 w-auto" />
              <h1 className="hidden lg:block text-2xl md:text-4xl font-sephir font-semibold tracking-tight">
                WeatherToWear
              </h1>
            </div>

            {/* Mobile top-right actions */}
            {isMobile && (
              <div className="flex items-center gap-2 relative" ref={profileRefMobile}>
                <button
                  onClick={() => navigate("/help")}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-white"
                  aria-label="Help"
                >
                  <HelpCircle className="text-white w-5 h-5" />
                </button>
                <button
                  onClick={toggleProfile}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-white"
                  aria-label="Profile"
                >
                  <User className="text-white w-5 h-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 rounded-full border border-white text-white hover:bg-white hover:text-black transition-all font-livvic text-sm"
                >
                  log out
                </button>

                {profileOpen && (
                  <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 z-50">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setProfileOpen(false)}
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/my-posts"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setProfileOpen(false)}
                    >
                      My Posts
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Nav Bar */}
        <nav className="hidden lg:block py-3 px-4 bg-white dark:bg-gray-900 relative">
          <div className="max-w-screen-xl mx-auto flex items-center justify-end relative">
            {/* Centered pill-group */}
            <div className="bg-black dark:bg-gray-800 rounded-full flex items-center px-8 py-1 gap-4 absolute left-1/2 -translate-x-1/2">
              <Link
                to="/dashboard"
                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${isActive("/dashboard") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                  } text-white`}
              >
                Home
              </Link>
              <Link
                to="/closet"
                className={`px-3 py-1 rounded-full text-white transition-colors ${isActive("/closet") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                  }`}
              >
                Closet
              </Link>
              <button
                onClick={toggleMenu}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isAddRoute
                    ? "bg-[#3F978F] text-white"
                    : "bg-white dark:bg-gray-800 text-black dark:text-gray-100 hover:bg-[#304946]"
                  }`}
                aria-label="Add options"
              >
                <Plus size={20} />
              </button>
              <Link
                to="/calendar"
                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${isActive("/calendar") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                  } text-white`}
              >
                Calendar
              </Link>
              <Link
                to="/feed"
                className={`px-3 py-1 rounded-full text-white transition-colors ${isActive("/feed") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                  }`}
              >
                Feed
              </Link>
              <Link
                to="/inspo"
                className={`px-3 py-1 rounded-full text-white transition-colors ${isActive("/inspo") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                  }`}
              >
                Inspo
              </Link>
            </div>

            {/* Desktop Help, Profile & Logout */}
            <div className="flex items-center gap-3 ml-4 relative" ref={profileRefDesktop}>
              <button
                onClick={() => navigate("/help")}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-black dark:border-gray-100"
                aria-label="Help"
              >
                <HelpCircle className="text-black dark:text-gray-100 w-5 h-5" />
              </button>
              <button
                onClick={toggleProfile}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-black dark:border-gray-100"
                aria-label="Profile"
              >
                <User className="text-black dark:text-gray-100 w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-1 rounded-full border border-black dark:border-gray-100 text-black dark:text-gray-100 hover:bg-black dark:hover:bg-gray-800 hover:text-white transition-all font-livvic"
              >
                Log Out
              </button>

              {profileOpen && (
                <div className="absolute top-full right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 z-50">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setProfileOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/my-posts"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setProfileOpen(false)}
                  >
                    My Posts
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Add Dropdown */}
          {menuOpen && (
            <div className="w-full">
              <div className="max-w-screen-xl mx-auto flex justify-center mt-2 gap-6">
                <Link
                  to="/add"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 text-black dark:text-gray-100 text-sm font-livvic hover:underline"
                >
                  Add To Closet
                </Link>
                <Link
                  to="/create-outfit"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 text-black dark:text-gray-100 text-sm font-livvic hover:underline"
                >
                  Create An Outfit
                </Link>
                <Link
                  to="/post-to-feed"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 text-black dark:text-gray-100 text-sm font-livvic hover:underline"
                >
                  Post To Feed
                </Link>
              </div>
            </div>
          )}
        </nav>
      </div>

      {/* FLOW SPACERS (outside the fixed header) */}
      {/* Desktop: proper spacing for fixed header */}
      <div className="hidden lg:block !h-[0px]" aria-hidden />
      {/* Mobile: proper spacing for fixed header */}
      <div className="block lg:hidden !h-[0px]" aria-hidden />
      {/* Mobile bottom nav */}
      {isMobile && (
        <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-gray-900 py-2 px-4 z-40">
          {/* Mobile Add Dropdown (opens up) */}
          {menuOpen && (
            <div className="mb-2 flex flex-col space-y-2">
              <Link
                to="/add"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-2 text-sm text-black dark:text-gray-100 font-livvic"
              >
                Add To Closet
              </Link>
              <Link
                to="/create-outfit"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-2 text-sm text-black dark:text-gray-100 font-livvic"
              >
                Create An Outfit
              </Link>
              <Link
                to="/post-to-feed"
                onClick={() => setMenuOpen(false)}
                className="px-4 py-2 text-sm text-black dark:text-gray-100 font-livvic"
              >
                Post To Feed
              </Link>
            </div>
          )}

          <nav
            aria-label="Primary"
            className="w-full max-w-xs mx-auto bg-black dark:bg-gray-800 rounded-full flex justify-center gap-x-4 p-1"
          >
            <Link
              to="/dashboard"
              className={`p-2 rounded-full transition-colors ${isActive("/dashboard") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                }`}
            >
              <Home className="w-5 h-5 text-white" />
            </Link>
            <Link
              to="/closet"
              className={`p-2 rounded-full transition-colors ${isActive("/closet") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                }`}
            >
              <Shirt className="w-5 h-5 text-white" />
            </Link>
            <button
              onClick={toggleMenu}
              className={`p-1 rounded-full w-8 h-8 transition-colors ${isAddRoute
                  ? "bg-[#3F978F] text-white"
                  : "bg-white dark:bg-gray-800 text-black dark:text-gray-100 hover:bg-[#304946]"
                }`}
              aria-label="Add options"
            >
              <Plus size={20} />
            </button>
            <Link
              to="/calendar"
              className={`p-2 rounded-full transition-colors ${isActive("/calendar") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                }`}
            >
              <Calendar className="w-5 h-5 text-white" />
            </Link>
            <Link
              to="/feed"
              className={`p-2 rounded-full transition-colors ${isActive("/feed") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                }`}
            >
              <Users className="w-5 h-5 text-white" />
            </Link>
            <Link
              to="/inspo"
              className={`p-2 rounded-full transition-colors ${isActive("/inspo") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                }`}
            >
              <Lightbulb className="w-5 h-5 text-white" />
            </Link>
          </nav>
        </div>
      )}
    </>
  );
};

export default NavBar;
