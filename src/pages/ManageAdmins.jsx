// ManageAdmins.js
import { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { AdminContext } from "../context/AdminContext";
import { jwtDecode } from "jwt-decode";
import {
  Trash2,
  Edit3,
  X,
  Plus,
  Eye,
  EyeOff,
  UserX,
} from "lucide-react";

const ManageAdmins = () => {
  const { backendUrl, aToken, setAToken, axiosWithAuth } =
    useContext(AdminContext);
  const [admins, setAdmins] = useState([]);
  const [allFeatures, setAllFeatures] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add" or "edit"
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [showFeatures, setShowFeatures] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    password: "",
    allowedFeatures: [],
  });

  const fetchAdmins = async () => {
    try {
      // Replace axios.get with axiosWithAuth
      const data = await axiosWithAuth("get", "/api/admin/admins");
      if (data.success) {
        setAdmins(data.data);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Error fetching admins");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const url =
      modalMode === "add" ? "/api/admin/add-admin" : "/api/admin/edit-admin";
    const body =
      modalMode === "edit" ? { ...newAdmin, id: currentAdmin._id } : newAdmin;

    try {
      // Replace axios.post with axiosWithAuth
      const data = await axiosWithAuth("post", url, body);
      if (data.success) {
        toast.success(
          modalMode === "add"
            ? "Admin added successfully!"
            : "Admin updated successfully!"
        );
        closeModal();
        fetchAdmins();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Error saving admin");
    }
  };
  const fetchAllFeatures = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/admin/list`, {
        headers: { atoken: aToken },
      });
      const data = await response.json();
      if (data.success) {
        setAllFeatures(data.data);
      } else {
        toast.error("Failed to fetch features for selection");
      }
    } catch (error) {
      toast.error("Error fetching features");
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetchAllFeatures();
  }, []);

  const resetForm = () => {
    setNewAdmin({ name: "", email: "", password: "", allowedFeatures: [] });
    setCurrentAdmin(null);
    setModalMode("add");
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (admin) => {
    // Prevent editing if admin is blocked
    if (!admin.isApproved) {
      toast.warn("Blocked admins cannot be edited.");
      return;
    }
    setCurrentAdmin(admin);
    setNewAdmin({
      name: admin.name,
      email: admin.email,
      password: "", // Don't pre-fill password for security
      allowedFeatures: admin.allowedFeatures.map((f) => f._id),
    });
    setModalMode("edit");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    setNewAdmin({ ...newAdmin, [e.target.name]: e.target.value });
  };

  const handleFeatureToggle = (featureId) => {
    let selectedFeatures = [...newAdmin.allowedFeatures];
    if (selectedFeatures.includes(featureId)) {
      selectedFeatures = selectedFeatures.filter((id) => id !== featureId);
    } else {
      selectedFeatures.push(featureId);
    }
    setNewAdmin({ ...newAdmin, allowedFeatures: selectedFeatures });
  };

  const handleBlockAdmin = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to block this admin? This will revoke all their permissions."
      )
    ) {
      try {
        const response = await fetch(`${backendUrl}/api/admin/block-admin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            atoken: aToken,
          },
          body: JSON.stringify({ id }),
        });
        const data = await response.json();
        if (data.success) {
          toast.success(data.message);
          fetchAdmins();

          // Check if the currently logged-in admin is the one being blocked
          const decodedToken = jwtDecode(aToken);
          if (decodedToken.id === id) {
            // If so, force a logout by removing the token
            localStorage.removeItem("atoken");
            setAToken(null); // This will trigger the blocked modal in App.js
          }
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error("Error blocking admin");
      }
    }
  };

  const handleRemoveAdmin = async (id) => {
    if (
      window.confirm(
        "This action is permanent. Are you sure you want to delete this admin?"
      )
    ) {
      try {
        const response = await fetch(`${backendUrl}/api/admin/remove-admin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            atoken: aToken,
          },
          body: JSON.stringify({ id }),
        });
        const data = await response.json();
        if (data.success) {
          toast.success(data.message);
          fetchAdmins();
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        toast.error("Error removing admin");
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Manage Admins</h2>
        <button
          onClick={openAddModal}
          className="bg-primary text-white py-2 px-4 rounded-md hover:bg-opacity-90 flex items-center gap-2"
        >
          <Plus size={20} />
          Add New Admin
        </button>
      </div>

      {/* Admin List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-medium text-gray-700 mb-4">
          Existing Admins ({admins.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 font-medium text-gray-600">Name</th>
                <th className="p-3 font-medium text-gray-600">Email</th>
                <th className="p-3 font-medium text-gray-600">Status</th>
                <th className="p-3 font-medium text-gray-600">
                  Features Access
                </th>
                <th className="p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.length > 0 ? (
                admins.map((admin) => (
                  <tr key={admin._id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{admin.name}</td>
                    <td className="p-3 text-gray-600">{admin.email}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.isApproved
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {admin.isApproved ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="p-3">
                      {admin.allowedFeatures &&
                      admin.allowedFeatures.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {admin.allowedFeatures.map((feature) => (
                            <span
                              key={feature._id}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {feature.featureName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">
                          No features assigned
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {admin.isApproved ? (
                          <>
                            <button
                              onClick={() => openEditModal(admin)}
                              className="text-blue-500 hover:text-blue-700 p-1 rounded"
                              title="Edit Admin"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button
                              onClick={() => handleBlockAdmin(admin._id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded"
                              title="Block Admin"
                            >
                              <UserX size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleRemoveAdmin(admin._id)}
                            className="text-red-500 hover:text-red-700 p-1 rounded"
                            title="Delete Admin"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">
                    No admins found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">
                {modalMode === "add" ? "Add New Admin" : "Edit Admin"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={newAdmin.name}
                  onChange={handleInputChange}
                  placeholder="Admin Name"
                  required
                  className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={newAdmin.email}
                  onChange={handleInputChange}
                  placeholder="admin@example.com"
                  required
                  className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password{" "}
                  {modalMode === "edit" && "(Leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  name="password"
                  value={newAdmin.password}
                  onChange={handleInputChange}
                  placeholder="Enter password"
                  required={modalMode === "add"}
                  className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Feature Permissions
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowFeatures(!showFeatures)}
                    className="flex items-center gap-2 text-primary hover:text-primary/80"
                  >
                    {showFeatures ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showFeatures ? "Hide" : "Show"} Features
                  </button>
                </div>

                {showFeatures && (
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto bg-gray-50">
                    {allFeatures.length > 0 ? (
                      <div className="space-y-2">
                        {allFeatures.map((feature) => (
                          <label
                            key={feature._id}
                            className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer"
                          >
                            <span className="text-sm">
                              {feature.featureName}
                            </span>
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={newAdmin.allowedFeatures.includes(
                                  feature._id
                                )}
                                onChange={() =>
                                  handleFeatureToggle(feature._id)
                                }
                                className="sr-only"
                              />
                              <div
                                className={`w-10 h-6 rounded-full transition-colors ${
                                  newAdmin.allowedFeatures.includes(feature._id)
                                    ? "bg-primary"
                                    : "bg-gray-300"
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${
                                    newAdmin.allowedFeatures.includes(
                                      feature._id
                                    )
                                      ? "translate-x-5"
                                      : "translate-x-1"
                                  } mt-1`}
                                />
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No features available
                      </p>
                    )}
                  </div>
                )}

                {!showFeatures && newAdmin.allowedFeatures.length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    {newAdmin.allowedFeatures.length} feature(s) selected
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-opacity-90"
                >
                  {modalMode === "add" ? "Add Admin" : "Update Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAdmins;
