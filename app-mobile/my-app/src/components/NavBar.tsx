import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

const NavBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    return path !== "/" && currentPath === path;
  };

  return (
    <>
      <div className="fixed top-0 left-0 w-full bg-white z-50 shadow-md">
        {/* Top Banner */}
        <div className="bg-black text-white py-2 px-4">
          <div className="max-w-screen-xl mx-auto flex items-center justify-center gap-4">
            <img src="/logo.png" alt="Weather2Wear logo" className="h-10 w-auto" />
            <h1 className="text-4xl font-bodoni font-extrabold tracking-wide">
              Weather2Wear
            </h1>
          </div>
        </div>

        {/* Nav Bar */}
       <nav className="py-3 px-4 bg-white relative">
  <div className="max-w-screen-xl mx-auto flex items-center justify-end relative">
    
    {/* Centered Nav Group */}
    <div className="bg-black rounded-full flex items-center justify-center px-8 py-1 gap-4 absolute left-1/2 -translate-x-1/2">
      <Link
        to="/"
        className={`flex items-center justify-center px-3 py-1 rounded-full transition-colors ${
          isActive("/") ? "bg-[#3F978F]" : "hover:bg-[#304946]"
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
      <Link
        to="/add"
        className="flex items-center justify-center p-1 bg-white rounded-full w-8 h-8"
      >
        <Plus size={20} className="text-black" />
      </Link>
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

    {/* Right - Logout Button */}
   <div className="flex items-center gap-3 ml-4">
  <img
    src="/profile.png"
    alt="Profile"
    className="w-8 h-8 rounded-full object-cover border border-black"
  />
  <button className="px-4 py-1 rounded-full border border-black text-black hover:bg-black hover:text-white transition-all font-livvic">
    log out
  </button>
</div>
  </div>
</nav>

      </div>

      {/* Spacer div to push content down below the fixed navbar */}
      <div className="h-[140px]" />
    </>
  );
};

export default NavBar;
