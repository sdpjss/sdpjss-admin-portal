import { useState, useEffect } from "react";
import axios from "axios";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Image as ImageIcon,
  User,
  Briefcase,
  Tag,
  Loader,
  Check,
  X,
  AlertCircle,
  Upload,
  UserCheck,
} from "lucide-react";
import { useContext } from "react";
import { AdminContext } from "../context/AdminContext";

const ManageTeam = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    position: "",
    category: "chairman-vicechairman",
    isActive: true,
  });
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const { aToken, backendUrl } = useContext(AdminContext);
  const categories = [
    { value: "chairman-vicechairman", label: "Chairman & Vice-Chairman" },
    { value: "president-vicepresident", label: "President & Vice-President" },
    { value: "secretary", label: "Secretary" },
    { value: "treasurer", label: "Treasurer" },
    { value: "consultant", label: "Consultant" },
    { value: "digital-technical-support", label: "Digital & Technical Support" },
  ];

  useEffect(() => {
    fetchMembers();
  }, []);

  // Auto-dismiss messages after 4 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(
        backendUrl + "/api/admin/all-team-members",
        {
          headers: {
            aToken,
          },
        }
      );
      setMembers(data.teamMembers || []);
      setError("");
    } catch (error) {
      console.error("Error fetching team members:", error);
      setError("Failed to fetch team members. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB.");
        return;
      }

      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Name is required.");
      return false;
    }
    if (!formData.position.trim()) {
      setError("Position is required.");
      return false;
    }
    if (!currentMember && !image) {
      setError("Image is required for new team member.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) return;

    setUploading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name.trim());
      formDataToSend.append("position", formData.position.trim());
      formDataToSend.append("category", formData.category);
      formDataToSend.append("isActive", formData.isActive);

      if (image) {
        formDataToSend.append("image", image);
      }

      let response;
      if (currentMember) {
        response = await axios.put(
          backendUrl + `/api/admin/update-team-member/${currentMember._id}`,
          formDataToSend,
          {
            headers: {
              aToken,
            },
          }
        );
      } else {
        response = await axios.post(
          backendUrl + "/api/admin/add-team-member",
          formDataToSend,
          {
            headers: {
              aToken,
            },
          }
        );
      }

      if (response.data.success) {
        setSuccess(response.data.message);
        fetchMembers();
        handleCloseModal();
      } else {
        setError(response.data.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error saving team member:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to save team member. Please try again.";
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (member) => {
    setCurrentMember(member);
    setFormData({
      name: member.name,
      position: member.position,
      category: member.category,
      isActive: member.isActive,
    });
    setImage(null);
    setImagePreview(null);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const handleDelete = async (id, name) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      try {
        const response = await axios.delete(
          backendUrl + `/api/admin/delete-team-member/${id}`,
          {
            headers: {
              aToken,
            },
          }
        );
        if (response.data.success) {
          setSuccess(response.data.message);
          fetchMembers();
        } else {
          setError(response.data.message || "Failed to delete team member");
        }
      } catch (error) {
        console.error("Error deleting team member:", error);
        const errorMessage =
          error.response?.data?.message ||
          "Failed to delete team member. Please try again.";
        setError(errorMessage);
      }
    }
  };

  const handleToggleStatus = async (memberId, currentStatus) => {
    try {
      const response = await axios.put(
        backendUrl + "/api/admin/team-members/status",
        {
          memberId,
          isActive: !currentStatus,
        },
        {
          headers: {
            aToken,
          },
        }
      );

      if (response.data.success) {
        setSuccess(response.data.message);
        fetchMembers();
      } else {
        setError(response.data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error toggling team member status:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update team member status. Please try again.";
      setError(errorMessage);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setCurrentMember(null);
    setFormData({
      name: "",
      position: "",
      category: "chairman-vicechairman",
      isActive: true,
    });
    setImage(null);
    setImagePreview(null);
    setError("");
    setSuccess("");
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find((cat) => cat.value === category);
    return cat ? cat.label : category;
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">
            {title}
          </p>
          <p className={`text-lg sm:text-2xl font-bold ${color}`}>
            {value.toLocaleString()}
          </p>
        </div>
        <div
          className={`p-2 sm:p-3 rounded-full ${color
            .replace("text-", "bg-")
            .replace("-600", "-100")}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  const Alert = ({ type, message, onClose }) => (
    <div
      className={`rounded-lg p-3 mb-4 ${
        type === "error"
          ? "bg-red-50 border border-red-200 text-red-800"
          : "bg-green-50 border border-green-200 text-green-800"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {type === "error" ? (
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          ) : (
            <Check className="w-4 h-4 mr-2 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{message}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const activeMembers = members.filter((member) => member.isActive);

  if (loading) {
    return (
      <div className="flex-1 p-2 sm:p-4 lg:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading team members...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-2 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">
              Team Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Manage team members and their information
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Member
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-4 sm:mb-6 grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          title="Total Members"
          value={members.length}
          icon={<Users className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />}
          color="text-blue-600"
        />
        <StatCard
          title="Active Members"
          value={activeMembers.length}
          icon={<UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />}
          color="text-green-600"
        />
      </div>

      {/* Alert Messages */}
      {error && (
        <Alert type="error" message={error} onClose={() => setError("")} />
      )}
      {success && (
        <Alert
          type="success"
          message={success}
          onClose={() => setSuccess("")}
        />
      )}

      {/* Team Members Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Team Members
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No team members found</p>
            <p className="text-sm text-gray-400">
              Add your first team member to get started!
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {members.map((member) => (
              <div
                key={member._id}
                className="bg-white rounded-lg shadow-sm border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Member Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover border border-gray-200"
                      onError={(e) => {
                        e.target.src = "/placeholder-avatar.png";
                      }}
                    />
                  </div>

                  {/* Member Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                          {member.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 mb-1">
                          {member.position}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Tag className="w-3 h-3" />
                          <span className="truncate">
                            {getCategoryLabel(member.category)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status and Actions */}
                    <div className="flex items-center justify-between">
                      {/* Status Toggle */}
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={member.isActive}
                          onChange={() =>
                            handleToggleStatus(member._id, member.isActive)
                          }
                          className="sr-only peer"
                        />
                        <div className="relative w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        <span className="ml-2 text-xs font-medium text-gray-700">
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </label>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-1.5 text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                          title="Edit member"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member._id, member.name)}
                          className="p-1.5 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                          title="Delete member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentMember ? "Edit Team Member" : "Add New Team Member"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={uploading}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {error && (
                <Alert
                  type="error"
                  message={error}
                  onClose={() => setError("")}
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline mr-1" />
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter full name"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Briefcase className="w-4 h-4 inline mr-1" />
                        Position *
                      </label>
                      <input
                        type="text"
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        placeholder="Enter position/title"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Tag className="w-4 h-4 inline mr-1" />
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        {categories.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-700">
                        Active (visible on public page)
                      </label>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <ImageIcon className="w-4 h-4 inline mr-1" />
                        Image {!currentMember && "*"}
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-600">
                            Click to upload image
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            Max size: 5MB, Recommended: 400x400px
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Image Preview */}
                    {imagePreview && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Image Preview:
                        </label>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                      </div>
                    )}

                    {/* Current Image */}
                    {currentMember?.image && !imagePreview && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Image:
                        </label>
                        <img
                          src={currentMember.image}
                          alt="Current"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={uploading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                        {currentMember ? "Updating..." : "Adding..."}
                      </>
                    ) : currentMember ? (
                      "Update Member"
                    ) : (
                      "Add Member"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTeam;
