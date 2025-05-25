import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Home, Calendar, Shirt, Users, User } from "lucide-react";

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const isActive = (path: string) => {
    return currentPath === path;
  };

  const toggleMenu = () => setMenuOpen((open) => !open);

// In NavBar component
const handleLogout = () => {
  const token = localStorage.getItem('token');
  if (token) {
    // Clear the user-specific favorites
    localStorage.removeItem(`closet-favs-${token}`);
  }
  // Clear the token
  localStorage.removeItem('token');
  // Navigate to login
  navigate("/login");
};
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <div className="fixed top-0 left-0 w-full bg-white z-50">
        {/* Top Banner */}
        <div className="bg-black text-white py-2 px-4">
          <div className="max-w-screen-xl mx-auto flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Weather2Wear logo" className="h-10 w-auto" />
              <h1 className="text-2xl md:text-4xl font-bodoni font-extrabold tracking-wide">
                Weather2Wear
              </h1>
            </div>

            {/* Mobile Profile & Logout */}
            {isMobile && (
              <div className="flex items-center gap-2">
                <Link to="/profile">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full border border-white cursor-pointer">
                    <User className="text-white w-5 h-5" />
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 rounded-full border border-white text-white hover:bg-white hover:text-black transition-all font-livvic text-sm"
                >
                  log out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Nav Bar */}
        <nav className="hidden lg:block py-3 px-4 bg-white relative">
          <div className="max-w-screen-xl mx-auto flex items-center justify-end relative">
            <div className="bg-black rounded-full flex items-center justify-center px-8 py-1 gap-4 absolute left-1/2 -translate-x-1/2">
              <Link
                to="/dashboard"
                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                  isActive("/dashboard") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                } text-white`}
              >
                <span className="font-livvic">home</span>
              </Link>
              <Link
                to="/closet"
                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                  isActive("/closet") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                } text-white`}
              >
                <span className="font-livvic">closet</span>
              </Link>
              <button
                onClick={toggleMenu}
                className="flex items-center justify-center p-1 bg-white rounded-full w-8 h-8"
                aria-label="Add options"
              >
                <Plus size={20} className="text-black" />
              </button>
              <Link
                to="/calendar"
                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                  isActive("/calendar") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                } text-white`}
              >
                <span className="font-livvic">calendar</span>
              </Link>
              <Link
                to="/feed"
                className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
                  isActive("/feed") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                } text-white`}
              >
                <span className="font-livvic">feed</span>
              </Link>
            </div>

            {/* Right - Profile & Logout */}
            <div className="flex items-center gap-3 ml-4">
              <Link to="/profile">
                <div className="w-8 h-8 flex items-center justify-center rounded-full border border-black cursor-pointer">
                  <User className="text-black w-5 h-5" />
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-1 rounded-full border border-black text-black hover:bg-black hover:text-white transition-all font-livvic"
              >
                log out
              </button>
            </div>
          </div>

          {/* Desktop Popup Menu */}
          <div className="w-full">
            <div className="max-w-screen-xl mx-auto flex justify-center items-center min-h-[0.5rem]">
              <div className={`${menuOpen ? "flex" : "hidden"} gap-6`}>
                <Link to="/add" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-black text-sm font-livvic hover:underline">
                  add to closet
                </Link>
                <Link to="/create-outfit" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-black text-sm font-livvic hover:underline">
                  create an outfit
                </Link>
                <Link to="/post-to-feed" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-black text-sm font-livvic hover:underline">
                  post to feed
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Nav Menu */}
        {isMobile && (
          <div className="lg:hidden bg-white py-2 px-4">
            <div className="w-full max-w-xs mx-auto bg-black rounded-full flex items-center justify-center gap-x-4 p-1">
              <Link
                to="/dashboard"
                className={`flex items-center justify-center p-2 rounded-full transition-colors ${
                  currentPath === "/dashboard" ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                }`}
              >
                <Home className="w-5 h-5 text-white" />
              </Link>
              <Link
                to="/closet"
                className={`flex items-center justify-center p-2 rounded-full transition-colors ${
                  currentPath === "/closet" ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                }`}
              >
                <Shirt className="w-5 h-5 text-white" />
              </Link>
              <button
                onClick={toggleMenu}
                className="flex items-center justify-center p-1 bg-white rounded-full w-8 h-8"
              >
                <Plus size={20} className="text-black" />
              </button>
              <Link
                to="/calendar"
                className={`flex items-center justify-center p-2 rounded-full transition-colors ${
                  currentPath === "/calendar" ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                }`}
              >
                <Calendar className="w-5 h-5 text-white" />
              </Link>
              <Link
                to="/feed"
                className={`flex items-center justify-center p-2 rounded-full transition-colors ${
                  currentPath === "/feed" ? "bg-[#3F978F]" : "hover:bg-[#304946]"
                }`}
              >
                <Users className="w-5 h-5 text-white" />
              </Link>
            </div>

            {/* Mobile Menu Popup */}
            <div className={`${menuOpen ? "block" : "hidden"} mt-2`}>
              <div className="flex flex-col space-y-2">
                <Link to="/add" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-sm text-black font-livvic">add to closet</Link>
                <Link to="/create-outfit" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-sm text-black font-livvic">create an outfit</Link>
                <Link to="/post-to-feed" onClick={() => setMenuOpen(false)} className="px-4 py-2 text-sm text-black font-livvic">post to feed</Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-[140px] lg:h-[140px]" />
    </>
  );
};

export default NavBar;