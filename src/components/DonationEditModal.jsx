import { useState, useMemo, useContext, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AdminContext } from "../context/AdminContext";
import { Plus, Trash2, User, Phone, MapPin, Package } from "lucide-react";

// Helper component for a form input field
const FormInput = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
      {...props}
    />
  </div>
);

const DonationEditView = ({
  donation,
  formData,
  setFormData,
  categories,
  minPrasadWeight,
}) => {
  // State for the "Add Item" form
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [dynamicAmount, setDynamicAmount] = useState("");
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState(null);

  // Filter categories based on user type
  const filteredCategories = useMemo(() => {
    if (donation.userType === "child") {
      return categories.filter((cat) => cat.dynamic?.isDynamic);
    }
    return categories;
  }, [categories, donation.userType]);

  useEffect(() => {
    if (selectedCategoryId) {
      const details = filteredCategories.find(
        (c) => c._id === selectedCategoryId
      );
      setSelectedCategoryDetails(details);
      if (details?.dynamic?.isDynamic) {
        setDynamicAmount(details.rate.toString());
        setQuantity(1);
      } else {
        setDynamicAmount("");
        setQuantity(1);
      }
    } else {
      setSelectedCategoryDetails(null);
      setQuantity(1);
      setDynamicAmount("");
    }
  }, [selectedCategoryId, filteredCategories]);

  const handleAddItem = () => {
    if (!selectedCategoryDetails) {
      toast.warn("Please select a category.");
      return;
    }

    const isDynamic = selectedCategoryDetails.dynamic?.isDynamic;
    let newItem;

    if (isDynamic) {
      const amount = Number(dynamicAmount) || 0;
      if (amount <= 0) {
        toast.warn("Please enter a valid amount.");
        return;
      }
      let weight = 0;
      if (amount < selectedCategoryDetails.rate) {
        weight = selectedCategoryDetails.dynamic.minvalue;
      } else {
        weight =
          Math.floor(amount / selectedCategoryDetails.rate) *
          selectedCategoryDetails.weight;
      }
      newItem = {
        id: Math.random(),
        category: selectedCategoryDetails.categoryName,
        categoryId: selectedCategoryDetails._id,
        number: 1,
        amount,
        isPacket: false,
        quantity: weight,
      };
    } else {
      const numQuantity = parseInt(quantity, 10);
      if (!numQuantity || numQuantity < 1) {
        toast.warn("Please enter a valid quantity.");
        return;
      }
      const amount = selectedCategoryDetails.rate * numQuantity;
      const weight = selectedCategoryDetails.weight * numQuantity;
      newItem = {
        id: Math.random(),
        category: selectedCategoryDetails.categoryName,
        categoryId: selectedCategoryDetails._id,
        number: numQuantity,
        amount,
        isPacket: selectedCategoryDetails.packet,
        quantity: weight,
      };
    }

    setFormData((prev) => ({ ...prev, list: [...prev.list, newItem] }));
    setSelectedCategoryId("");
  };

  const handleRemoveItem = (id) => {
    setFormData((prev) => ({
      ...prev,
      list: prev.list.filter((item) => item.id !== id),
    }));
  };

  const availableCategories = useMemo(() => {
    const donatedCategoryNames = formData.list.map((d) => d.category);
    return filteredCategories.filter(
      (cat) => !donatedCategoryNames.includes(cat.categoryName)
    );
  }, [filteredCategories, formData.list]);

  const calculatedAmount =
    selectedCategoryDetails && !selectedCategoryDetails.dynamic?.isDynamic
      ? selectedCategoryDetails.rate * (Number(quantity) || 0)
      : 0;

  const formatAddress = (address) => {
    if (!address) return "N/A";
    const parts = [address.street, address.city, address.state, address.pin];
    return parts.filter(Boolean).join(", ");
  };

  // Calculate mahaprasad totals
  const mahaprasadTotals = useMemo(() => {
    let totalWeight = 0;
    let totalPackets = 0;

    formData.list.forEach((item) => {
      if (item.isPacket) {
        totalPackets += item.number;
      }
      totalWeight += item.quantity || 0;
    });

    return { totalWeight, totalPackets };
  }, [formData.list]);

  // Apply the minimum prasad weight logic
  const finalTotalWeight = Math.max(
    mahaprasadTotals.totalWeight,
    minPrasadWeight
  );

  // Get donor details based on user type
  const getDonorDetails = useMemo(() => {
    let details = {};
    const user = donation.userId;
    const guest = donation.userId;

    switch (donation.userType) {
      case "guest":
        details = {
          name: guest?.fullname || "N/A",
          father: guest?.father || "N/A",
          mobile: guest?.contact?.mobileno?.number || "N/A",
          address: formatAddress(guest?.address),
          type: "Guest",
        };
        break;

      case "child":
        details = {
          name: donation.donatedFor?.fullname || "N/A",
          father: user?.fullname || "N/A",
          mobile: user?.contact?.mobileno?.number || "N/A",
          address: formatAddress(user?.address),
          type: "Child",
        };
        break;

      case "registered":
      default:
        details = {
          name: user?.fullname || "N/A",
          father: user?.fatherName || "N/A",
          mobile: user?.contact?.mobileno?.number || "N/A",
          address: formatAddress(user?.address),
          type: "Registered",
        };
        break;
    }
    return details;
  }, [donation]);

  return (
    <div className="space-y-4">
      {/* Donor Info Section (Read-only) */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-gray-600" />
          <h4 className="font-semibold text-gray-800">Donor Information</h4>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              getDonorDetails.type === "Guest"
                ? "bg-orange-100 text-orange-800"
                : getDonorDetails.type === "Child"
                ? "bg-purple-100 text-purple-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {getDonorDetails.type}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-700">Name:</span>
            <span className="text-gray-900">
              {getDonorDetails.name}
              {getDonorDetails.father && (
                <span className="text-gray-900">
                  {" "}
                  {getDonorDetails.gender === "female" ? "D/O" : "S/O"} {getDonorDetails.father}
                </span>
              )}
            </span>
          </div>
          <div className="flex items-start gap-2 md:col-span-2">
            <MapPin className="w-3 h-3 text-gray-500 mt-0.5" />
            <span className="font-medium text-gray-700">Address:</span>
            <span className="text-gray-900">{getDonorDetails.address}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3 h-3 text-gray-500" />
            <span className="font-medium text-gray-700">Mobile:</span>
            <span className="text-gray-900">{getDonorDetails.mobile}</span>
          </div>
        </div>
      </div>

      {/* Mahaprasad Summary */}
      {(mahaprasadTotals.totalWeight > 0 ||
        mahaprasadTotals.totalPackets > 0) && (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-orange-600" />
            <h4 className="font-semibold text-orange-800">
              Mahaprasad Summary
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-orange-700">Total Weight:</span>
              <span className="text-orange-900 font-semibold">
                {finalTotalWeight} g
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-orange-700">
                Total Packets:
              </span>
              <span className="text-orange-900 font-semibold">
                {mahaprasadTotals.totalPackets}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Donation Items (Editable) */}
      <div className="border border-gray-200 rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h4 className="font-semibold text-gray-800">Donation Items</h4>
        </div>
        <div className="p-4">
          <div className="space-y-2 mb-4">
            {formData.list.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-md border ${
                  index % 2 === 0
                    ? "bg-white border-gray-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex-1">
                  <span className="font-medium text-gray-900">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                    <span>Qty: {item.number}</span>
                    {item.isPacket && (
                      <span className="text-orange-600 font-medium">
                        Packet
                      </span>
                    )}
                    {item.quantity > 0 && (
                      <span className="text-blue-600">{item.quantity}g</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-green-700">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Item Form */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h5 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add New Item
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {availableCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.categoryName}
                      {cat.dynamic?.isDynamic && " (Dynamic)"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCategoryDetails?.dynamic?.isDynamic ? (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={dynamicAmount}
                    onChange={(e) => setDynamicAmount(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={
                        !selectedCategoryDetails ||
                        selectedCategoryDetails.packet
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="text"
                      placeholder="Amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-sm text-gray-700"
                      value={calculatedAmount.toLocaleString("en-IN")}
                      disabled
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleAddItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center gap-2 h-10 text-sm transition-colors"
                disabled={!selectedCategoryDetails}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
// ===== MAIN MODAL COMPONENT =========================================
// ====================================================================
const DonationEditModal = ({ donation, onClose, onUpdateSuccess }) => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [minPrasadWeight, setMinPrasadWeight] = useState(0);
  const [courierCharge] = useState(
    donation.courierCharge || 0
  );

  const [formData, setFormData] = useState({
    list: donation.list.map((item) => ({ ...item, id: Math.random() })),
    remarks: donation.remarks || "",
  });

  const [adjustmentPaymentMethod, setAdjustmentPaymentMethod] =
    useState("Cash");
  const [adjustmentTransactionId] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      if (!aToken) return;
      try {
        const response = await axios.get(`${backendUrl}/api/admin/categories`, {
          headers: { aToken },
        });
        if (response.data.success) {
          const activeCategories =
            response.data.categories.filter((cat) => cat.isActive) || [];
          setCategories(activeCategories);

          const dynamicCategories = activeCategories.filter(
            (cat) => cat.dynamic?.isDynamic && cat.dynamic?.minvalue > 0
          );
          if (dynamicCategories.length > 0) {
            const minWeight = Math.min(
              ...dynamicCategories.map((cat) => cat.dynamic.minvalue)
            );
            setMinPrasadWeight(minWeight);
          } else {
            setMinPrasadWeight(0);
          }
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load donation categories.");
      }
    };
    fetchCategories();
  }, [aToken, backendUrl]);

  const totalAmount = useMemo(
    () => formData.list.reduce((sum, item) => sum + item.amount, 0),
    [formData.list]
  );

  const difference = totalAmount + courierCharge - donation.amount;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFullRefund = async () => {
    if (
      !window.confirm(
        "Are you sure you want to fully refund this donation? This action cannot be undone."
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/refund/full`,
        { originalDonationId: donation._id },
        { headers: { aToken } }
      );
      if (response.data.success) {
        toast.success("Donation has been fully refunded.");
        onUpdateSuccess(null, donation);
      } else {
        toast.error(response.data.message || "Refund failed.");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "An error occurred during refund."
      );
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const handleUpdate = async () => {
    if (formData.list.length === 0) {
      toast.error("Donation must have at least one item.");
      return;
    }

    setIsSubmitting(true);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let academicYearStart, academicYearEnd;

    if (currentMonth >= 6) {
      academicYearStart = currentYear;
      academicYearEnd = currentYear + 1;
    } else {
      academicYearStart = currentYear - 1;
      academicYearEnd = currentYear;
    }

    let paymentModeInitial = "C";
    if (adjustmentPaymentMethod.toLowerCase() === "online") {
      paymentModeInitial = "O";
    } else if (adjustmentPaymentMethod.toLowerCase() === "qr code") {
      paymentModeInitial = "Q";
    }

    const newReceiptId = `SDP/${paymentModeInitial}0001/${academicYearStart}-${String(
      academicYearEnd
    ).slice(2)}`;

    const payload = {
      originalDonationId: donation._id,
      updatedDonation: {
        list: formData.list.map(({ id: _id, ...rest }) => rest),
        remarks: formData.remarks,
        amount: totalAmount,
        receiptId: newReceiptId,
      },
      ...(difference > 0 && {
        adjustmentDetails: {
          method: adjustmentPaymentMethod,
          amount: difference,
          transactionId:
            adjustmentTransactionId ||
            `${adjustmentPaymentMethod
              .toUpperCase()
              .replace(/\s+/g, "_")}_${Date.now()}`,
        },
      }),
    };

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/refund/edit-replace`,
        payload,
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success("Donation updated successfully!");
        onUpdateSuccess(data.newDonation, donation);
      } else {
        toast.error(data.message || "Update failed.");
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "An error occurred during update."
      );
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              Edit Donation
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                {donation.receiptId}
              </span>
              <span>
                Original Amount:{" "}
                <span className="font-semibold">
                  ₹{donation.amount?.toLocaleString("en-IN")}
                </span>
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 hover:bg-gray-200 p-2 rounded-full transition-colors"
            title="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <DonationEditView
            donation={donation}
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            minPrasadWeight={minPrasadWeight}
          />

          <div className="mt-6">
            <FormInput
              label="Remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              placeholder="Add any remarks for this donation..."
            />
          </div>

          {difference > 0 && (
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 p-4 rounded-lg mt-6 border border-sky-200">
              <h4 className="font-semibold text-sky-800 mb-3">
                Adjustment Payment Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={adjustmentPaymentMethod}
                    onChange={(e) => setAdjustmentPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="QR Code">QR Code</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Total Amount Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg text-right mt-6 border border-green-200">
            <p className="text-lg font-bold text-green-800">
              New Total Amount: ₹{totalAmount.toLocaleString("en-IN")}
            </p>
            {difference !== 0 && (
              <p
                className={`text-sm mt-1 font-medium ${
                  difference > 0 ? "text-orange-700" : "text-blue-700"
                }`}
              >
                Difference: {difference > 0 ? "+" : ""}₹
                {Math.abs(difference).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50">
          <button
            onClick={handleFullRefund}
            disabled={isSubmitting}
            className="py-2 px-4 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 disabled:bg-red-300 transition-colors flex items-center gap-2"
          >
            {isSubmitting ? "Refunding..." : "Full Refund"}
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={isSubmitting || formData.list.length === 0}
              className="py-2 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
            >
              {isSubmitting ? "Updating..." : "Update Donation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationEditModal;
