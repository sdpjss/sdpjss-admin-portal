import { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AdminContext } from "../context/AdminContext";

const ManageFeatures = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const [features, setFeatures] = useState([]);

  // <<< NEW: State to manage which feature list to show (admin vs. user)
  const [currentView, setCurrentView] = useState("admin");

  const [newFeature, setNewFeature] = useState({
    featureName: "",
    link: "",
    iconName: "home_icon", // Default icon
    access: "admin", // <<< NEW: Default access level for new features
  });

  const [editFeature, setEditFeature] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const iconOptions = [
    "home_icon",
    "family_list",
    "advertisement_list",
    "user_list",
    "staff_requirement_list",
    "job_opening_list",
    "notice_board",
    "donation_list",
    "manage_team",
    "user_receipt",
    "guest_receipt",
    "guest_list",
    "team_list",
    "family_tree",
    "printing_portal",
  ];

  // <<< CHANGED: fetchFeatures now accepts a parameter to filter by access
  const fetchFeatures = async (view) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${backendUrl}/api/admin/list?access=${view}`, // Send access type as query param
        { headers: { aToken } }
      );
      if (response.data.success) {
        setFeatures(response.data.data);
      } else {
        alert("Failed to fetch features");
      }
    } catch (error) {
      console.error("Error fetching features:", error);
      alert("Error fetching features");
    } finally {
      setLoading(false);
    }
  };

  // <<< CHANGED: useEffect now re-fetches when currentView changes
  useEffect(() => {
    fetchFeatures(currentView);
  }, [currentView]); // Dependency array includes currentView

  const handleInputChange = (e) => {
    setNewFeature({ ...newFeature, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditFeature({ ...editFeature, [e.target.name]: e.target.value });
  };

  const handleAddFeature = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(
        `${backendUrl}/api/admin/add`,
        newFeature,
        { headers: { aToken } }
      );
      if (response.data.success) {
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300";
        notification.textContent = "Feature added successfully!";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);

        setNewFeature({
          featureName: "",
          link: "",
          iconName: "home_icon",
          access: "admin",
        });
        fetchFeatures(currentView); // Refresh list
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Error adding feature:", error);
      alert("Error adding feature");
    } finally {
      setLoading(false);
    }
  };

  const handleEditFeature = (feature) => {
    setEditFeature({
      _id: feature._id,
      featureName: feature.featureName,
      link: feature.link,
      iconName: feature.iconName,
      isActive: feature.isActive,
      access: feature.access, // <<< NEW: Set access level for editing
    });
    setShowEditModal(true);
  };

  const handleUpdateFeature = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.put(
        `${backendUrl}/api/admin/update/${editFeature._id}`,
        editFeature, // Send the whole editFeature object
        { headers: { aToken } }
      );
      if (response.data.success) {
        const notification = document.createElement("div");
        notification.className =
          "fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300";
        notification.textContent = "Feature updated successfully!";
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);

        setShowEditModal(false);
        setEditFeature(null);
        fetchFeatures(currentView); // Refresh list
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Error updating feature:", error);
      alert("Error updating feature");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFeature = async (id, featureName) => {
    if (window.confirm(`Are you sure you want to delete "${featureName}"?`)) {
      try {
        setLoading(true);
        const response = await axios.post(
          `${backendUrl}/api/admin/remove`,
          { id },
          { headers: { aToken } }
        );
        if (response.data.success) {
          const notification = document.createElement("div");
          notification.className =
            "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300";
          notification.textContent = "Feature deleted successfully!";
          document.body.appendChild(notification);
          setTimeout(() => notification.remove(), 3000);
          fetchFeatures(currentView);
        } else {
          alert("Error removing feature");
        }
      } catch (error) {
        console.error("Error removing feature:", error);
        alert("Error removing feature");
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleActiveStatus = async (feature) => {
    try {
      setLoading(true); // Disable buttons while toggling
      const updatedStatus = { isActive: !feature.isActive };
      const response = await axios.put(
        `${backendUrl}/api/admin/update/${feature._id}`,
        updatedStatus,
        { headers: { aToken } }
      );
      if (response.data.success) {
        fetchFeatures(currentView);
      } else {
        alert("Error updating status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status");
    } finally {
      setLoading(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditFeature(null);
  };

  const ToggleSwitch = ({ isActive, onToggle, disabled }) => (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${
        isActive ? "bg-green-500" : "bg-gray-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
          isActive ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manage Sidebar Features
          </h1>
          <p className="text-gray-600">
            Add, edit, and manage your application's sidebar features
          </p>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
            {" "}
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              {" "}
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>{" "}
              <span className="text-gray-700 font-medium">Processing...</span>{" "}
            </div>{" "}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Add New Feature
          </h2>
          <form
            onSubmit={handleAddFeature}
            className="grid grid-cols-1 md:grid-cols-5 gap-6"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feature Name
              </label>
              <input
                type="text"
                name="featureName"
                value={newFeature.featureName}
                onChange={handleInputChange}
                placeholder="e.g., Dashboard"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link/Route
              </label>
              <input
                type="text"
                name="link"
                value={newFeature.link}
                onChange={handleInputChange}
                placeholder="e.g., /dashboard"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <select
                name="iconName"
                value={newFeature.iconName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                disabled={loading}
              >
                {iconOptions.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            {/* <<< NEW: Access Level Radio Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access
              </label>
              <div className="flex flex-col space-y-1 h-full">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="access"
                    value="admin"
                    checked={newFeature.access === "admin"}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">Admin</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="access"
                    value="user"
                    checked={newFeature.access === "user"}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="ml-2 text-sm text-gray-700">User</span>
                </label>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                disabled={loading}
              >
                Add Feature
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Features List
            </h2>
            {/* <<< NEW: Toggle switch for Admin/User views */}
            <div className="flex items-center bg-gray-200 rounded-lg p-1">
              <button
                onClick={() => setCurrentView("admin")}
                className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentView === "admin"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-300"
                }`}
              >
                Admin Features
              </button>
              <button
                onClick={() => setCurrentView("user")}
                className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${
                  currentView === "user"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-300"
                }`}
              >
                User Features
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Feature
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Route
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Icon
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {features.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-16 text-center text-gray-500"
                    >
                      No features found for the selected access level.
                    </td>
                  </tr>
                ) : (
                  features.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {item.featureName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {item.link}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {item.iconName.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <ToggleSwitch
                            isActive={item.isActive}
                            onToggle={() => toggleActiveStatus(item)}
                            disabled={loading}
                          />
                          <span
                            className={`text-xs font-medium ${
                              item.isActive ? "text-green-600" : "text-gray-500"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-3">
                          <button
                            onClick={() => handleEditFeature(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                            disabled={loading}
                            title="Edit feature"
                          >
                            <svg
                              className="w-4 h-4 group-hover:scale-110 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              handleRemoveFeature(item._id, item.featureName)
                            }
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors group"
                            disabled={loading}
                            title="Delete feature"
                          >
                            <svg
                              className="w-4 h-4 group-hover:scale-110 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showEditModal && editFeature && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">
                  Edit Feature
                </h3>
                <button
                  onClick={closeEditModal}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                  disabled={loading}
                >
                  {" "}
                  {/* Close Icon */}{" "}
                </button>
              </div>
              <form onSubmit={handleUpdateFeature} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feature Name
                  </label>
                  <input
                    type="text"
                    name="featureName"
                    value={editFeature.featureName}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link/Route
                  </label>
                  <input
                    type="text"
                    name="link"
                    value={editFeature.link}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon
                  </label>
                  <select
                    name="iconName"
                    value={editFeature.iconName}
                    onChange={handleEditInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                    disabled={loading}
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                {/* <<< NEW: Access Level Radio Buttons in Edit Modal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access
                  </label>
                  <div className="flex items-center space-x-4 pt-1">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="access"
                        value="admin"
                        checked={editFeature.access === "admin"}
                        onChange={handleEditInputChange}
                        className="h-4 w-4 text-blue-600"
                        disabled={loading}
                      />
                      <span className="ml-2 text-sm text-gray-700">Admin</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="access"
                        value="user"
                        checked={editFeature.access === "user"}
                        onChange={handleEditInputChange}
                        className="h-4 w-4 text-blue-600"
                        disabled={loading}
                      />
                      <span className="ml-2 text-sm text-gray-700">User</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Feature Status
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Enable or disable this feature
                    </p>
                  </div>
                  <ToggleSwitch
                    isActive={editFeature.isActive}
                    onToggle={() =>
                      setEditFeature({
                        ...editFeature,
                        isActive: !editFeature.isActive,
                      })
                    }
                    disabled={loading}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg"
                    disabled={loading}
                  >
                    Update Feature
                  </button>
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageFeatures;
