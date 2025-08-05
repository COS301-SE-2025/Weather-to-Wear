import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Camera,
  Mail,


  Calendar,
  Heart,
  Settings,
} from "lucide-react";
import { fetchAllOutfits } from "../services/outfitApi";
import { getItemCount } from "../services/closetApi";
import { getOutfitCount } from "../services/outfitApi";

interface OutfitItem {
  closetItemId: string;
  imageUrl: string;
  layerCategory: string;
}

interface UIOutfit {
  id: string;
  outfitItems: OutfitItem[];
  favourite: boolean;
  warmthRating?: number;
  waterproof?: boolean;
  overallStyle?: string;
  userRating?: number;
}

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "",
    email: "",
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [topOutfits, setTopOutfits] = useState<UIOutfit[]>([]);
  const [loadingOutfits, setLoadingOutfits] = useState(true);
  const [closetCount, setClosetCount] = useState<number>(0);
  const [outfitCount, setOutfitCount] = useState<number>(0);
  // Helper to prefix image URLs
  const prefixed = (url: string) =>
    url.startsWith("http") ? url : `http://localhost:5001${url}`;

  useEffect(() => {
    // Fetch user data from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserInfo((prev) => ({
          ...prev,
          name: parsedUser.name || prev.name,
          email: parsedUser.email || prev.email,
        }));
      } catch (error) {
        console.error("Failed to parse user data", error);
      }
    }
    fetchAllOutfits()
      .then(raw => {
        const uiList: UIOutfit[] = raw.map(o => ({
          ...o,
          favourite: !!o.favourite,
          tab: "outfits",
        }));
        // keep only the top 5
        setTopOutfits(uiList.slice(0, 5));
      })
      .catch(err => console.error("Error fetching outfits", err))
      .finally(() => setLoadingOutfits(false));

    getItemCount()
      .then(count => setClosetCount(count))
      .catch(err => console.error("Error counting items", err));

    getOutfitCount()                    
      .then(count => setOutfitCount(count))
      .catch(err => console.error("Error counting outfits", err));

  }, []);



  const handleSave = () => {
    setIsEditing(false);
    setShowSuccess(true);
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...parsedUser,
            name: userInfo.name,
            email: userInfo.email,
          })
        );
      } catch (error) {
        console.error("Failed to update user data", error);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setUserInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const toggleFavourite = (outfitId: string) => {
    setTopOutfits((prev) =>
      prev.map((outfit) =>
        outfit.id === outfitId ? { ...outfit, favourite: !outfit.favourite } : outfit
      )
    );
    // Add API call to update favourite status on server if needed
    // e.g., fetchWithAuth(`/api/outfits/${outfitId}/favourite`, { method: "PATCH" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out">
      {/* Header Image Section with Layered Profile Photo */}
      <div
        className="w-screen -mx-4 sm:-mx-6 relative h-48 -mt-12 mb-20" // Increased mb-6 to mb-20
        style={{
          backgroundImage: `url(/header.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          marginLeft: "calc(-50vw + 50%)",
          width: "100vw",
        }}
      >
        {/* dark overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-30" />

        {/* profile circle + full name, side by side */}
        <div
          className="absolute left-10 top-full transform -translate-y-1/2 z-10 flex items-center gap-6"
        >
          {/* avatar */}
          <div className="relative">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-40 h-40 rounded-full bg-[#3F978F] text-white 
                 flex items-center justify-center text-5xl font-bodoni"
            >
              {getInitials(userInfo.name)}
            </motion.div>
            <button
              className="absolute bottom-0 right-0 rounded-full bg-[#000000] 
                 hover:bg-[#2F6F6A] p-2 text-white transition"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>

          {/* full name next to it */}
          <h2 className="text-4xl font-semibold text-black mt-16 font-livvic">
            {userInfo.name}
          </h2>
        </div>

      </div>

      {/* Buttons under profile photo */}
      <div className="flex justify-start gap-4 px-6 mb-0 mt-28 ml-">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-6 py-2 bg-[#000000] text-white rounded-full font-livvic text-base hover:bg-[#2F6F6A] transition"
        >
          Edit Profile
        </button>
        <Link to="/appearance" className="block">
          <button
            className="px-6 py-2 bg-white border border-black text-black rounded-full font-livvic text-base hover:bg-gray-100 transition"
          >
            Style Settings
          </button>
        </Link>
      </div>

      <div className="w-full px-6 pb-12">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Profile Showcase */}
          <div className="w-full lg:w-2/3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-8 shadow-md"
            >


              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 text-gray-900 dark:text-gray-100">
                {/* Personal Details */}
                <div className="space-y-5">
                  <h3 className="text-lg font-livvic font-medium flex items-center gap-2 text-[#3F978F]">
                    <User className="h-5 w-5" />
                    My Details
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="name"
                        className="flex items-center gap-2 text-sm font-livvic text-gray-700 dark:text-gray-300"
                      >
                        Name
                      </label>
                      {isEditing ? (
                        <input
                          id="name"
                          value={userInfo.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className="mt-1 w-full p-2 rounded-lg text-black dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3F978F] border border-gray-300 dark:border-gray-600 rounded-full"
                        />
                      ) : (
                        <p className="mt-1 text-base font-livvic">{userInfo.name}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="flex items-center gap-2 text-sm font-livvic text-gray-700 dark:text-gray-300"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </label>
                      {isEditing ? (
                        <input
                          id="email"
                          type="email"
                          value={userInfo.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="mt-1 w-full p-2 rounded-lg text-black dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3F978F] border border-gray-300 dark:border-gray-600 rounded-full"
                        />
                      ) : (
                        <p className="mt-1 text-base font-livvic">{userInfo.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Style Stats */}
                <div className="space-y-5">

                  <div className="space-y-5">

                    <div className="grid grid-cols-2 gap-4">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm"
                      >
                        <div className="text-xl font-Livvic font-bold text-[#3F978F]">
                          {closetCount}
                        </div>
                        <div className="text-sm font-Livvic text-gray-600 dark:text-gray-400">
                          Total Items in Closet
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm"
                      >
                        <div className="text-xl font-livvic font-bold text-[#3F978F]">
                          {outfitCount}
                        </div>
                        <div className="text-sm font-livvic text-gray-600 dark:text-gray-400">
                          Total Outfits in Closet
                        </div>
                      </motion.div>
                    </div>

                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-4 pt-6">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 bg-white dark:bg-gray-700 text-black dark:text-white rounded-full hover:bg-black dark:hover:bg-black transition font-livvic border border-black dark:border-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1 bg-[#3F978F] hover:bg-[#2F6F6A] text-white rounded-full transition font-livvic"
                  >
                    Save
                  </button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Top 5 Outfits Section */}
          <div className="w-full lg:w-1/3">
            <h3 className="text-lg font-livvic font-medium text-[#3F978F] mb-4">
              Top 5 Outfits
            </h3>
            {loadingOutfits ? (
              <p className="text-gray-500">Loading outfits...</p>
            ) : topOutfits.length === 0 ? (
              <p className="text-gray-500">No outfits available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {topOutfits.map((outfit) => (
                  <motion.div
                    key={outfit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-white border rounded-xl p-2 w-full cursor-pointer"
                  >
                    <div className="space-y-1">
                      {/* headwear + accessory */}
                      <div
                        className={`flex justify-center space-x-1 ${outfit.outfitItems.some((it) =>
                          ["headwear", "accessory"].includes(it.layerCategory)
                        )
                          ? ""
                          : "hidden"
                          }`}
                      >
                        {outfit.outfitItems
                          .filter((it) =>
                            ["headwear", "accessory"].includes(it.layerCategory)
                          )
                          .map((it) => (
                            <img
                              key={it.closetItemId}
                              src={prefixed(it.imageUrl)}
                              alt={`Outfit ${outfit.id} ${it.layerCategory}`}
                              className="w-16 h-16 object-contain rounded"
                            />
                          ))}
                      </div>
                      {/* tops */}
                      <div className="flex justify-center space-x-1">
                        {outfit.outfitItems
                          .filter((it) =>
                            ["base_top", "mid_top", "outerwear"].includes(
                              it.layerCategory
                            )
                          )
                          .map((it) => (
                            <img
                              key={it.closetItemId}
                              src={prefixed(it.imageUrl)}
                              alt={`Outfit ${outfit.id} ${it.layerCategory}`}
                              className="w-16 h-16 object-contain rounded"
                            />
                          ))}
                      </div>
                      {/* bottoms */}
                      <div className="flex justify-center space-x-1">
                        {outfit.outfitItems
                          .filter((it) => it.layerCategory === "base_bottom")
                          .map((it) => (
                            <img
                              key={it.closetItemId}
                              src={prefixed(it.imageUrl)}
                              alt={`Outfit ${outfit.id} ${it.layerCategory}`}
                              className="w-16 h-16 object-contain rounded"
                            />
                          ))}
                      </div>
                      {/* footwear */}
                      <div className="flex justify-center space-x-1">
                        {outfit.outfitItems
                          .filter((it) => it.layerCategory === "footwear")
                          .map((it) => (
                            <img
                              key={it.closetItemId}
                              src={prefixed(it.imageUrl)}
                              alt={`Outfit ${outfit.id} ${it.layerCategory}`}
                              className="w-14 h-14 object-contain rounded"
                            />
                          ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>


        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-sm w-full text-center shadow-md"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h2 className="text-lg font-livvic mb-2 text-[#3F978F]">
                Changes Saved!
              </h2>
              <p className="mb-4 text-gray-700 dark:text-gray-300 font-livvic">
                Your profile has been updated.
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className="px-4 py-1 bg-[#3F978F] hover:bg-[#2F6F6A] text-white rounded-full transition"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;