import React, { useState, useEffect, useRef } from "react";
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
import { uploadProfilePhoto, getMe } from "../services/usersApi";
import { API_BASE } from '../config';
import { absolutize } from '../utils/url';
import Toast from "../components/Toast";


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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [showSuccessPopup, setShowSuccessPopup] = useState(false);


  // Helper to prefix image URLs
  // const prefixed = (url: string) =>
  //   url.startsWith("http") ? url : `${API_BASE}${url}`;

  useEffect(() => {
    // 1) Load from server (source of truth)
    (async () => {
      try {
        const { user } = await getMe();
        setUserInfo(prev => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
        }));
        setProfilePhoto(user.profilePhoto ?? undefined);

        // keep localStorage updated for other parts of the app if you want
        localStorage.setItem("user", JSON.stringify(user));
      } catch (err) {
        // optional: fall back to localStorage if server call fails
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUserInfo(prev => ({
              ...prev,
              name: parsedUser.name || prev.name,
              email: parsedUser.email || prev.email,
            }));
            setProfilePhoto(parsedUser.profilePhoto ?? undefined);
          } catch { }
        }
      } finally {
        // (unrelated) the rest of your initial loads
        fetchAllOutfits()
          .then(raw => {
            const uiList = raw.map(o => ({ ...o, favourite: !!o.favourite, tab: "outfits" }));
            setTopOutfits(uiList.slice(0, 3));
          })
          .catch(err => console.error("Error fetching outfits", err))
          .finally(() => setLoadingOutfits(false));

        getItemCount().then(setClosetCount).catch(console.error);
        getOutfitCount().then(setOutfitCount).catch(console.error);
      }
    })();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserInfo(prev => ({
          ...prev,
          name: parsedUser.name || prev.name,
          email: parsedUser.email || prev.email,
        }));
        setProfilePhoto(parsedUser.profilePhoto);
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
        setTopOutfits(uiList.slice(0, 3));
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
        setShowSuccessPopup(true);
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

  const handleSelectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { user } = await uploadProfilePhoto(file);

      // cache-bust the new image (if you want immediate refresh)
      const busted = user.profilePhoto ? `${user.profilePhoto}?v=${Date.now()}` : undefined;

      setProfilePhoto(busted);
      setUserInfo(prev => ({ ...prev, name: user.name ?? prev.name, email: user.email ?? prev.email }));

      // keep localStorage in sync so other pages see it, too
      localStorage.setItem("user", JSON.stringify({ ...user, profilePhoto: user.profilePhoto }));
    } catch (err: any) {
      console.error(err);
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };


  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n.charAt(0).toUpperCase() + n.slice(1))
      .join(" ");

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
      <div
        className="w-full relative h-40 sm:h-48 md:h-64 -mt-16 mb-16 sm:mb-20 md:mb-24"
        style={{
          backgroundImage: `url(/header.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-30" />

        <div
          className="
      absolute left-4 top-28
      sm:left-6 sm:top-full sm:transform sm:-translate-y-1/2
      z-10
      flex flex-col items-center gap-2
      sm:flex-row sm:items-center sm:gap-6
    "
        >
          <div className="relative">
            <div className="
  w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40
  rounded-full bg-[#3F978F] text-white
  flex items-center justify-center
  text-2xl sm:text-3xl md:text-4xl lg:text-5xl
  font-bodoni overflow-hidden
">
              {profilePhoto ? (
                <img
                  src={absolutize(profilePhoto, API_BASE)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    setProfilePhoto(undefined);
                  }}
                />
              ) : (
                <span>{(userInfo.name || "U").trim().charAt(0).toUpperCase()}</span>
              )}
            </div>


            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 rounded-full bg-black hover:bg-[#2F6F6A] p-1 sm:p-1.5 md:p-2 text-white transition disabled:opacity-60"
              disabled={uploadingPhoto}
              title="Change profile photo"
            >
              <Camera className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSelectPhoto}
            />

            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs">
                Uploading...
              </div>
            )}
          </div>


          <h2 className="-mt-2 sm:mt-14 text-black text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold font-livvic">
            {userInfo.name}
          </h2>
        </div>
      </div>

      {/* Buttons under profile photo */}
      <div className="flex flex-col sm:flex-row justify-start gap-3 sm:gap-4 px-4 sm:px-6 mb-6 sm:mb-8 mt-4 sm:mt-6">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-[#000000] text-white rounded-full font-livvic text-sm sm:text-base hover:bg-[#2F6F6A] transition"
        >
          Edit Profile
        </button>
        <Link to="/appearance" className="block w-full sm:w-auto">
          <button
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-white border border-black text-black rounded-full font-livvic text-sm sm:text-base hover:bg-gray-100 transition"
          >
            Style Settings
          </button>
        </Link>
      </div>

      <div className="w-full px-4 sm:px-6 pb-12">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Profile Showcase */}
          <div className="w-full lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 "
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 text-gray-900 dark:text-gray-100 -mt-4">
                {/* Personal Details */}
                <div className="space-y-4 sm:space-y-5">

                  <div className="space-y-4 sm:space-y-5">
                    <div>
                      <label
                        htmlFor="name"
                        className="flex items-center gap-2 text-xs sm:text-sm font-livvic text-gray-700 dark:text-gray-300"
                      >
                        Name
                      </label>
                      {isEditing ? (
                        <input
                          id="name"
                          value={userInfo.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          className="mt-1 w-full p-2 rounded-full text-black dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3F978F] border border-gray-300 dark:border-gray-600 text-sm sm:text-base"
                        />
                      ) : (
                        <p className="mt-1 text-sm sm:text-base font-livvic">{getInitials(userInfo.name)}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="flex items-center gap-2 text-xs sm:text-sm font-livvic text-gray-700 dark:text-gray-300"
                      >
                        <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                        Email
                      </label>
                      {isEditing ? (
                        <input
                          id="email"
                          type="email"
                          value={userInfo.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          className="mt-1 w-full p-2 rounded-full text-black dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3F978F] border border-gray-300 dark:border-gray-600 text-sm sm:text-base"
                        />
                      ) : (
                        <p className="mt-1 text-sm sm:text-base font-livvic">{userInfo.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Style Stats */}
                <div className="space-y-4 sm:space-y-5">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 sm:p-3 text-center shadow-sm max-w-[100px] sm:max-w-[120px] mx-auto"
                      >
                        <div className="text-base sm:text-lg font-livvic font-bold text-[#3F978F]">
                          {closetCount}
                        </div>
                        <div className="text-xs sm:text-sm font-livvic text-gray-600 dark:text-gray-400">
                          Total Items in Closet
                        </div>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2 sm:p-3 text-center shadow-sm max-w-[100px] sm:max-w-[120px] mx-auto"
                      >
                        <div className="text-base sm:text-lg font-livvic font-bold text-[#3F978F]">
                          {outfitCount}
                        </div>
                        <div className="text-xs sm:text-sm font-livvic text-gray-600 dark:text-gray-400">
                          Total Outfits in Closet
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>

              {isEditing && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="w-full sm:w-auto px-3 sm:px-4 py-1 bg-white dark:bg-gray-700 text-black dark:text-white rounded-full hover:bg-black dark:hover:bg-black transition font-livvic border border-black dark:border-white text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="w-full sm:w-auto px-3 sm:px-4 py-1 bg-[#3F978F] hover:bg-[#2F6F6A] text-white rounded-full transition font-livvic text-sm sm:text-base"
                  >
                    Save
                  </button>
                </div>
              )}
            </motion.div>
          </div>

          {/* Top 6 Outfits Section */}
          <div className="w-full lg:w-1/2">
            <h3 className="text-base sm:text-lg font-livvic font-medium text-[#3F978F] mb-3 sm:mb-4 sm:-mt-32 -mt-8">
              Top Outfits
            </h3>
            {loadingOutfits ? (
              <p className="text-gray-500 text-xs sm:text-sm">Loading outfits...</p>
            ) : topOutfits.length === 0 ? (
              <p className="text-gray-500 text-xs sm:text-sm">No outfits available.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {topOutfits.map((outfit) => (
                  <motion.div
                    key={outfit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.03 }}
                    className="
    relative
    bg-white
    rounded-xl
    p-4
    w-full
    cursor-pointer
    shadow-lg
    hover:shadow-2xl
    transition-shadow
    duration-300
  "
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
                              // src={prefixed(it.imageUrl)}
                              src = {absolutize(it.imageUrl, API_BASE)}
                              alt={`Outfit ${outfit.id} ${it.layerCategory}`}
                              className="w-5 h-5 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain rounded"
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
                              // src={prefixed(it.imageUrl)}
                              src = {absolutize(it.imageUrl, API_BASE)}
                              alt={`Outfit ${outfit.id} ${it.layerCategory}`}
                              className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain rounded"
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
                              // src={prefixed(it.imageUrl)}
                              src = {absolutize(it.imageUrl, API_BASE)}
                              alt={`Outfit ${outfit.id} ${it.layerCategory}`}
                              className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain rounded"
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
                              // src={prefixed(it.imageUrl)}
                              src = {absolutize(it.imageUrl, API_BASE)}
                              alt={`Outfit ${outfit.id} ${it.layerCategory}`}
                              className="w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 object-contain rounded"
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
              <h2 className="text-base sm:text-lg font-livvic mb-2 text-[#3F978F]">
                Changes Saved!
              </h2>
              <p className="mb-4 text-gray-700 dark:text-gray-300 font-livvic text-xs sm:text-sm">
                Your profile has been updated.
              </p>
              <button
                onClick={() => setShowSuccess(false)}
                className="px-4 py-1 bg-[#3F978F] hover:bg-[#2F6F6A] text-white rounded-full transition font-livvic text-sm sm:text-base"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {showSuccessPopup && <Toast message="Profile updated successfully!" />}
    </div>
  );
};

export default Profile;