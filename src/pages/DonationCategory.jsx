import { useState, useEffect, useContext } from "react";
import { Plus, Edit, Trash2, Save, X, Truck, Zap } from "lucide-react";
import { AdminContext } from "../context/AdminContext"; // Adjust path as needed
import { toast } from "react-toastify";
import axios from "axios";

const DonationCategory = () => {
  const { aToken, backendUrl, formatIndianCommas, capitalizeEachWord } =
    useContext(AdminContext);
  const [standardCategories, setStandardCategories] = useState([]);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [courierCharges, setCourierCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courierLoading, setCourierLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingCourierId, setEditingCourierId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [courierSubmitting, setCourierSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("categories");

  const [formData, setFormData] = useState({
    categoryName: "",
    rate: "",
    weight: "",
    packet: false,
    description: "",
    dynamic: {
      isDynamic: false,
      minvalue: 0,
    },
  });

  const [courierFormData, setCourierFormData] = useState({
    region: "",
    amount: "",
  });

  const regionOptions = [
    { value: "in_gaya_outside_manpur", label: "In Gaya outside Manpur" },
    { value: "in_bihar_outside_gaya", label: "In Bihar outside Gaya" },
    { value: "in_india_outside_bihar", label: "In India outside Bihar" },
    { value: "outside_india", label: "Outside India" },
  ];

  useEffect(() => {
    if (aToken) {
      fetchCategories();
      fetchCourierCharges();
    }
  }, [aToken]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(backendUrl + "/api/admin/categories", {
        headers: { aToken },
      });

      if (data.success) {
        const standard = data.categories.filter(
          (cat) => !cat.dynamic?.isDynamic
        );
        const dynamic = data.categories.filter((cat) => cat.dynamic?.isDynamic);
        setStandardCategories(standard);
        setDynamicCategories(dynamic);
      } else {
        toast.error(data.message || "Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error(error.response?.data?.message || "Error fetching categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourierCharges = async () => {
    try {
      setCourierLoading(true);
      const { data } = await axios.get(
        backendUrl + "/api/admin/courier-charges",
        {
          headers: { aToken },
        }
      );

      if (data.success) {
        setCourierCharges(data.courierCharges);
      } else {
        toast.error(data.message || "Failed to fetch courier charges");
      }
    } catch (error) {
      console.error("Error fetching courier charges:", error);
      toast.error(
        error.response?.data?.message || "Error fetching courier charges"
      );
    } finally {
      setCourierLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "isDynamic") {
      setFormData((prev) => ({
        ...prev,
        dynamic: { ...prev.dynamic, isDynamic: checked },
      }));
    } else if (name === "minvalue") {
      setFormData((prev) => ({
        ...prev,
        dynamic: { ...prev.dynamic, minvalue: value },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : capitalizeEachWord(value),
      }));
    }
  };

  const handleCourierInputChange = (e) => {
    const { name, value } = e.target;
    setCourierFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.categoryName || !formData.rate || !formData.weight) {
      toast.error("Category name, rate, and weight are required");
      return;
    }
    if (
      formData.dynamic.isDynamic &&
      (!formData.dynamic.minvalue || formData.dynamic.minvalue < 0)
    ) {
      toast.error("A valid minimum value is required for dynamic categories.");
      return;
    }

    try {
      setSubmitting(true);
      const requestData = {
        categoryName: formData.categoryName.trim(),
        rate: Number(formData.rate),
        weight: Number(formData.weight),
        packet: formData.packet,
        description: formData.description.trim(),
        dynamic: formData.dynamic,
      };

      let response;
      if (editingId) {
        response = await axios.put(
          backendUrl + `/api/admin/categories/${editingId}`,
          requestData,
          { headers: { aToken } }
        );
      } else {
        response = await axios.post(
          backendUrl + "/api/admin/categories",
          requestData,
          { headers: { aToken } }
        );
      }

      if (response.data.success) {
        toast.success(response.data.message);
        resetForm();
        await fetchCategories();
      } else {
        toast.error(response.data.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error(
        error.response?.data?.message ||
          "Error saving category. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCourierSubmit = async () => {
    if (!courierFormData.region || !courierFormData.amount) {
      toast.error("Region and amount are required");
      return;
    }

    try {
      setCourierSubmitting(true);
      const requestData = {
        region: courierFormData.region,
        amount: Number(courierFormData.amount),
      };

      let response;
      if (editingCourierId) {
        response = await axios.put(
          backendUrl + `/api/admin/courier-charges/${editingCourierId}`,
          requestData,
          { headers: { aToken } }
        );
      } else {
        response = await axios.post(
          backendUrl + "/api/admin/courier-charges",
          requestData,
          { headers: { aToken } }
        );
      }

      if (response.data.success) {
        toast.success(response.data.message);
        resetCourierForm();
        await fetchCourierCharges();
      } else {
        toast.error(response.data.message || "Operation failed");
      }
    } catch (error) {
      console.error("Error saving courier charge:", error);
      toast.error(
        error.response?.data?.message ||
          "Error saving courier charge. Please try again."
      );
    } finally {
      setCourierSubmitting(false);
    }
  };

  const handleAddCategory = () => {
    setEditingId(null);
    setFormData({
      categoryName: "",
      rate: "",
      weight: "",
      packet: false,
      description: "",
      dynamic: {
        isDynamic: false,
        minvalue: 0,
      },
    });
    setShowModal(true);
  };

  const handleAddCourierCharge = () => {
    setEditingCourierId(null);
    setCourierFormData({
      region: "",
      amount: "",
    });
    setShowCourierModal(true);
  };

  const handleEdit = (category) => {
    setFormData({
      categoryName: category.categoryName,
      rate: category.rate.toString(),
      weight: category.weight.toString(),
      packet: category.packet,
      description: category.description || "",
      dynamic: {
        isDynamic: category.dynamic?.isDynamic || false,
        minvalue: category.dynamic?.minvalue || 0,
      },
    });
    setEditingId(category._id);
    setShowModal(true);
  };

  const handleEditCourierCharge = (courierCharge) => {
    setCourierFormData({
      region: courierCharge.region,
      amount: courierCharge.amount.toString(),
    });
    setEditingCourierId(courierCharge._id);
    setShowCourierModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        const { data } = await axios.delete(
          backendUrl + `/api/admin/categories/${id}`,
          { headers: { aToken } }
        );

        if (data.success) {
          toast.success(data.message);
          await fetchCategories();
        } else {
          toast.error(data.message || "Failed to delete category");
        }
      } catch (error) {
        console.error("Error deleting category:", error);
        toast.error(
          error.response?.data?.message ||
            "Error deleting category. Please try again."
        );
      }
    }
  };

  const handleDeleteCourierCharge = async (id) => {
    if (
      window.confirm("Are you sure you want to delete this courier charge?")
    ) {
      try {
        const { data } = await axios.delete(
          backendUrl + `/api/admin/courier-charges/${id}`,
          { headers: { aToken } }
        );

        if (data.success) {
          toast.success(data.message);
          await fetchCourierCharges();
        } else {
          toast.error(data.message || "Failed to delete courier charge");
        }
      } catch (error) {
        console.error("Error deleting courier charge:", error);
        toast.error(
          error.response?.data?.message ||
            "Error deleting courier charge. Please try again."
        );
      }
    }
  };

  const resetForm = () => {
    setFormData({
      categoryName: "",
      rate: "",
      weight: "",
      packet: false,
      description: "",
      dynamic: {
        isDynamic: false,
        minvalue: 0,
      },
    });
    setEditingId(null);
    setShowModal(false);
  };

  const resetCourierForm = () => {
    setCourierFormData({
      region: "",
      amount: "",
    });
    setEditingCourierId(null);
    setShowCourierModal(false);
  };

  const getRegionLabel = (regionValue) => {
    const region = regionOptions.find((r) => r.value === regionValue);
    return region ? region.label : regionValue;
  };

  if (
    loading &&
    standardCategories.length === 0 &&
    dynamicCategories.length === 0
  ) {
    return (
      <div className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Helper component for rendering category tables
  const CategoryTable = ({ title, categories, icon }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
      <div className="p-4 sm:p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
            {icon}
            {title} ({categories.length})
          </h2>
          {title === "Standard Categories" && (
            <button
              onClick={handleAddCategory}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          )}
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {categories.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-500 text-sm sm:text-base">
              No {title.toLowerCase()} available.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Category Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Base Rate
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Base Weight
                  </th>
                  {title.includes("Dynamic") && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Min. Weight
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Packet
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category._id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {category.categoryName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      ₹ {formatIndianCommas(category.rate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {category.weight} g
                    </td>
                    {title.includes("Dynamic") && (
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {category.dynamic.minvalue} g
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          category.packet
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {category.packet ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                      {category.description || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          disabled={loading}
                          className="p-2 bg-blue-100 hover:bg-blue-200 disabled:bg-blue-50 text-blue-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(category._id)}
                          disabled={loading}
                          className="p-2 bg-red-100 hover:bg-red-200 disabled:bg-red-50 text-red-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              Donation Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage donation categories and courier charges
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("categories")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "categories"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Categories ({standardCategories.length + dynamicCategories.length}
              )
            </button>
            <button
              onClick={() => setActiveTab("courier")}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === "courier"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Truck className="w-4 h-4" />
              Courier Charges ({courierCharges.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div>
          <CategoryTable
            title="Standard Categories"
            categories={standardCategories}
            icon={<Plus className="w-5 h-5" />}
          />
          <CategoryTable
            title="Dynamic Categories"
            categories={dynamicCategories}
            icon={<Zap className="w-5 h-5 text-yellow-500" />}
          />
        </div>
      )}

      {/* Courier Charges Tab */}
      {activeTab === "courier" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Courier Charges ({courierCharges.length})
              </h2>
              <button
                onClick={handleAddCourierCharge}
                disabled={courierLoading}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Courier Charge
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {courierCharges.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Truck className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-sm sm:text-base">
                  No courier charges configured. Add your first courier charge!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Region
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courierCharges.map((charge) => (
                      <tr
                        key={charge._id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {getRegionLabel(charge.region)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          ₹ {formatIndianCommas(charge.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCourierCharge(charge)}
                              disabled={courierLoading}
                              className="p-2 bg-blue-100 hover:bg-blue-200 disabled:bg-blue-50 text-blue-700 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteCourierCharge(charge._id)
                              }
                              disabled={courierLoading}
                              className="p-2 bg-red-100 hover:bg-red-200 disabled:bg-red-50 text-red-700 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {editingId ? "Edit Category" : "Add New Category"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* --- DYNAMIC CATEGORY TOGGLE --- */}
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isDynamic"
                    id="isDynamic"
                    checked={formData.dynamic.isDynamic}
                    onChange={handleInputChange}
                    disabled={submitting}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <label
                    htmlFor="isDynamic"
                    className="ml-2 block text-sm font-medium text-yellow-800"
                  >
                    This is a Dynamic Category
                  </label>
                </div>
                <p className="text-xs text-yellow-700 mt-2">
                  Enable this if users can donate a custom amount for this
                  category. The weight will be calculated proportionally.
                </p>
              </div>

              {/* --- STANDARD INPUTS --- */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name *
                </label>
                <input
                  type="text"
                  name="categoryName"
                  value={formData.categoryName}
                  onChange={handleInputChange}
                  required
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                  placeholder="Enter category name"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.dynamic.isDynamic
                      ? "Base Rate (₹) *"
                      : "Rate (₹) *"}
                  </label>
                  <input
                    type="number"
                    name="rate"
                    value={formData.rate}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                    placeholder="Enter rate"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.dynamic.isDynamic
                      ? "Base Weight (g) *"
                      : "Weight (g) *"}
                  </label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                    placeholder="Enter weight"
                  />
                </div>
              </div>

              {/* --- DYNAMIC-ONLY INPUT --- */}
              {formData.dynamic.isDynamic && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Weight (g) *
                  </label>
                  <input
                    type="number"
                    name="minvalue"
                    value={formData.dynamic.minvalue}
                    onChange={handleInputChange}
                    min="0"
                    required
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                    placeholder="Min. weight for small donations"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Weight to be assigned if donation amount is less than the
                    base rate.
                  </p>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="packet"
                  checked={formData.packet}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Packet Required
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base resize-vertical disabled:bg-gray-50"
                  placeholder="Enter description (optional)"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {submitting
                    ? "Processing..."
                    : editingId
                    ? "Update Category"
                    : "Add Category"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courier Charges Modal */}
      {showCourierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  {editingCourierId
                    ? "Edit Courier Charge"
                    : "Add New Courier Charge"}
                </h3>
                <button
                  onClick={() => setShowCourierModal(false)}
                  disabled={courierSubmitting}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region *
                </label>
                <select
                  name="region"
                  value={courierFormData.region}
                  onChange={handleCourierInputChange}
                  required
                  disabled={courierSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                >
                  <option value="">Select Region</option>
                  {regionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  name="amount"
                  value={courierFormData.amount}
                  onChange={handleCourierInputChange}
                  min="0"
                  step="0.01"
                  required
                  disabled={courierSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                  placeholder="Enter courier charge amount"
                />
                <p className="mt-2 text-sm text-gray-500">
                  If there are no charges for a specific region, you do not need
                  to add an entry for it.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCourierSubmit}
                  disabled={courierSubmitting}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {courierSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {courierSubmitting
                    ? "Processing..."
                    : editingCourierId
                    ? "Update Courier Charge"
                    : "Add Courier Charge"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCourierModal(false)}
                  disabled={courierSubmitting}
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

export default DonationCategory;
