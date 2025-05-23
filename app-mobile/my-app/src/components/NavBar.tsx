import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Plus, Menu, X } from "lucide-react";

const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  const isActive = (path: string) => {
    if (menuOpen) return false;
    return path === currentPath;
  };

  const toggleMenu = () => setMenuOpen((open) => !open);
  const toggleMobileMenu = () => setMobileMenuOpen((open) => !open);

  useEffect(() => {
    setMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <div className="fixed top-0 left-0 w-full bg-white z-50">
        {/* Top Banner */}
        <div className="bg-black text-white py-2 px-4">
          <div className="max-w-screen-xl mx-auto flex items-center justify-center relative">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Weather2Wear logo" className="h-10 w-auto" />
              <h1 className="text-2xl md:text-4xl font-bodoni font-extrabold tracking-wide">
                Weather2Wear
              </h1>
            </div>

            {/* Mobile menu toggle */}
            <button 
              className="lg:hidden text-white absolute right-4"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
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
                <img
                  src="/profile.png"
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover border border-black cursor-pointer"
                />
              </Link>
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-1 rounded-full border border-black text-black hover:bg-black hover:text-white transition-all font-livvic"
              >
                log out
              </button>
            </div>
          </div>

          {/* Desktop Popup menu */}
          <div className="w-full">
            <div className="max-w-screen-xl mx-auto flex justify-center items-center min-h-[0.5rem]">
              <div className={`${menuOpen ? "flex" : "hidden"} gap-6`}>
                <Link
                  to="/add"
                  className="relative px-4 py-2 text-black text-sm font-livvic hover:underline"
                  onClick={() => setMenuOpen(false)}
                >
                  add to closet
                </Link>
                <Link
                  to="/create-outfit"
                  className="relative px-4 py-2 text-black text-sm font-livvic hover:underline"
                  onClick={() => setMenuOpen(false)}
                >
                  create an outfit
                </Link>
                <Link
                  to="/post-to-feed"
                  className="relative px-4 py-2 text-black text-sm font-livvic hover:underline"
                  onClick={() => setMenuOpen(false)}
                >
                  post to feed
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* Spacer div to push content below navbar */}
      <div className="h-[140px] lg:h-[140px]" />
    </>
  );
};

export default NavBar;
