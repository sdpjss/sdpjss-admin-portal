import { useState, useEffect, useContext } from "react";
import { NavLink } from "react-router-dom";
import { assets } from "../assets/assets";
import { AdminContext } from "../context/AdminContext";
import { toast } from "react-toastify";
import { Settings2, Users, UserCircle2 } from "lucide-react";

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const { aToken, backendUrl, adminRole, allowedFeatures, adminName } =
    useContext(AdminContext); // Get role and permissions

  // Fetch features from backend
  const fetchFeatures = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/api/admin/list?access=admin`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            atoken: aToken,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        // First, get all active features from the backend
        let activeFeatures = data.data
          .filter((feature) => feature.isActive)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        // ✅ **THIS IS THE FIX**: If the user is a regular admin, filter the list again
        if (adminRole === "admin") {
          activeFeatures = activeFeatures.filter((feature) =>
            allowedFeatures.includes(feature._id)
          );
        }
        setFeatures(activeFeatures);
      } else {
        toast.error("Failed to fetch features");
      }
    } catch (error) {
      console.error("Error fetching features:", error);
      toast.error("Error loading sidebar features");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aToken) {
      fetchFeatures();
    }
  }, [aToken, adminRole]);

  // Close sidebar when clicking on a link (mobile only)
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`
        fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r shadow-lg z-40 transition-all duration-300
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        w-64 sm:w-72 lg:w-80 lg:translate-x-0
      `}
      >
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r shadow-lg z-40 transition-all duration-300
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        w-64 sm:w-72 lg:w-80 lg:translate-x-0 flex flex-col
      `}
      >
        {/* Scrollable Features Section */}
        <div className="flex-1 overflow-y-auto">
          <ul className="text-[#515151] mt-5">
            {features.map((feature) => (
              <NavLink
                key={feature._id}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3.5 px-4 sm:px-6 lg:px-8 cursor-pointer transition-colors duration-200 hover:bg-gray-50 ${
                    isActive ? "bg-[#F2F3FF] border-r-4 border-primary" : ""
                  }`
                }
                to={feature.link}
                onClick={handleLinkClick}
              >
                <img
                  src={assets[feature.iconName] || assets.home_icon}
                  alt=""
                  className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
                />
                <p className="text-sm sm:text-base font-medium truncate">
                  {feature.featureName}
                </p>
              </NavLink>
            ))}
          </ul>
        </div>

        {/* Manage Features - Fixed at bottom */}
        {adminRole === "superadmin" && (
          <div className="flex-shrink-0 border-t bg-gray-50 p-3 sm:p-4">
            {/* Manage Features */}
            <NavLink
              className={({ isActive }) =>
                `flex items-center gap-3 py-3 px-4 mb-2 rounded-md transition-colors duration-200 hover:bg-gray-100 ${
                  isActive
                    ? "bg-primary text-white hover:bg-primary"
                    : "text-[#515151]"
                }`
              }
              to="/manage-features"
              onClick={handleLinkClick}
            >
              <Settings2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <p className="text-sm sm:text-base font-medium">
                Manage Features
              </p>
            </NavLink>

            {/* Manage Admins */}
            <NavLink
              className={({ isActive }) =>
                `flex items-center gap-3 py-3 px-4 rounded-md transition-colors duration-200 hover:bg-gray-100 ${
                  isActive
                    ? "bg-primary text-white hover:bg-primary"
                    : "text-[#515151]"
                }`
              }
              to="/manage-admins"
              onClick={handleLinkClick}
            >
              <Users className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
              <p className="text-sm sm:text-base font-medium">Manage Admins</p>
            </NavLink>
          </div>
        )}
        {adminRole === "admin" && (
          <div className="flex-shrink-0 border-t bg-white p-3 sm:p-4">
            <div className="flex items-center gap-3 py-3 px-4 rounded-md bg-slate-50">
              <UserCircle2 className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 text-gray-600" />
              <div className="truncate">
                <p className="text-sm sm:text-base font-semibold text-gray-800">
                  {adminName}
                </p>
                <p className="text-xs sm:text-sm text-gray-500">Admin</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
