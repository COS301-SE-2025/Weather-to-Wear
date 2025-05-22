
// import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-black text-white py-4">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold tracking-wider">Weather2Wear</h1>
        </div>
      </header>
      
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
