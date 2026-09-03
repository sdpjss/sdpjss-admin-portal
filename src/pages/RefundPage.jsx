import { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { AdminContext } from "../context/AdminContext";

const RefundPage = () => {
  const [refunds, setRefunds] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [paymentMode, setPaymentMode] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [newDonationDetails, setNewDonationDetails] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const availableYears = [2025, 2024, 2023];

  const { backendUrl, aToken } = useContext(AdminContext);

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `${backendUrl}/api/admin/refund/get-all-refunds`,
        {
          params: { year, paymentMode },
          headers: { aToken },
        }
      );
      if (response.data.success) {
        setRefunds(response.data.refunds);
      } else {
        setError(response.data.message || "Failed to fetch refunds.");
      }
    } catch (err) {
      setError("An error occurred while fetching refund data.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [year, paymentMode, backendUrl, aToken]);

  const fetchNewDonationDetails = async (donationId) => {
    setModalLoading(true);
    try {
      const response = await axios.get(
        `${backendUrl}/api/admin/donation/get-donation/${donationId}`,
        {
          headers: { aToken },
        }
      );
      if (response.data.success) {
        setNewDonationDetails(response.data.donation);
      } else {
        setError("Failed to fetch new donation details.");
      }
    } catch (err) {
      setError("An error occurred while fetching donation details.");
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleShowNewDonation = (refund) => {
    setSelectedRefund(refund);
    if (refund.newDonationId) {
      fetchNewDonationDetails(refund.newDonationId);
    }
  };

  const closeModal = () => {
    setSelectedRefund(null);
    setNewDonationDetails(null);
  };

  const getRefundMethodBadgeColor = (method) => {
    switch (method?.toLowerCase()) {
      case "edit/replace":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "cash":
        return "bg-green-100 text-green-800 border-green-200";
      case "online":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "cheque":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">💰</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Refund Audit Trail
              </h1>
              <p className="text-gray-600 mt-1">
                Track and manage all donation refunds
              </p>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="year"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <span className="w-4 h-4 rounded bg-blue-500 flex items-center justify-center text-white text-xs">
                    📅
                  </span>
                  Year
                </label>
                <select
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="paymentMode"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <span className="w-4 h-4 rounded bg-green-500 flex items-center justify-center text-white text-xs">
                    💳
                  </span>
                  Payment Mode
                </label>
                <select
                  id="paymentMode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="all">All Modes</option>
                  <option value="Cash">Cash</option>
                  <option value="Online">Online</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-4 h-4 rounded bg-purple-500 flex items-center justify-center text-white text-xs">
                    📊
                  </span>
                  Quick Stats
                </div>
                <div className="bg-white rounded-lg p-3 border">
                  <div className="text-lg font-bold text-gray-900">
                    {refunds.length}
                  </div>
                  <div className="text-xs text-gray-600">Total Refunds</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            {error}
          </div>
        )}

        {/* Refunds Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-600">Loading refund records...</p>
            </div>
          ) : refunds.length > 0 ? (
            <div className="grid gap-6">
              {refunds.map((refund) => (
                <div
                  key={refund._id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      {/* Main Details */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                              <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                                {refund.donorName?.charAt(0)?.toUpperCase() ||
                                  "D"}
                              </span>
                              {refund.donorName}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium border ${getRefundMethodBadgeColor(
                                  refund.refundMethod
                                )}`}
                              >
                                {refund.refundMethod}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">
                              ₹{refund.refundedAmount?.toLocaleString("en-IN")}
                            </div>
                            <div className="text-sm text-gray-500">
                              Refunded Amount
                            </div>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">
                              Original Receipt
                            </div>
                            <div className="font-semibold text-gray-900 mt-1">
                              {refund.originalReceiptId}
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">
                              Refund Date
                            </div>
                            <div className="font-semibold text-gray-900 mt-1">
                              {new Date(refund.refundDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-500 uppercase tracking-wide">
                              Processed By
                            </div>
                            <div className="font-semibold text-blue-600 mt-1">
                              {refund.processedByAdmin?.name || "Super Admin"}
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {refund.notes && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="text-xs text-yellow-600 uppercase tracking-wide mb-1">
                              Notes
                            </div>
                            <div className="text-sm text-yellow-800">
                              {refund.notes}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="flex flex-col items-center gap-2">
                        {refund.newDonationId ? (
                          <button
                            onClick={() => handleShowNewDonation(refund)}
                            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                          >
                            <span>👁️</span>
                            View New Donation
                          </button>
                        ) : (
                          <div className="bg-gray-100 text-gray-500 px-6 py-3 rounded-lg font-medium flex items-center gap-2">
                            <span>❌</span>
                            No New Donation
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Refunds Found
              </h3>
              <p className="text-gray-600">
                No refunds match your current filter criteria.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Modal */}
      {selectedRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">New Donation Details</h2>
                  <p className="text-blue-100 mt-1">
                    Created after refund processing
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {modalLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-600">Loading donation details...</p>
                </div>
              ) : newDonationDetails ? (
                <div className="space-y-6">
                  {/* Donation Overview */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                        ✓
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-900">
                          New Donation Created
                        </h3>
                        <p className="text-green-700 text-sm">
                          Replacement donation for refunded amount
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Table */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Original Refund */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                        <span>❌</span> Original (Refunded)
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-red-600">Receipt:</span>{" "}
                          {selectedRefund.originalReceiptId}
                        </div>
                        <div>
                          <span className="text-red-600">Amount:</span> ₹
                          {selectedRefund.refundedAmount?.toLocaleString(
                            "en-IN"
                          )}
                        </div>
                        <div>
                          <span className="text-red-600">Donor:</span>{" "}
                          {selectedRefund.donorName}
                        </div>
                        <div>
                          <span className="text-red-600">Process:</span>{" "}
                          {selectedRefund.refundMethod}
                        </div>
                      </div>
                    </div>

                    {/* New Donation */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                        <span>✅</span> New Donation
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-green-600">Receipt:</span>{" "}
                          {newDonationDetails.receiptId || "N/A"}
                        </div>
                        <div>
                          <span className="text-green-600">Amount:</span> ₹
                          {newDonationDetails.amount?.toLocaleString("en-IN") ||
                            "N/A"}
                        </div>
                        <div>
                          <span className="text-green-600">Donor:</span>{" "}
                          {newDonationDetails.donorName ||
                            selectedRefund.donorName}
                        </div>
                        <div>
                          <span className="text-green-600">Mode:</span>{" "}
                          {newDonationDetails.method || "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Additional Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">
                          New Donation Date:
                        </span>
                        <div className="font-medium">
                          {newDonationDetails.createdAt
                            ? new Date(
                                newDonationDetails.createdAt
                              ).toLocaleString("en-IN")
                            : "N/A"}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">
                          Refund Processing Date:
                        </span>
                        <div className="font-medium">
                          {new Date(selectedRefund.refundDate).toLocaleString(
                            "en-IN"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedRefund.notes && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">
                        Processing Notes
                      </h4>
                      <p className="text-blue-800 text-sm">
                        {selectedRefund.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">❌</span>
                  </div>
                  <p className="text-gray-600">
                    Unable to load new donation details
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-all duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundPage;
