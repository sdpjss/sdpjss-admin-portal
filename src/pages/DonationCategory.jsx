import { Fragment, useState, useEffect, useContext } from "react";
import { Plus, Edit, Trash2, Save, X, Truck, Zap } from "lucide-react";
import { AdminContext } from "../context/AdminContext"; // Adjust path as needed
import { toast } from "react-toastify";
import axios from "axios";

const currentYear = new Date().getFullYear();
const firstRateYear = 2025;
const rateYears = Array.from(
  { length: currentYear - firstRateYear + 1 },
  (_, index) => firstRateYear + index
);
const isValidRateYear = (value) => {
  if (value === "") return false;
  const year = Number(value);
  return (
    Number.isInteger(year) && year >= firstRateYear && year <= currentYear
  );
};

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
  const [selectedRateYear, setSelectedRateYear] = useState(currentYear);
  const [selectedCourierYear, setSelectedCourierYear] = useState(currentYear);

  const [formData, setFormData] = useState({
    categoryName: "",
    rate: "",
    rateYear: currentYear,
    yearlyRates: [],
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
    amountYear: currentYear,
    yearlyAmounts: [],
  });

  const regionOptions = [
    { value: "in_gaya_outside_manpur", label: "In Gaya outside Manpur" },
    { value: "in_bihar_outside_gaya", label: "In Bihar outside Gaya" },
    { value: "in_india_outside_bihar", label: "In India outside Bihar" },
    { value: "outside_india", label: "Outside India" },
  ];

  useEffect(() => {
    if (aToken && isValidRateYear(selectedRateYear)) {
      fetchCategories();
    }
  }, [aToken, selectedRateYear]);

  useEffect(() => {
    if (aToken && isValidRateYear(selectedCourierYear)) {
      fetchCourierCharges();
    }
  }, [aToken, selectedCourierYear]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(backendUrl + "/api/admin/categories", {
        headers: { aToken },
        params: { year: selectedRateYear, includeUnconfigured: true },
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
          params: { year: selectedCourierYear, includeUnconfigured: true },
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
    } else if (name === "rateYear") {
      const year = Number(value);
      const configuredRate = formData.yearlyRates.find(
        (item) => item.year === year
      );
      setFormData((prev) => ({
        ...prev,
        rateYear: value,
        rate: configuredRate ? configuredRate.rate.toString() : "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]:
          type === "checkbox"
            ? checked
            : type === "number"
            ? value
            : capitalizeEachWord(value),
      }));
    }
  };

  const handleCourierInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "amountYear") {
      const year = Number(value);
      const configuredAmount = courierFormData.yearlyAmounts.find(
        (item) => item.year === year
      );
      setCourierFormData((prev) => ({
        ...prev,
        amountYear: value,
        amount: configuredAmount ? configuredAmount.amount.toString() : "",
      }));
      return;
    }

    setCourierFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (
      !formData.categoryName ||
      formData.rate === "" ||
      !formData.rateYear ||
      (formData.weight === "" && !formData.packet)
    ) {
      toast.error("Category name, rate year, rate, and weight/packet are required");
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
        rateYear: Number(formData.rateYear),
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
    if (
      !courierFormData.region ||
      courierFormData.amount === "" ||
      !courierFormData.amountYear
    ) {
      toast.error("Region, amount year, and amount are required");
      return;
    }

    try {
      setCourierSubmitting(true);
      const requestData = {
        region: courierFormData.region,
        amount: Number(courierFormData.amount),
        amountYear: Number(courierFormData.amountYear),
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
      rateYear: selectedRateYear,
      yearlyRates: [],
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
      amountYear: selectedCourierYear,
      yearlyAmounts: [],
    });
    setShowCourierModal(true);
  };

  const handleEdit = (category) => {
    const yearlyRates = category.yearlyRates || [];
    const rateYear = Number(selectedRateYear);
    const selectedYearRate = yearlyRates.find(
      (item) => item.year === rateYear
    );

    setFormData({
      categoryName: category.categoryName,
      rate: selectedYearRate?.rate?.toString() || "",
      rateYear,
      yearlyRates,
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
    const yearlyAmounts = courierCharge.yearlyAmounts || [];
    const amountYear = Number(selectedCourierYear);
    const selectedYearAmount = yearlyAmounts.find(
      (item) => item.year === amountYear
    );

    setCourierFormData({
      region: courierCharge.region,
      amount: selectedYearAmount?.amount?.toString() || "",
      amountYear,
      yearlyAmounts,
    });
    setEditingCourierId(courierCharge._id);
    setShowCourierModal(true);
  };

  const handleDelete = async (category) => {
    const action = category.hasRateForRequestedYear
      ? `Delete the configured ${selectedRateYear} rate and mark this category as not applicable for that year?`
      : `This category is using an earlier year's rate. Mark it as not applicable for ${selectedRateYear}?`;
    if (
      window.confirm(action)
    ) {
      try {
        const { data } = await axios.delete(
          backendUrl + `/api/admin/categories/${category._id}`,
          {
            headers: { aToken },
            params: { year: selectedRateYear },
          }
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

  const handleDeleteCourierCharge = async (charge) => {
    const action = charge.hasAmountForRequestedYear
      ? `Delete the configured ${selectedCourierYear} charge and mark this region as not applicable for that year?`
      : `This region is using an earlier year's charge. Mark it as not applicable for ${selectedCourierYear}?`;
    if (
      window.confirm(action)
    ) {
      try {
        const { data } = await axios.delete(
          backendUrl + `/api/admin/courier-charges/${charge._id}`,
          {
            headers: { aToken },
            params: { year: selectedCourierYear },
          }
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
      rateYear: selectedRateYear,
      yearlyRates: [],
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
      amountYear: selectedCourierYear,
      yearlyAmounts: [],
    });
    setEditingCourierId(null);
    setShowCourierModal(false);
  };

  const getRegionLabel = (regionValue) => {
    const region = regionOptions.find((r) => r.value === regionValue);
    return region ? region.label : regionValue;
  };

  const isCategoryApplicable = (category) =>
    !category.isDisabledForRequestedYear && category.rate !== null;

  const isCourierApplicable = (charge) =>
    !charge.isDisabledForRequestedYear && charge.amount !== null;

  const orderedCourierCharges = [...courierCharges].sort(
    (a, b) => Number(isCourierApplicable(b)) - Number(isCourierApplicable(a))
  );
  const applicableCourierCount = courierCharges.filter(
    isCourierApplicable
  ).length;
  const notApplicableCourierCount =
    courierCharges.length - applicableCourierCount;

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
  const CategoryTable = ({ title, categories, icon }) => {
    const orderedCategories = [...categories].sort(
      (a, b) =>
        Number(isCategoryApplicable(b)) - Number(isCategoryApplicable(a))
    );
    const applicableCount = categories.filter(isCategoryApplicable).length;
    const notApplicableCount = categories.length - applicableCount;

    return (
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
                    Base Rate ({selectedRateYear})
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
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orderedCategories.map((category, index) => {
                  const applicable = isCategoryApplicable(category);
                  const previousCategory = orderedCategories[index - 1];
                  const startsGroup =
                    index === 0 ||
                    applicable !== isCategoryApplicable(previousCategory);
                  const groupCount = applicable
                    ? applicableCount
                    : notApplicableCount;

                  return (
                  <Fragment key={category._id}>
                    {startsGroup && (
                      <tr
                        className={
                          applicable
                            ? "bg-green-50 border-y border-green-200"
                            : "bg-red-50 border-y border-red-200"
                        }
                      >
                        <td
                          colSpan={title.includes("Dynamic") ? 8 : 7}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                            applicable ? "text-green-800" : "text-red-800"
                          }`}
                        >
                          {applicable
                            ? `Applicable for ${selectedRateYear} (${groupCount})`
                            : `Not applicable for ${selectedRateYear} (${groupCount})`}
                        </td>
                      </tr>
                    )}
                    <tr
                      className={`border-b border-gray-200 ${
                        applicable
                          ? "hover:bg-green-50/50"
                          : "bg-red-50/30 hover:bg-red-50/60"
                      }`}
                    >
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {category.categoryName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div>
                        {category.isDisabledForRequestedYear
                          ? "Not applicable"
                          : category.rate === null
                          ? "Not configured"
                          : `₹ ${formatIndianCommas(category.rate)}`}
                      </div>
                      {category.rateYear && (
                        <div className="text-xs text-gray-500">
                          {category.isRateFallback
                            ? `Using ${category.rateYear} rate`
                            : `Configured for ${category.rateYear}`}
                        </div>
                      )}
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
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          applicable
                            ? category.isRateFallback
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                            : category.isDisabledForRequestedYear
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {applicable
                          ? category.isRateFallback
                            ? "Applicable · Inherited"
                            : "Applicable"
                          : category.isDisabledForRequestedYear
                          ? "Not applicable"
                          : "Needs configuration"}
                      </span>
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
                          onClick={() => handleDelete(category)}
                          disabled={
                            loading || category.isDisabledForRequestedYear
                          }
                          className="p-2 bg-red-100 hover:bg-red-200 disabled:bg-red-50 text-red-700 rounded-lg transition-colors"
                          title={
                            category.isDisabledForRequestedYear
                              ? `Already not applicable for ${selectedRateYear}`
                              : category.hasRateForRequestedYear
                              ? `Delete ${selectedRateYear} rate`
                              : `Mark as not applicable for ${selectedRateYear}`
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                    </tr>
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    );
  };

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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
            <label
              htmlFor="selectedRateYear"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              View rates for year
            </label>
            <select
              id="selectedRateYear"
              value={selectedRateYear}
              onChange={(event) => setSelectedRateYear(event.target.value)}
              className="w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {rateYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              If a year has no rate, the most recent earlier rate is used.
              Delete an inherited rate to mark the category as not applicable
              for the selected year.
            </p>
          </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Courier Charges ({courierCharges.length})
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div>
                  <label
                    htmlFor="selectedCourierYear"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    View charges for year
                  </label>
                  <select
                    id="selectedCourierYear"
                    value={selectedCourierYear}
                    onChange={(event) =>
                      setSelectedCourierYear(event.target.value)
                    }
                    className="w-full sm:w-36 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {rateYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Delete an inherited charge to mark it as not applicable for
                    this year.
                  </p>
                </div>
                <button
                  onClick={handleAddCourierCharge}
                  disabled={courierLoading}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Courier Charge
                </button>
              </div>
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
                        Amount ({selectedCourierYear})
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedCourierCharges.map((charge, index) => {
                      const applicable = isCourierApplicable(charge);
                      const previousCharge = orderedCourierCharges[index - 1];
                      const startsGroup =
                        index === 0 ||
                        applicable !== isCourierApplicable(previousCharge);
                      const groupCount = applicable
                        ? applicableCourierCount
                        : notApplicableCourierCount;

                      return (
                      <Fragment key={charge._id}>
                        {startsGroup && (
                          <tr
                            className={
                              applicable
                                ? "bg-green-50 border-y border-green-200"
                                : "bg-red-50 border-y border-red-200"
                            }
                          >
                            <td
                              colSpan={4}
                              className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${
                                applicable ? "text-green-800" : "text-red-800"
                              }`}
                            >
                              {applicable
                                ? `Applicable for ${selectedCourierYear} (${groupCount})`
                                : `Not applicable for ${selectedCourierYear} (${groupCount})`}
                            </td>
                          </tr>
                        )}
                        <tr
                          className={`border-b border-gray-200 ${
                            applicable
                              ? "hover:bg-green-50/50"
                              : "bg-red-50/30 hover:bg-red-50/60"
                          }`}
                        >
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {getRegionLabel(charge.region)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div>
                            {charge.isDisabledForRequestedYear
                              ? "Not applicable"
                              : charge.amount === null
                              ? "Not configured"
                              : `₹ ${formatIndianCommas(charge.amount)}`}
                          </div>
                          {charge.amountYear && (
                            <div className="text-xs text-gray-500">
                              {charge.isAmountFallback
                                ? `Using ${charge.amountYear} charge`
                                : `Configured for ${charge.amountYear}`}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              applicable
                                ? charge.isAmountFallback
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                                : charge.isDisabledForRequestedYear
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {applicable
                              ? charge.isAmountFallback
                                ? "Applicable · Inherited"
                                : "Applicable"
                              : charge.isDisabledForRequestedYear
                              ? "Not applicable"
                              : "Needs configuration"}
                          </span>
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
                                handleDeleteCourierCharge(charge)
                              }
                              disabled={
                                courierLoading ||
                                charge.isDisabledForRequestedYear
                              }
                              className="p-2 bg-red-100 hover:bg-red-200 disabled:bg-red-50 text-red-700 rounded-lg transition-colors"
                              title={
                                charge.isDisabledForRequestedYear
                                  ? `Already not applicable for ${selectedCourierYear}`
                                  : charge.hasAmountForRequestedYear
                                  ? `Delete ${selectedCourierYear} charge`
                                  : `Mark as not applicable for ${selectedCourierYear}`
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                        </tr>
                      </Fragment>
                      );
                    })}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate Year *
                  </label>
                  <select
                    name="rateYear"
                    value={formData.rateYear}
                    onChange={handleInputChange}
                    required
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                  >
                    {rateYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {editingId && formData.rate === "" && (
                    <p className="text-xs text-blue-600 mt-1">
                      No rate is configured for this year. Enter one to add it.
                    </p>
                  )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Charge Year *
                  </label>
                  <select
                    name="amountYear"
                    value={courierFormData.amountYear}
                    onChange={handleCourierInputChange}
                    required
                    disabled={courierSubmitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm sm:text-base disabled:bg-gray-50"
                  >
                    {rateYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
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
                  {editingCourierId && courierFormData.amount === "" && (
                    <p className="text-xs text-blue-600 mt-1">
                      No charge is configured for this year. Enter one to add it.
                    </p>
                  )}
                </div>
              </div>
              <div>
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
