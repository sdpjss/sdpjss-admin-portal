import { useState, useEffect, useContext } from "react";
import {
  Bell,
  Plus,
  Edit3,
  Trash2,
  X,
  Save,
  Calendar,
  User,
  Zap,
  AlertCircle,
  Info,
  Award,
  Megaphone,
} from "lucide-react";
import { AdminContext } from "../context/AdminContext"; // Adjust import path as needed

const NoticeBoard = () => {
  const {
    noticeList,
    noticeCount,
    getNoticeList,
    addNotice,
    updateNotice,
    deleteNotice,
    capitalizeEachWord,
  } = useContext(AdminContext);

  const [showModal, setShowModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    icon: "Bell",
    color: "text-blue-500",
    type: "info",
    author: "",
    category: "",
  });

  // Icon mapping
  const iconMap = {
    Bell: Bell,
    Calendar: Calendar,
    Award: Award,
    AlertCircle: AlertCircle,
    Info: Info,
    Megaphone: Megaphone,
    Zap: Zap,
  };

  // Load notices on component mount
  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      await getNoticeList();
      setLoading(false);
    };
    fetchNotices();
  }, []);

  const handleAddNotice = () => {
    setEditingNotice(null);
    setFormData({
      title: "",
      message: "",
      icon: "Bell",
      color: "text-blue-500",
      type: "info",
      author: "",
      category: "",
    });
    setShowModal(true);
  };

  const handleEditNotice = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      message: notice.message,
      icon: notice.icon,
      color: notice.color,
      type: notice.type,
      author: notice.author,
      category: notice.category,
    });
    setShowModal(true);
  };

  const handleDeleteNotice = async (noticeId) => {
    if (window.confirm("Are you sure you want to delete this notice?")) {
      setLoading(true);
      await deleteNotice(noticeId);
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.title ||
      !formData.message ||
      !formData.author ||
      !formData.category
    ) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    let result;

    if (editingNotice) {
      // Update existing notice
      result = await updateNotice(editingNotice._id, formData);
    } else {
      // Add new notice
      result = await addNotice(formData);
    }

    if (result && result.success) {
      setShowModal(false);
      setEditingNotice(null);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "title" || name === "author" || name === "category"
          ? capitalizeEachWord(value)
          : value,
    }));
  };

  const getTypeColor = (type) => {
    const colors = {
      alert: "bg-red-100 text-red-800",
      announcement: "bg-purple-100 text-purple-800",
      event: "bg-blue-100 text-blue-800",
      achievement: "bg-green-100 text-green-800",
      info: "bg-cyan-100 text-cyan-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const IconComponent = iconMap[formData.icon] || Bell;
  const renderIcon = (iconName, className = "w-5 h-5") => {
    const Icon = iconMap[iconName] || Bell;
    return <Icon className={className} />;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " at " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  if (loading && noticeList.length === 0) {
    return (
      <div className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading notices...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Notice Board
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage and view all family notices and announcements
            </p>
          </div>
          <button
            onClick={handleAddNotice}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Notice
          </button>
        </div>
      </div>

      {/* Total Notices Count */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Total Notices
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">
              {noticeCount.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-full bg-blue-100">
            <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Notice List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            All Notices ({noticeCount})
          </h2>
        </div>

        <div className="divide-y divide-gray-100">
          {noticeList.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Bell className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm sm:text-base">
                No notices available. Add your first notice!
              </p>
            </div>
          ) : (
            noticeList.map((notice) => (
              <div key={notice._id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Notice Icon */}
                  <div
                    className={`p-3 rounded-full ${notice.color
                      .replace("text-", "bg-")
                      .replace("-500", "-100")} flex-shrink-0 self-start`}
                  >
                    {renderIcon(
                      notice.icon,
                      `w-5 h-5 sm:w-6 sm:h-6 ${notice.color}`
                    )}
                  </div>

                  {/* Notice Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-lg mb-1">
                          {notice.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${getTypeColor(
                              notice.type
                            )}`}
                          >
                            {notice.type.charAt(0).toUpperCase() +
                              notice.type.slice(1)}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                            {notice.category}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 self-start">
                        <button
                          onClick={() => handleEditNotice(notice)}
                          disabled={loading}
                          className="p-2 bg-blue-100 hover:bg-blue-200 disabled:bg-blue-50 text-blue-700 rounded-lg transition-colors"
                          title="Edit Notice"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNotice(notice._id)}
                          disabled={loading}
                          className="p-2 bg-red-100 hover:bg-red-200 disabled:bg-red-50 text-red-700 rounded-lg transition-colors"
                          title="Delete Notice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Notice Message */}
                    <p className="text-gray-700 text-sm sm:text-base mb-3 leading-relaxed">
                      {notice.message}
                    </p>

                    {/* Notice Meta Information */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>By {notice.author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>
                          {formatDate(notice.time || notice.createdAt)}
                        </span>
                      </div>
                      {notice.updatedAt !== notice.createdAt && (
                        <span className="text-xs text-gray-400">
                          Updated:{" "}
                          {new Date(notice.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {editingNotice ? "Edit Notice" : "Add New Notice"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                  placeholder="Enter notice title"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base resize-vertical disabled:bg-gray-50"
                  placeholder="Enter notice message"
                />
              </div>

              {/* Type, Icon, and Color */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                  >
                    <option value="info">Info</option>
                    <option value="alert">Alert</option>
                    <option value="announcement">Announcement</option>
                    <option value="event">Event</option>
                    <option value="achievement">Achievement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Icon *
                  </label>
                  <select
                    name="icon"
                    value={formData.icon}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                  >
                    <option value="Bell">Bell</option>
                    <option value="Calendar">Calendar</option>
                    <option value="Award">Award</option>
                    <option value="AlertCircle">Alert Circle</option>
                    <option value="Info">Info</option>
                    <option value="Megaphone">Megaphone</option>
                    <option value="Zap">Zap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color *
                  </label>
                  <select
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                  >
                    <option value="text-blue-500">Blue</option>
                    <option value="text-green-500">Green</option>
                    <option value="text-red-500">Red</option>
                    <option value="text-purple-500">Purple</option>
                    <option value="text-orange-500">Orange</option>
                    <option value="text-cyan-500">Cyan</option>
                  </select>
                </div>
              </div>

              {/* Author and Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author *
                  </label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                    placeholder="Enter author name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                    placeholder="Enter category"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Preview:
                </h4>
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-full ${formData.color
                      .replace("text-", "bg-")
                      .replace("-500", "-100")}`}
                  >
                    <IconComponent className={`w-4 h-4 ${formData.color}`} />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 text-sm">
                      {formData.title || "Notice Title"}
                    </h5>
                    <p className="text-xs text-gray-600 mt-1">
                      {formData.message || "Notice message will appear here..."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {loading
                    ? "Processing..."
                    : editingNotice
                    ? "Update Notice"
                    : "Add Notice"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticeBoard;
