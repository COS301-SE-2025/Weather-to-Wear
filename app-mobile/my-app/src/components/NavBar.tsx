// src/components/NavBar.tsx


import React, { useState, useEffect, useRef } from "react";



import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Home, Calendar, Shirt, Users, User } from "lucide-react";

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  const profileRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => currentPath === path;
  const toggleMenu = () => {
    setMenuOpen(o => !o);
    setProfileOpen(false);
  };
  const toggleProfile = () => {
    setProfileOpen(o => !o);
    setMenuOpen(false);
  };


  const handleLogout = () => {
    const token = localStorage.getItem("token");
    if (token) {
      localStorage.removeItem(`closet-favs-${token}`);
    }
    localStorage.removeItem("token");
    navigate("/login");
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
      if (
        profileOpen &&
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  return (
    <>
      <div className="fixed top-0 left-0 w-full bg-white dark:bg-gray-900 z-50">
        {/* Top Banner */}
        <div className="bg-black dark:bg-gray-800 text-white py-2 px-4">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="Weather2Wear logo"
                className="h-10 w-auto"
              />
              <h1 className="text-2xl md:text-4xl font-sephir font-semibold tracking-tight">
                WeatherToWear
              </h1>
            </div>

            {/* Mobile Profile & Logout */}
            {isMobile && (
              <div className="flex items-center gap-2 relative" ref={profileRef}>
                <button
                  onClick={toggleProfile}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-white"
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
            <div className="bg-black dark:bg-gray-800 rounded-full flex items-center justify-center px-8 py-1 gap-4 absolute left-1/2 -translate-x-1/2">
              <Link
                to="/dashboard"

                // className={`px-3 py-1 rounded-full text-white transition-colors ${
                //   isActive("/dashboard")
                //     ? "bg-[#3F978F]"
                //     : "hover:bg-[#304946]"
                // }`}

                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                  isActive("/dashboard")
                    ? "bg-[#3F978F]"
                    : "hover:bg-[#304946]"
                } text-white`}
              >
                home
              </Link>
              <Link
                to="/closet"
                className={`px-3 py-1 rounded-full text-white transition-colors ${
                  isActive("/closet")
                    ? "bg-[#3F978F]"
                    : "hover:bg-[#304946]"
                }`}
              >
                closet
              </Link>
              <button
                onClick={toggleMenu}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  isAddRoute
                    ? "bg-[#3F978F] text-white"
                    : "bg-white dark:bg-gray-800 text-black dark:text-gray-100 hover:bg-[#304946]"
                }`}
                aria-label="Add options"
              >
                <Plus size={20} />
              </button>
              <Link
                to="/calendar"
 
                // className={`px-3 py-1 rounded-full text-white transition-colors ${
                //   isActive("/calendar")
                //     ? "bg-[#3F978F]"
                //     : "hover:bg-[#304946]"
                // }`}

                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                  isActive("/calendar")
                    ? "bg-[#3F978F]"
                    : "hover:bg-[#304946]"
                } text-white`}

              >
                calendar
              </Link>
              <Link
                to="/feed"
                className={`px-3 py-1 rounded-full text-white transition-colors ${
                  isActive("/feed")
                    ? "bg-[#3F978F]"
                    : "hover:bg-[#304946]"
                }`}
              >
                feed
              </Link>
            </div>

            {/* Right - Profile & Logout */}
            <div className="flex items-center gap-3 ml-4 relative" ref={profileRef}>
              <button
                onClick={toggleProfile}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-black dark:border-gray-100"
              >
                <User className="text-black dark:text-gray-100 w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-1 rounded-full border border-black dark:border-gray-100 text-black dark:text-gray-100 hover:bg-black dark:hover:bg-gray-800 hover:text-white transition-all font-livvic"
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
          </div>

          {/* Desktop Add Dropdown */}
          <div className="w-full">
            <div className="max-w-screen-xl mx-auto flex justify-center items-center min-h-[0.5rem]">
              <div className={`${menuOpen ? "flex" : "hidden"} gap-6`}>
                <Link
                  to="/add"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 text-black dark:text-gray-100 text-sm font-livvic hover:underline"
                >
                  add to closet
                </Link>
                <Link
                  to="/create-outfit"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 text-black dark:text-gray-100 text-sm font-livvic hover:underline"
                >
                  create an outfit
                </Link>
                <Link
                  to="/post-to-feed"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 text-black dark:text-gray-100 text-sm font-livvic hover:underline"
                >
                  post to feed
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Nav Menu */}
        {isMobile && (
          <div className="lg:hidden bg-white dark:bg-gray-900 py-2 px-4">
            <div className="w-full max-w-xs mx-auto bg-black dark:bg-gray-800 rounded-full flex items-center justify-center gap-x-4 p-1">
              <Link
                to="/dashboard"
                className={`p-2 rounded-full transition-colors ${
                  currentPath === "/dashboard"
                    ? "bg-[#3F978F]"
                    : "hover:bg-[#304946]"
                }`}
              >
                <Home className="w-5 h-5 text-white" />
              </Link>
              <Link
                to="/closet"
                className={`p-2 rounded-full transition-colors ${
                  currentPath === "/closet"
                    ? "bg-[#3F978F]"
                    : "hover:bg-[#304946]"
                }`}
              >
                <Shirt className="w-5 h-5 text-white" />
              </Link>
              <button
                onClick={toggleMenu}
                className={`p-1 rounded-full w-8 h-8 transition-colors ${
                  isAddRoute
                    ? "bg-[#3F978F] text-white"
                    : "bg-white dark:bg-gray-800 text-black dark:text-gray-100 hover:bg-[#304946]"
                }`}
              >
                <Plus size={20} />
              </button>
              <Link
                to="/calendar"
                className={`p-2 rounded-full transition-colors ${
                  currentPath === "/calendar"
                    ? "bg-[#3F978F]"
                    : "hover:bg-[#304946]"
                }`}
              >
                <Calendar className="w-5 h-5 text-white" />
              </Link>
              <Link
                to="/feed"
                className={`p-2 rounded-full transition-colors ${
                  currentPath === "/feed"
                    ? "bg-[#3F978F]"
                    : "hover:bg-[#304946]"
                }`}
              >
                <Users className="w-5 h-5 text-white" />
              </Link>
            </div>

            {/* Mobile Add Dropdown */}
            <div className={`${menuOpen ? "block" : "hidden"} mt-2`}>
              <div className="flex flex-col space-y-2">
                <Link
                  to="/add"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 text-sm text-black dark:text-gray-100 font-livvic"
                >
                  add to closet
                </Link>
                <Link
                  to="/create-outfit"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 text-sm text-black dark:text-gray-100 font-livvic"
                >
                  create an outfit
                </Link>
                <Link
                  to="/post-to-feed"
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-2 text-sm text-black dark:text-gray-100 font-livvic"
                >
                  post to feed
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Spacer so content isn’t hidden under fixed navbar */}
      <div className="h-[140px] lg:h-[140px]" />

      

    </>
  );
};

export default NavBar;

