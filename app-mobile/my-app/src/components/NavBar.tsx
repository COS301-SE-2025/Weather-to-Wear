import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

const NavBar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Function to determine if a path is active
  const isActive = (path: string) => {
    if (path === "/" && currentPath === "/") return true;
    return path !== "/" && currentPath === path;
  };

  return (
    <div className="w-full bg-white">

    {/* Top Banner */}
    <div className="bg-black text-white text-center py-2">
      <h1 className="text-4xl font-bodoni font-extrabold tracking-wide">Weather2Wear</h1>

    </div>


      <nav className="flex justify-center items-center py-3 px-4">
        <div className="bg-black rounded-full flex items-center justify-center px-8 py-1 gap-4">
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
      </nav>
      {/* <div className="flex justify-center items-center gap-4 mt-2 mb-6">
        <button className="text-sm border-b border-transparent hover:border-black transition-all">
          add to closet
        </button>
        <button className="text-sm border-b border-transparent hover:border-black transition-all">
          create an outfit
        </button>
        <button className="text-sm border-b border-transparent hover:border-black transition-all">
          post to feed
        </button>
      </div> */}
    </div>
  );
};

export default NavBar;
