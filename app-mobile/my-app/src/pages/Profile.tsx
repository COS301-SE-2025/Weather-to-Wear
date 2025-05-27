import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Settings,
  Camera,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: "User Name",
    email: "user@email.com",
    phone: "+1 (555) 123-4567",
    location: "South Africa, SA",
    joinDate: "May 2024",
  });

  // Fetch user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserInfo(prev => ({
          ...prev,
          name: parsedUser.name || prev.name,
          email: parsedUser.email || prev.email
        }));
      } catch (error) {
        console.error('Failed to parse user data', error);
      }
    }
  }, []);

  const handleSave = () => {
    setIsEditing(false);
    // Update localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        localStorage.setItem('user', JSON.stringify({
          ...parsedUser,
          name: userInfo.name,
          email: userInfo.email
        }));
      } catch (error) {
        console.error('Failed to update user data', error);
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setUserInfo(prev => ({
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-bold mb-2 text-black dark:text-gray-100"
          style={{ fontFamily: "'Bodoni Moda', serif" }}
        >
          My Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="text-center p-6">
          <div className="relative mx-auto w-32 h-32 mb-4">
            <div className="w-32 h-32 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 flex items-center justify-center text-2xl font-medium">
              {getInitials(userInfo.name)}
            </div>
            <button className="absolute bottom-0 right-0 rounded-full bg-teal-500 hover:bg-teal-600 p-2 text-white">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-semibold text-black dark:text-gray-100">
              {userInfo.name}
            </h2>
            <button
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="h-4 w-4 text-black dark:text-gray-100" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 text-black dark:text-gray-100">
          {/* Personal Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-black dark:text-gray-100">
                <User className="h-5 w-5 text-black dark:text-gray-100" />
                Personal Information
              </h3>

              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      id="name"
                      value={userInfo.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="mt-1 w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {userInfo.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Mail className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      id="email"
                      type="email"
                      value={userInfo.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="mt-1 w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {userInfo.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Phone className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    Phone
                  </label>
                  {isEditing ? (
                    <input
                      id="phone"
                      value={userInfo.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      className="mt-1 w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {userInfo.phone}
                    </p>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label htmlFor="location" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <MapPin className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    Location
                  </label>
                  {isEditing ? (
                    <input
                      id="location"
                      value={userInfo.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className="mt-1 w-full p-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-black dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  ) : (
                    <p className="mt-1 text-gray-900 dark:text-gray-100">
                      {userInfo.location}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Stats */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-black dark:text-gray-100">
                <Settings className="h-5 w-5 text-black dark:text-gray-100" />
                Account Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Member since
                  </span>
                  <span className="text-sm font-medium text-black dark:text-gray-100">
                    {userInfo.joinDate}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-teal-600">24</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Clothing Items
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-teal-600">8</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Saved Outfits
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-gray-300 dark:border-gray-600">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-black dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Settings Card */}
        <Link to="/appearance" className="block">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow">
            <div className="p-6 text-center">
              <Settings className="h-8 w-8 mx-auto mb-3 text-teal-500" />
              <h3 className="font-semibold mb-2 text-black dark:text-gray-100">
                Settings
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage app preferences
              </p>
            </div>
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow">
          <div className="p-6 text-center">
            <User className="h-8 w-8 mx-auto mb-3 text-teal-500" />
            <h3 className="font-semibold mb-2 text-black dark:text-gray-100">
              Privacy
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Control your privacy
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow">
          <div className="p-6 text-center">
            <Mail className="h-8 w-8 mx-auto mb-3 text-teal-500" />
            <h3 className="font-semibold mb-2 text-black dark:text-gray-100">
              Support
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get help and support
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;