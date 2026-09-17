import { useState, useEffect, useRef, useContext, useMemo } from "react";
import {
  Plus,
  X,
  Download,
  XCircle,
  Printer,
  ChevronLeft,
  ChevronRight,
  Users,
  Trash2,
  Clock,
  AlertCircle,
  Pencil,
  Search,
} from "lucide-react";
import axios from "axios";
import { AdminContext } from "../context/AdminContext";
import html2pdf from "html2pdf.js";
import { toast } from "react-toastify";
import { printElements } from "../utils/printElements";
import DonationFulfillmentFields, {
  emptyDeliveryAddress,
  getDeliveryAddressError,
} from "../components/DonationFulfillmentFields";
import DonationReceiptTemplate from "../components/DonationReceiptTemplate";
import PrasadTokenTemplate from "../components/PrasadTokenTemplate";
import {
  calculateCategoryV2Prasad,
  categoryUsesMinimumAmount,
  formatPrasadWeight,
  getMinimumDonationAmount,
  getSavedPrasadTotals,
} from "../utils/prasadCalculation";

// =================================================================
// MODAL COMPONENT (*** UPDATED ***)
// =================================================================
const ReceiptModal = ({
  data,
  isGroup,
  onClose,
  adminName,
  totals,
  minDonationWeight, // UPDATED: Accept minDonationWeight prop
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const receiptRef = useRef(null);
  const prasadTokenRef = useRef(null);

  // Esc key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const currentReceipt = isGroup ? data[currentIndex] : data;
  if (!currentReceipt) return null;

  const { donationData, guestData } = currentReceipt;
  const currentCourierCharge = Number(donationData.courierCharge) || 0;

  const fallbackTotals = isGroup
    ? totals.find((t) => t.receiptId === donationData.receiptId) || {
        totalWeight: 0,
        totalPackets: 0,
      }
    : totals;
  const currentTotals = getSavedPrasadTotals(donationData, fallbackTotals);
  const hasPrasadToken =
    currentTotals.totalWeight > 0 || currentTotals.totalPackets > 0;

  const handleDownloadClick = (receiptNode, filename) => {
    const opt = {
      margin: 0.5,
      filename: filename,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };
    html2pdf().from(receiptNode).set(opt).save();
  };

  const handleDownloadPdf = () => {
    handleDownloadClick(
      receiptRef.current,
      `Receipt-${donationData.receiptId}.pdf`
    );
  };

  const handleDownloadPrasadToken = () => {
    handleDownloadClick(
      prasadTokenRef.current,
      `Prasad-Token-${donationData.receiptId}.pdf`
    );
  };

  const handlePrintCurrent = () => {
    if (receiptRef.current) {
      printElements({
        elements: receiptRef.current,
        title: `Print Receipt - ${donationData.receiptId}`,
        printStyles: `
          body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; }
          @media print {
            body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
            .bill-container { box-shadow: none !important; border: 1px solid #ccc !important; }
          }
        `,
      });
    }
  };

  const handlePrintAllSeparately = () => {
    if (!isGroup) return;

    const receiptElements = data.map((_, index) =>
      document.getElementById(`receipt-preview-${index}`)
    );

    printElements({
      elements: receiptElements,
      title: "Print Group Receipts",
      separatePages: true,
      printStyles: `
        body { margin: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        @media print {
          body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
          .bill-container { box-shadow: none !important; border: 1px solid #ccc !important; margin-top: 20px; }
        }
      `,
    });
  };

  const handleDownloadAllSeparately = () => {
    if (!isGroup) return;
    toast.info(`Starting download of ${data.length} separate PDFs...`);
    data.forEach((receipt, index) => {
      setTimeout(() => {
        const element = document.getElementById(`receipt-preview-${index}`);
        if (element) {
          handleDownloadClick(
            element,
            `Receipt-${receipt.donationData.receiptId}.pdf`
          );
        }
      }, index * 1000);
    });
  };

  const handleDownloadAllCombined = async () => {
    if (!isGroup) return;
    const combinedContainer = document.createElement("div");
    document.body.appendChild(combinedContainer);
    data.forEach((receipt, index) => {
      const receiptHtml = document.getElementById(
        `receipt-preview-${index}`
      ).innerHTML;
      const pageBreak =
        index < data.length - 1
          ? '<div style="page-break-after: always;"></div>'
          : "";
      combinedContainer.innerHTML += receiptHtml + pageBreak;
    });
    const opt = {
      margin: 0.5,
      filename: `Group-Donation-Receipts-${Date.now()}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };
    toast.info("Generating combined PDF... please wait.");
    await html2pdf().from(combinedContainer).set(opt).save();
    document.body.removeChild(combinedContainer);
    toast.success("Combined PDF has been downloaded.");
  };

  const AllReceiptsContainer = () => (
    <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
      {isGroup &&
        data.map((receipt, index) => {
          const fallbackReceiptTotals = totals.find(
            (t) => t.receiptId === receipt.donationData.receiptId
          ) || { totalWeight: 0, totalPackets: 0 };
          const receiptTotals = getSavedPrasadTotals(
            receipt.donationData,
            fallbackReceiptTotals
          );
          return (
            <div
              id={`receipt-preview-${index}`}
              key={receipt.donationData.receiptId}
            >
              <ReceiptTemplate
                donationData={receipt.donationData}
                guestData={receipt.guestData}
                courierCharge={Number(receipt.donationData.courierCharge) || 0}
                adminName={adminName}
                totalWeight={receiptTotals.totalWeight}
                totalPackets={receiptTotals.totalPackets}
                totalAmount={donationData.amount}
                minDonationWeight={
                  receiptTotals.minPrasadWeight ?? minDonationWeight
                }
              />
            </div>
          );
        })}
    </div>
  );

  return (
    <>
      <AllReceiptsContainer />
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          <div className="p-4 border-b flex justify-between items-center flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Receipt Preview
              </h2>
              {isGroup && (
                <span className="text-sm text-gray-500">
                  Showing {currentIndex + 1} of {data.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isGroup && (
                <>
                  <button
                    onClick={handlePrintAllSeparately}
                    className="flex items-center gap-2 bg-sky-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                  >
                    <Printer size={16} /> Print All
                  </button>
                  <button
                    onClick={handleDownloadAllCombined}
                    className="flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  >
                    <Download size={16} /> All (Combined)
                  </button>
                  <button
                    onClick={handleDownloadAllSeparately}
                    className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <Download size={16} /> All (Separate)
                  </button>
                </>
              )}
              <button
                onClick={handlePrintCurrent}
                className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <Printer size={18} /> {isGroup ? "Print This" : "Print"}
              </button>
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <Download size={18} />{" "}
                Donation Receipt PDF
              </button>
              {hasPrasadToken && (
                <button
                  onClick={handleDownloadPrasadToken}
                  className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <Download size={18} /> Prasad Token PDF
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full p-1"
              >
                <XCircle size={24} />
              </button>
            </div>
          </div>
          <div className="p-2 md:p-6 overflow-y-auto relative">
            {isGroup && (
              <>
                <button
                  onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                  disabled={currentIndex === 0}
                  className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 shadow-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed z-10"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() =>
                    setCurrentIndex((p) => Math.min(data.length - 1, p + 1))
                  }
                  disabled={currentIndex === data.length - 1}
                  className="absolute right-0 sm:right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 shadow-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed z-10"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            <div ref={receiptRef}>
              <ReceiptTemplate
                donationData={donationData}
                guestData={guestData}
                courierCharge={currentCourierCharge}
                adminName={adminName}
                totalWeight={currentTotals.totalWeight}
                totalPackets={currentTotals.totalPackets}
                minDonationWeight={
                  currentTotals.minPrasadWeight ?? minDonationWeight
                }
              />
            </div>
            {hasPrasadToken && (
              <div
                ref={prasadTokenRef}
                style={{ position: "fixed", left: "-10000px", top: 0, width: "800px" }}
              >
                <PrasadTemplate
                  donationData={donationData}
                  guestData={guestData}
                  totalWeight={currentTotals.totalWeight}
                  totalPackets={currentTotals.totalPackets}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const ReceiptTemplate = ({ donationData, guestData, courierCharge = 0 }) => {
  if (!donationData || !guestData) return null;

  const donation = {
    ...donationData,
    amount:
      Number(donationData.amount || 0) + Number(courierCharge || 0),
  };
  const user = {
    ...guestData,
    fatherName: guestData.fatherName || guestData.father || "",
  };

  return (
    <div style={{ position: "relative" }}>
      <DonationReceiptTemplate receiptData={{ donation, user }} />
    </div>
  );
};

const PrasadTemplate = ({ donationData, guestData, totalWeight, totalPackets }) => {
  if (!donationData || !guestData) return null;

  const user = {
    ...guestData,
    fatherName: guestData.fatherName || guestData.father || "",
  };

  return (
    <div style={{ position: "relative" }}>
      <PrasadTokenTemplate
        receiptData={{ donation: donationData, user }}
        totalWeight={totalWeight}
        totalPackets={totalPackets}
      />
    </div>
  );
};

// =================================================================
// PREVIOUS DONATIONS COMPONENT (No changes here)
// =================================================================
const PreviousDonations = ({ donations, isLoading }) => {
  if (isLoading) {
    return (
      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-md text-center text-gray-600">
        Loading previous donations...
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-md text-gray-600">
        No previous donations found for this guest.
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 bg-gray-100 border border-gray-200 rounded-lg">
      <h3 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Clock size={18} className="text-gray-500" />
        Previous Donations
      </h3>
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
        {donations.map((donation) => (
          <div
            key={donation._id}
            className="bg-white p-3 rounded-lg shadow-sm border"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-bold text-blue-600">
                Date: {new Date(donation.createdAt).toLocaleDateString("en-GB")}
              </span>
              <span className="text-sm font-bold text-gray-800">
                Total: ₹{donation.amount.toLocaleString("en-IN")}
              </span>
            </div>
            <hr />
            <table className="w-full text-xs mt-2">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 font-medium">Category</th>
                  <th className="py-1 font-medium text-center">Qty</th>
                  <th className="py-1 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {donation.list.map((item, index) => (
                  <tr key={index}>
                    <td className="py-1">{item.category}</td>
                    <td className="py-1 text-center">{item.number}</td>
                    <td className="py-1 text-right">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

// =================================================================
// MAIN COMPONENT (*** UPDATED ***)
// =================================================================
const GuestReceipt = () => {
  const {
    backendUrl,
    aToken,
    guestUserList,
    adminName,
    capitalizeEachWord,
    getGuestUserList,
    getDonationList,
  } = useContext(AdminContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [receiptTotals, setReceiptTotals] = useState(null);
  const [donationType, setDonationType] = useState("individual");
  const [groupDonations, setGroupDonations] = useState([]);
  const [totalGroupAmount, setTotalGroupAmount] = useState(0);
  const [isPayingGroup, setIsPayingGroup] = useState(false);
  const [groupPaymentMethod, setGroupPaymentMethod] = useState("Cash");

  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [previousDonations, setPreviousDonations] = useState([]);
  const [isFetchingPreviousDonations, setIsFetchingPreviousDonations] =
    useState(false);
  const [donorInfo, setDonorInfo] = useState({
    fullname: "",
    father: "",
    mobile: "",
    address: {
      street: "",
      city: "Gaya",
      state: "Bihar",
      pin: "823003",
      country: "India",
    },
  });
  const [formErrors, setFormErrors] = useState({});
  const [allCategories, setAllCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [dynamicAmount, setDynamicAmount] = useState("");
  const [donations, setDonations] = useState([]);
  const [editingDonationId, setEditingDonationId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [fulfillmentMode, setFulfillmentMode] = useState("");
  const [selectedPrasadType, setSelectedPrasadType] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState({
    ...emptyDeliveryAddress,
  });
  const [courierCharges, setCourierCharges] = useState([]);
  const [minimumCourierDonationAmount, setMinimumCourierDonationAmount] =
    useState(1210);
  const [prasadRate, setPrasadRate] = useState(null);
  const [pratimaAmount, setPratimaAmount] = useState("");
  const [pratimaQuantity, setPratimaQuantity] = useState(1);
  const [remarks, setRemarks] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [minDonationWeight, setMinDonationWeight] = useState(0); // UPDATED: State for min weight

  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categorySearchRef = useRef(null);
  const donorSearchRef = useRef(null);

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
          setAllCategories(activeCategories);

          // --- UPDATED: Calculate minimum donation weight ---
          const dynamicCategories = activeCategories.filter(
            (cat) => cat.dynamic?.isDynamic && cat.dynamic?.minvalue > 0
          );
          if (dynamicCategories.length > 0) {
            const minWeight = Math.min(
              ...dynamicCategories.map((cat) => cat.dynamic.minvalue)
            );
            setMinDonationWeight(minWeight);
          }
          // --- END UPDATE ---
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load donation categories.");
      }
    };
    fetchCategories();
  }, [aToken, backendUrl]);

  useEffect(() => {
    const fetchFulfillmentConfiguration = async () => {
      if (!aToken) return;
      try {
        const [courierResponse, rateResponse] = await Promise.all([
          axios.get(`${backendUrl}/api/admin/courier-charges`, {
            headers: { aToken },
          }),
          axios.get(`${backendUrl}/api/admin/prasad-rate`, {
            headers: { aToken },
          }),
        ]);
        if (courierResponse.data.success) {
          setCourierCharges(courierResponse.data.courierCharges || []);
        }
        if (rateResponse.data.success && rateResponse.data.rate) {
          setPrasadRate(rateResponse.data.rate);
          setMinimumCourierDonationAmount(
            Number(rateResponse.data.rate.minimumCourierDonationAmount) || 0
          );
        }
      } catch (error) {
        console.error("Error fetching fulfilment configuration:", error);
      }
    };
    fetchFulfillmentConfiguration();
  }, [aToken, backendUrl]);

  useEffect(() => {
    if (donationType === "group") {
      setPaymentMethod("Cash");
    }
  }, [donationType]);

  useEffect(() => {
    const searchQuery = donorInfo.fullname;
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = (guestUserList || []).filter(
      (donor) =>
        donor.fullname?.toLowerCase().includes(lowercasedQuery) ||
        donor.contact?.mobileno?.number.includes(lowercasedQuery) ||
        donor.father?.toLowerCase().includes(lowercasedQuery)
    );
    setSearchResults(filtered);
    setShowDropdown(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [donorInfo.fullname, guestUserList]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!showDropdown) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex > -1 && searchResults[highlightedIndex]) {
          handleSelectDonor(searchResults[highlightedIndex]);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDropdown, searchResults, highlightedIndex]);

  const availableCategories = useMemo(() => {
    const donatedCategoryNames = donations
      .filter((donation) => donation.id !== editingDonationId)
      .map((donation) => donation.category);
    const filtered = allCategories.filter(
      (cat) =>
        !donatedCategoryNames.includes(cat.categoryName) &&
        cat.isActive !== false &&
        cat.showInRegularDonation !== false &&
        cat.categoryCode !== "maa_durga_pratima" &&
        (!cat.availableFor?.length || cat.availableFor.includes("self")) &&
        cat.categoryName
          .toLowerCase()
          .includes(categorySearchQuery.toLowerCase())
    );
    return filtered;
  }, [allCategories, donations, categorySearchQuery, editingDonationId]);

  useEffect(() => {
    if (!isCategoryDropdownOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < availableCategories.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex > -1 && availableCategories[highlightedIndex]) {
          handleSelectCategory(availableCategories[highlightedIndex]);
        }
      } else if (e.key === "Escape") {
        setIsCategoryDropdownOpen(false);
        setCategorySearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCategoryDropdownOpen, availableCategories, highlightedIndex]);

  const { totalAmount, totalWeight, totalPackets } = useMemo(() => {
    const result = donations.reduce(
      (acc, d) => {
        acc.amount += d.amount;
        acc.weight += d.quantity;
        acc.packets += d.isPacket ? d.number : 0;
        return acc;
      },
      { amount: 0, weight: 0, packets: 0 }
    );
    return {
      totalAmount: result.amount,
      totalWeight: result.weight,
      totalPackets: result.packets,
    };
  }, [donations]);

  const usesOnlyCategoryV2 =
    donations.length > 0 &&
    donations.every((item) => item.configurationVersion === "category-v2");
  const hasGramCollectionOption = donations.some(
    (item) =>
      item.prasadType === "grams" ||
      (item.prasadType === "packet" &&
        item.allowGramAlternativeForInPerson)
  );
  const hasPacketCollectionOption = donations.some(
    (item) =>
      item.prasadType === "packet" ||
      item.isPacket ||
      item.category?.toLowerCase().includes("professional")
  );
  const prasadEligibleDonationAmount = donations.reduce(
    (sum, donation) =>
      donation.prasadType === "none" ? sum : sum + donation.amount,
    0
  );
  const isCourierDonationEligible =
    prasadEligibleDonationAmount >= minimumCourierDonationAmount;
  const hasPrasadEligibleDonation = prasadEligibleDonationAmount > 0;
  const effectiveHasGramCollectionOption = usesOnlyCategoryV2
    ? hasGramCollectionOption
    : prasadEligibleDonationAmount > 0;
  const effectiveHasPacketCollectionOption = hasPacketCollectionOption;
  const categoryV2PrasadPreview = calculateCategoryV2Prasad(
    donations,
    prasadRate,
    fulfillmentMode,
    selectedPrasadType
  );
  const courierCharge =
    fulfillmentMode === "courier"
      ? courierCharges.find(
          (charge) => charge.region === deliveryAddress.currlocation
        )?.amount || 0
      : 0;

  useEffect(() => {
    if (!hasPrasadEligibleDonation) {
      setFulfillmentMode("");
      setDeliveryAddress({ ...emptyDeliveryAddress });
    } else if (!isCourierDonationEligible) {
      setFulfillmentMode("collection");
      setDeliveryAddress({ ...emptyDeliveryAddress });
    } else {
      setFulfillmentMode((current) =>
        current === "courier" ? current : ""
      );
    }
  }, [
    hasPrasadEligibleDonation,
    isCourierDonationEligible,
  ]);

  useEffect(() => {
    setSelectedPrasadType((current) => {
      if (!hasPrasadEligibleDonation || fulfillmentMode !== "collection") {
        return "";
      }
      if (
        effectiveHasGramCollectionOption &&
        !effectiveHasPacketCollectionOption
      ) {
        return "halwa";
      }
      if (effectiveHasPacketCollectionOption) return "";
      return current;
    });
  }, [
    effectiveHasGramCollectionOption,
    effectiveHasPacketCollectionOption,
    fulfillmentMode,
    hasPrasadEligibleDonation,
  ]);

  // UPDATED: Calculate final displayed weight and difference for UI feedback
  const weightDifference =
    minDonationWeight > totalWeight && donations.length > 0
      ? minDonationWeight - totalWeight
      : 0;
  const finalDisplayedWeight = totalWeight + weightDifference;

  const calculatedAmountForStandard =
    selectedCategoryDetails && !categoryUsesMinimumAmount(selectedCategoryDetails)
      ? selectedCategoryDetails.rate * (Number(quantity) || 0)
      : 0;

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "fullname":
      case "father":
        if (!value.trim()) {
          error = "This field cannot be empty.";
        }
        break;
      case "mobile":
        if (!value) {
          error = "Mobile number is required.";
        } else if (!/^\d{10}$/.test(value)) {
          error = "Mobile number must be exactly 10 digits.";
        }
        break;
      default:
        break;
    }
    setFormErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setDonorInfo({ ...donorInfo, mobile: value });
      validateField("mobile", value);
    }
  };

  const handleSelectDonor = async (donor) => {
    setSelectedDonor(donor);
    setDonorInfo({
      fullname: donor.fullname,
      father: donor.father,
      mobile: donor.contact.mobileno.number,
      address: {
        street: donor.address.street || "",
        city: donor.address.city || "",
        state: donor.address.state || "",
        pin: donor.address.pin || "",
        country: donor.address.country || "India",
      },
    });
    setShowDropdown(false);
    setPreviousDonations([]);
    if (!donor?._id) return;
    setIsFetchingPreviousDonations(true);
    try {
      const response = await axios.get(
        `${backendUrl}/api/additional/guest-donations/${donor._id}`,
        { headers: { aToken } }
      );
      if (response.data.success) {
        setPreviousDonations(response.data.donations);
      } else {
        toast.error(response.data.message || "Could not fetch history.");
      }
    } catch (error) {
      console.error("Error fetching previous donations:", error);
      toast.error("Failed to load donation history.");
    } finally {
      setIsFetchingPreviousDonations(false);
    }
  };

  const handleSelectCategory = (category) => {
    setSelectedCategoryId(category._id);
    setSelectedCategoryDetails(category);
    setCategorySearchQuery(category.categoryName);
    setIsCategoryDropdownOpen(false);
    setHighlightedIndex(-1);
    if (categoryUsesMinimumAmount(category)) {
      setDynamicAmount("");
      setQuantity(1);
    } else {
      setDynamicAmount("");
      setQuantity(1);
    }
  };

  const handleAddDonation = () => {
    if (!selectedCategoryId) {
      toast.warn("Please select a category.");
      return;
    }
    const isDynamic = categoryUsesMinimumAmount(selectedCategoryDetails);
    let newDonation;
    if (isDynamic) {
      const amount = Number(dynamicAmount) || 0;
      const donationQuantity = selectedCategoryDetails.minimumAmountPerUnit
        ? parseInt(quantity, 10)
        : 1;
      if (
        selectedCategoryDetails.minimumAmountPerUnit &&
        (!Number.isInteger(donationQuantity) || donationQuantity < 1)
      ) {
        toast.warn("Please enter a valid quantity.");
        return;
      }
      const minimumAmount =
        selectedCategoryDetails.configurationVersion === "category-v2"
          ? Number(selectedCategoryDetails.rate) * donationQuantity
          : 0;
      if (amount <= 0 || amount < minimumAmount) {
        toast.warn(
          minimumAmount > 0
            ? `Please enter at least ₹${minimumAmount}.`
            : "Please enter a valid amount for the donation."
        );
        return;
      }
      let weight = 0;
      if (selectedCategoryDetails.configurationVersion !== "category-v2") {
        weight =
          amount < selectedCategoryDetails.rate
            ? selectedCategoryDetails.dynamic.minvalue
            : Math.floor(amount / selectedCategoryDetails.rate) *
              selectedCategoryDetails.weight;
      }
      newDonation = {
        id: editingDonationId || Date.now(),
        category: selectedCategoryDetails.categoryName,
        categoryCode: selectedCategoryDetails.categoryCode,
        number: donationQuantity,
        amount: amount,
        isPacket: false,
        quantity: weight,
        prasadType:
          selectedCategoryDetails.configurationVersion === "category-v2"
            ? selectedCategoryDetails.prasadType
            : selectedCategoryDetails.categoryCode === "maa_durga_pratima"
              ? "none"
              : selectedCategoryDetails.packet
                ? "packet"
                : "grams",
        allowGramAlternativeForInPerson:
          selectedCategoryDetails.configurationVersion === "category-v2" &&
          selectedCategoryDetails.prasadType === "packet" &&
          (selectedCategoryDetails.allowGramAlternativeForInPerson ||
            selectedCategoryDetails.categoryName
              .toLowerCase()
              .includes("professional")),
        packetsPerUnit: selectedCategoryDetails.packetsPerUnit || 0,
        configurationVersion: selectedCategoryDetails.configurationVersion,
      };
    } else {
      if (!quantity || parseInt(quantity, 10) < 1) {
        toast.warn("Please enter a valid quantity.");
        return;
      }
      const calculatedAmount =
        selectedCategoryDetails.rate * parseInt(quantity, 10);
      newDonation = {
        id: editingDonationId || Date.now(),
        category: selectedCategoryDetails.categoryName,
        categoryCode: selectedCategoryDetails.categoryCode,
        number: parseInt(quantity, 10),
        amount: calculatedAmount,
        isPacket:
          selectedCategoryDetails.configurationVersion === "category-v2"
            ? false
            : selectedCategoryDetails.packet,
        quantity:
          selectedCategoryDetails.configurationVersion === "category-v2"
            ? 0
            : selectedCategoryDetails.weight * parseInt(quantity, 10),
        prasadType:
          selectedCategoryDetails.configurationVersion === "category-v2"
            ? selectedCategoryDetails.prasadType
            : selectedCategoryDetails.categoryCode === "maa_durga_pratima"
              ? "none"
              : selectedCategoryDetails.packet
                ? "packet"
                : "grams",
        allowGramAlternativeForInPerson:
          selectedCategoryDetails.configurationVersion === "category-v2" &&
          selectedCategoryDetails.prasadType === "packet" &&
          (selectedCategoryDetails.allowGramAlternativeForInPerson ||
            selectedCategoryDetails.categoryName
              .toLowerCase()
              .includes("professional")),
        packetsPerUnit: selectedCategoryDetails.packetsPerUnit || 0,
        configurationVersion: selectedCategoryDetails.configurationVersion,
      };
    }
    setDonations((current) =>
      editingDonationId
        ? current.map((donation) =>
            donation.id === editingDonationId ? newDonation : donation
          )
        : [...current, newDonation]
    );
    setEditingDonationId(null);
    setSelectedCategoryId("");
    setSelectedCategoryDetails(null);
    setQuantity(1);
    setDynamicAmount("");
    setCategorySearchQuery("");
  };

  const removeDonation = (id) => {
    setDonations(donations.filter((d) => d.id !== id));
    if (editingDonationId === id) setEditingDonationId(null);
  };

  const handleEditDonation = (donation) => {
    if (donation.categoryCode === "maa_durga_pratima") {
      setPratimaQuantity(donation.number);
      setPratimaAmount(String(donation.amount));
      toast.info("Pratima contribution loaded for editing");
      return;
    }
    const category = allCategories.find(
      (item) => item.categoryName === donation.category
    );
    if (!category) return toast.error("Donation category is no longer available");
    setEditingDonationId(donation.id);
    setSelectedCategoryId(category._id);
    setSelectedCategoryDetails(category);
    setCategorySearchQuery(category.categoryName);
    setQuantity(donation.number);
    setDynamicAmount(
      categoryUsesMinimumAmount(category) ? String(donation.amount) : ""
    );
    setIsCategoryDropdownOpen(false);
    toast.info("Donation item loaded for editing");
  };

  const pratimaCategory = allCategories.find(
    (category) =>
      category.categoryCode === "maa_durga_pratima" &&
      category.isActive !== false &&
      (!category.availableFor?.length || category.availableFor.includes("self"))
  );

  const handlePratimaContribution = () => {
    if (!pratimaCategory) return;
    const units = pratimaCategory.minimumAmountPerUnit
      ? Number(pratimaQuantity)
      : 1;
    const amount = Number(pratimaAmount);
    const minimumAmount = Number(pratimaCategory.rate) * units;
    if (!Number.isInteger(units) || units < 1) {
      return toast.error("Enter a valid Pratima quantity");
    }
    const usesMinimumAmount = categoryUsesMinimumAmount(pratimaCategory);
    if (
      !Number.isFinite(amount) ||
      (usesMinimumAmount
        ? amount < minimumAmount
        : Math.abs(amount - minimumAmount) > 0.01)
    ) {
      return toast.error(
        usesMinimumAmount
          ? `Maa Durga Pratima contribution must be at least ₹${minimumAmount.toLocaleString("en-IN")}`
          : `Maa Durga Pratima contribution must be ₹${minimumAmount.toLocaleString("en-IN")}`
      );
    }
    const item = {
      id:
        donations.find(
          (donation) => donation.categoryCode === "maa_durga_pratima"
        )?.id || Date.now(),
      category: pratimaCategory.categoryName,
      categoryCode: pratimaCategory.categoryCode,
      number: units,
      amount,
      isPacket: false,
      quantity: 0,
      prasadType: "none",
      allowGramAlternativeForInPerson: false,
      packetsPerUnit: 0,
      configurationVersion: pratimaCategory.configurationVersion,
    };
    setDonations((current) => [
      ...current.filter(
        (donation) => donation.categoryCode !== "maa_durga_pratima"
      ),
      item,
    ]);
  };

  const removePratimaContribution = () => {
    setDonations((current) =>
      current.filter(
        (donation) => donation.categoryCode !== "maa_durga_pratima"
      )
    );
    setPratimaAmount("");
    setPratimaQuantity(1);
  };

  const resetForm = () => {
    setSearchResults([]);
    setSelectedDonor(null);
    setDonorInfo({
      fullname: "",
      father: "",
      mobile: "",
      address: {
        street: "",
        city: "Gaya",
        state: "Bihar",
        pin: "823003",
        country: "India",
      },
    });
    setDonations([]);
    setEditingDonationId(null);
    setPaymentMethod("Cash");
    setFulfillmentMode("");
    setSelectedPrasadType("");
    setDeliveryAddress({ ...emptyDeliveryAddress });
    setPratimaAmount("");
    setPratimaQuantity(1);
    setRemarks("");
    setSelectedCategoryId("");
    setQuantity(1);
    setDynamicAmount("");
    setPreviousDonations([]);
    setFormErrors({});
    setCategorySearchQuery("");
    setIsCategoryDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const validateForm = () => {
    let isValid = true;
    if (donations.length === 0) {
      toast.error("Please add at least one donation item.");
      isValid = false;
    }
    if (!selectedDonor) {
      const isNameValid = validateField("fullname", donorInfo.fullname);
      const isFatherValid = validateField("father", donorInfo.father);
      const isMobileValid = validateField("mobile", donorInfo.mobile);
      if (!isNameValid || !isFatherValid || !isMobileValid) {
        toast.error("Please correct the errors in the donor form.");
        isValid = false;
      }
    }
    if (
      prasadEligibleDonationAmount > 0 &&
      !["collection", "courier"].includes(fulfillmentMode)
    ) {
      toast.error("Please select a Mahaprasad fulfilment mode.");
      isValid = false;
    }
    if (
      prasadEligibleDonationAmount > 0 &&
      fulfillmentMode === "collection" &&
      !selectedPrasadType
    ) {
      toast.error("Please select the Mahaprasad type.");
      isValid = false;
    }
    if (fulfillmentMode === "courier") {
      if (!isCourierDonationEligible) {
        toast.error("This donation is not eligible for courier delivery.");
        isValid = false;
      }
      const addressError = getDeliveryAddressError(deliveryAddress);
      if (addressError) {
        toast.error(addressError);
        isValid = false;
      }
    }
    return isValid;
  };

  const mahaprasadFulfillment =
    prasadEligibleDonationAmount <= 0
      ? { mode: "none", type: "none" }
      : fulfillmentMode === "courier"
        ? { mode: "courier", type: "packet" }
        : { mode: "collection", type: selectedPrasadType };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const payload = {
      list: donations.map(({ id: _id, ...rest }) => rest),
      method: paymentMethod,
      remarks,
      courierCharge,
      deliveryAddress:
        mahaprasadFulfillment.mode === "courier"
          ? deliveryAddress
          : undefined,
      mahaprasadFulfillment,
      donorInfo: selectedDonor
        ? {
            fullname: selectedDonor.fullname,
            father: selectedDonor.father,
            mobile: selectedDonor.contact.mobileno.number,
            guestId: selectedDonor._id,
          }
        : donorInfo,
    };
    try {
      const response = await axios.post(
        `${backendUrl}/api/additional/record-guest-donation`,
        payload,
        { headers: { aToken } }
      );
      if (response.data.success) {
        setReceiptData(response.data.data);
        const savedList = response.data.data.donationData.list || [];
        setReceiptTotals({
          totalWeight: savedList.reduce(
            (sum, item) => sum + (item.isPacket ? 0 : item.quantity || 0),
            0
          ),
          totalPackets: savedList.reduce(
            (sum, item) => sum + (item.isPacket ? item.quantity || 0 : 0),
            0
          ),
        });
        setShowReceiptModal(true);
        toast.success(`${payload.method} donation recorded successfully!`);
        getGuestUserList();
        getDonationList();
      } else {
        toast.error(
          response.data.message || "An unknown server error occurred."
        );
      }
    } catch (error) {
      console.error("Error creating guest donation:", error);
      toast.error(
        error.response?.data?.message || "Failed to submit donation."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToGroup = () => {
    if (!validateForm()) return;
    const newGroupEntry = {
      localId: Date.now(),
      donorDisplay: selectedDonor
        ? `${selectedDonor.fullname}`
        : `${donorInfo.fullname} (New)`,
      totalAmount: totalAmount + courierCharge,
      totalWeight: categoryV2PrasadPreview?.grams ?? totalWeight,
      totalPackets: categoryV2PrasadPreview?.packets ?? totalPackets,
      payload: {
        list: donations.map(({ id: _id, ...rest }) => rest),
        remarks,
        courierCharge,
        deliveryAddress:
          mahaprasadFulfillment.mode === "courier"
            ? deliveryAddress
            : undefined,
        mahaprasadFulfillment,
        donorInfo: selectedDonor
          ? {
              fullname: selectedDonor.fullname,
              father: selectedDonor.father,
              mobile: selectedDonor.contact.mobileno.number,
              guestId: selectedDonor._id,
            }
          : donorInfo,
      },
    };
    setGroupDonations((prev) => [...prev, newGroupEntry]);
    setTotalGroupAmount((prev) => prev + totalAmount + courierCharge);
    toast.success(`${newGroupEntry.donorDisplay}'s receipt added to group.`);
    resetForm();
  };

  const handleDeleteFromGroup = (localId) => {
    const receiptToRemove = groupDonations.find((g) => g.localId === localId);
    if (receiptToRemove) {
      setTotalGroupAmount((prev) => prev - receiptToRemove.totalAmount);
      setGroupDonations((prev) => prev.filter((g) => g.localId !== localId));
    }
  };

  const handlePayGroup = async () => {
    if (groupDonations.length === 0) {
      toast.warn("No receipts in the group to process.");
      return;
    }
    if (
      !window.confirm(
        `This will process ${groupDonations.length} donations via ${groupPaymentMethod}. Continue?`
      )
    ) {
      return;
    }
    setIsPayingGroup(true);
    const successfulReceipts = [];
    const successfulReceiptTotals = [];
    const failedReceipts = [];
    for (const receipt of groupDonations) {
      const payloadWithMethod = {
        ...receipt.payload,
        method: groupPaymentMethod,
      };
      try {
        const response = await axios.post(
          `${backendUrl}/api/additional/record-guest-donation`,
          payloadWithMethod,
          { headers: { aToken } }
        );
        if (response.data.success) {
          successfulReceipts.push(response.data.data);
          const savedList = response.data.data.donationData.list || [];
          successfulReceiptTotals.push({
            receiptId: response.data.data.donationData.receiptId,
            totalWeight: savedList.reduce(
              (sum, item) => sum + (item.isPacket ? 0 : item.quantity || 0),
              0
            ),
            totalPackets: savedList.reduce(
              (sum, item) => sum + (item.isPacket ? item.quantity || 0 : 0),
              0
            ),
          });
        } else {
          failedReceipts.push({
            name: receipt.donorDisplay,
            reason: response.data.message,
          });
        }
      } catch (error) {
        failedReceipts.push({
          name: receipt.donorDisplay,
          reason: error.response?.data?.message || error.message,
        });
      }
    }
    toast.success(
      `Batch complete! Successful: ${successfulReceipts.length}, Failed: ${failedReceipts.length}`
    );
    if (failedReceipts.length > 0) {
      const errorDetails = failedReceipts
        .map((f) => `${f.name}: ${f.reason}`)
        .join("\n");
      toast.error(`Failures:\n${errorDetails}`, { autoClose: 10000 });
    }
    if (successfulReceipts.length > 0) {
      setReceiptData(successfulReceipts);
      setReceiptTotals(successfulReceiptTotals);
      setShowReceiptModal(true);
      getGuestUserList();
      getDonationList();
    }
    setGroupDonations([]);
    setTotalGroupAmount(0);
    setIsPayingGroup(false);
  };

  const handleEndGroup = () => {
    if (
      groupDonations.length > 0 &&
      !window.confirm("Clear the current group without payment?")
    ) {
      return;
    }
    setGroupDonations([]);
    setTotalGroupAmount(0);
    resetForm();
  };

  const handleCloseModal = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
    setReceiptTotals(null);
    resetForm();
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        categorySearchRef.current &&
        !categorySearchRef.current.contains(event.target)
      ) {
        setIsCategoryDropdownOpen(false);
      }
      if (
        donorSearchRef.current &&
        !donorSearchRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      {showReceiptModal && receiptData && (
        <ReceiptModal
          data={receiptData}
          isGroup={Array.isArray(receiptData)}
          onClose={handleCloseModal}
          adminName={adminName}
          totals={receiptTotals}
          minDonationWeight={minDonationWeight} // UPDATED: Pass prop to modal
        />
      )}
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Guest Donation Receipt
          </h1>
          <div className="flex items-center bg-gray-200 rounded-full p-1 self-start md:self-center">
            <button
              onClick={() => setDonationType("individual")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                donationType === "individual"
                  ? "bg-white text-indigo-600 shadow-md"
                  : "text-gray-600 hover:bg-gray-300"
              }`}
            >
              Individual
            </button>
            <button
              onClick={() => setDonationType("group")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                donationType === "group"
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-gray-600 hover:bg-gray-300"
              }`}
            >
              Group
            </button>
          </div>
        </div>

        {donationType === "group" && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-6 mb-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h2 className="text-2xl font-bold text-blue-800">
                Group Summary
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  className="px-3 py-2 border rounded-lg bg-white text-sm"
                  value={groupPaymentMethod}
                  onChange={(e) => setGroupPaymentMethod(e.target.value)}
                  disabled={isPayingGroup}
                >
                  <option value="Cash">Pay via Cash</option>
                  <option value="QR Code">Pay via QR Code</option>
                </select>
                <button
                  onClick={handlePayGroup}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2 text-sm disabled:bg-green-400"
                  disabled={isPayingGroup || groupDonations.length === 0}
                >
                  {isPayingGroup
                    ? "Processing..."
                    : `Pay All (${groupDonations.length})`}
                </button>
                <button
                  onClick={handleEndGroup}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  disabled={isPayingGroup}
                >
                  {" "}
                  End & Reset{" "}
                </button>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow max-h-60 overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-2 mb-2">
                <span className="text-lg font-semibold text-gray-700">
                  Total Group Amount:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  ₹{totalGroupAmount.toLocaleString("en-IN")}
                </span>
              </div>
              {groupDonations.length > 0 ? (
                <ul className="space-y-2 mt-2">
                  {groupDonations.map((item, index) => (
                    <li
                      key={item.localId}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded group"
                    >
                      <span className="text-sm text-gray-800">
                        {index + 1}. {item.donorDisplay} -{" "}
                        <b>₹{item.totalAmount.toLocaleString("en-IN")}</b>
                      </span>
                      <button
                        onClick={() => handleDeleteFromGroup(item.localId)}
                        className="text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300 rounded-full opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500 text-sm py-4">
                  Add receipts to the group using the form below.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 max-w-6xl mx-auto space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
              1. Find or Add Guest Donor
            </h2>
            <div className="relative" ref={donorSearchRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={donorInfo.fullname}
                  onChange={(e) => {
                    const value = capitalizeEachWord(
                      e.target.value.replace(/\s\s+/g, " ")
                    );
                    setDonorInfo({ ...donorInfo, fullname: value });
                    validateField("fullname", value);
                    if (value.length > 1) {
                      setShowDropdown(true);
                    } else {
                      setShowDropdown(false);
                      setSelectedDonor(null);
                    }
                  }}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg ${
                    formErrors.fullname ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {donorInfo.fullname && (
                  <button
                    onClick={() => {
                      resetForm();
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle size={20} />
                  </button>
                )}
              </div>
              {formErrors.fullname && !selectedDonor && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {formErrors.fullname}
                </p>
              )}
              {showDropdown && !selectedDonor && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto mt-1">
                  {searchResults.length > 0 ? (
                    searchResults.map((donor, index) => (
                      <div
                        key={donor._id}
                        className={`p-3 cursor-pointer border-b ${
                          index === highlightedIndex
                            ? "bg-indigo-100"
                            : "hover:bg-indigo-50"
                        }`}
                        onClick={() => handleSelectDonor(donor)}
                      >
                        <p className="font-medium text-gray-800">
                          {donor.fullname}
                        </p>
                        <div className="text-sm text-gray-500">
                          <span>
                            S/O: {donor.father} | Mobile:{" "}
                            {donor.contact?.mobileno?.number || "N/A"}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-gray-500">
                      No donor found. Please add new donor details below.
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedDonor && (
              <div className="mt-4 bg-indigo-50 border border-indigo-200 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-indigo-800">
                    Selected Donor: {selectedDonor.fullname}
                  </p>
                  <p className="text-sm text-gray-600">
                    Mobile:{" "}
                    <span className="font-medium">
                      {selectedDonor.contact.mobileno.number}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedDonor(null);
                    setDonorInfo({
                      ...donorInfo,
                      father: "",
                      mobile: "",
                      address: {
                        street: "",
                        city: "Gaya",
                        state: "Bihar",
                        pin: "823003",
                        country: "India",
                      },
                    });
                    setPreviousDonations([]);
                  }}
                  className="text-gray-500 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full p-1"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {selectedDonor && (
              <PreviousDonations
                donations={previousDonations}
                isLoading={isFetchingPreviousDonations}
              />
            )}
            {!selectedDonor && (
              <div className="mt-4 border-t-2 border-dashed border-gray-200 pt-4 space-y-4">
                <h3 className="text-lg font-medium text-gray-600">
                  Enter New Donor Details:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-1">
                  <div>
                    <input
                      type="text"
                      placeholder="Father's Name *"
                      value={donorInfo.father}
                      onChange={(e) => {
                        const value = capitalizeEachWord(
                          e.target.value.replace(/\s\s+/g, " ")
                        );
                        setDonorInfo({ ...donorInfo, father: value });
                        validateField("father", value);
                      }}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        formErrors.father ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                    {formErrors.father && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {formErrors.father}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Mobile Number (10 digits) *"
                      value={donorInfo.mobile}
                      onChange={handleMobileChange}
                      className={`w-full px-3 py-2 border rounded-lg ${
                        formErrors.mobile ? "border-red-500" : "border-gray-300"
                      } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                    />
                    {formErrors.mobile && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {formErrors.mobile}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={donorInfo.address.street}
                      onChange={(e) =>
                        setDonorInfo({
                          ...donorInfo,
                          address: {
                            ...donorInfo.address,
                            street: capitalizeEachWord(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      value={donorInfo.address.city}
                      onChange={(e) =>
                        setDonorInfo({
                          ...donorInfo,
                          address: {
                            ...donorInfo.address,
                            city: capitalizeEachWord(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="State"
                      value={donorInfo.address.state}
                      onChange={(e) =>
                        setDonorInfo({
                          ...donorInfo,
                          address: {
                            ...donorInfo.address,
                            state: capitalizeEachWord(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Country"
                      value={donorInfo.address.country}
                      onChange={(e) =>
                        setDonorInfo({
                          ...donorInfo,
                          address: {
                            ...donorInfo.address,
                            country: capitalizeEachWord(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="PIN Code"
                      value={donorInfo.address.pin}
                      onChange={(e) => {
                        const isIndia =
                          donorInfo.address.country.toLowerCase() === "india";
                        const value = e.target.value;
                        setDonorInfo({
                          ...donorInfo,
                          address: {
                            ...donorInfo.address,
                            pin: isIndia
                              ? value.replace(/\D/g, "").slice(0, 6)
                              : value,
                          },
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
              2. Add Donation Items
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg">
              <div className="md:col-span-2 relative" ref={categorySearchRef}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search category..."
                    className="w-full px-3 py-2 border rounded-lg bg-white pr-10"
                    value={categorySearchQuery}
                    onFocus={() => setIsCategoryDropdownOpen(true)}
                    onChange={(e) => {
                      setCategorySearchQuery(e.target.value);
                      setIsCategoryDropdownOpen(true);
                      setSelectedCategoryId("");
                      setSelectedCategoryDetails(null);
                      setHighlightedIndex(-1);
                    }}
                  />
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
                {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg z-20">
                    {availableCategories.length > 0 ? (
                      availableCategories.map((category, index) => (
                        <div
                          key={category._id}
                          className={`cursor-pointer p-2 hover:bg-gray-100 ${
                            index === highlightedIndex ? "bg-gray-100" : ""
                          }`}
                          onClick={() => handleSelectCategory(category)}
                        >
                          {category.categoryName}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500">
                        No categories found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {categoryUsesMinimumAmount(selectedCategoryDetails) ? (
                // DYNAMIC CATEGORY VIEW
                <>
                {selectedCategoryDetails.minimumAmountPerUnit && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                )}
                <div className={selectedCategoryDetails.minimumAmountPerUnit ? "" : "md:col-span-2"}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder={`Minimum ₹${getMinimumDonationAmount(
                      selectedCategoryDetails,
                      quantity
                    ).toLocaleString("en-IN")}`}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={dynamicAmount}
                    onChange={(e) => setDynamicAmount(e.target.value)}
                    disabled={!selectedCategoryDetails}
                  />
                </div>
                </>
              ) : (
                // STANDARD CATEGORY VIEW
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      disabled={
                        !selectedCategoryDetails ||
                        selectedCategoryDetails.packet
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="text"
                      placeholder="Amount"
                      className="w-full px-3 py-2 border rounded-lg bg-gray-200"
                      value={calculatedAmountForStandard.toLocaleString(
                        "en-IN"
                      )}
                      disabled
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleAddDonation}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-green-300 flex items-center justify-center gap-2 h-10"
              >
                {editingDonationId ? <Pencil size={18} /> : <Plus size={18} />}
                {editingDonationId ? "Update" : "Add"}
              </button>
            </div>

            {selectedCategoryDetails && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                <div className="flex flex-wrap items-center justify-around gap-x-6 gap-y-2">
                  <p>
                    <strong>Rate:</strong> ₹{selectedCategoryDetails.rate}
                  </p>
                  {selectedCategoryDetails.configurationVersion ===
                  "category-v2" ? (
                    <p>
                      <strong>Mahaprasad:</strong>{" "}
                      {selectedCategoryDetails.prasadType === "none"
                        ? "Not applicable"
                        : selectedCategoryDetails.prasadType === "packet"
                          ? `${selectedCategoryDetails.packetsPerUnit || 1} packet(s) per quantity${
                              selectedCategoryDetails.allowGramAlternativeForInPerson
                                ? ", or Halwa calculated from the donation amount"
                                : ""
                            }`
                          : "Halwa calculated from the donation amount"}
                    </p>
                  ) : (
                    <>
                      <p>
                        <strong>Weight:</strong> {selectedCategoryDetails.weight}g
                      </p>
                      <p>
                        <strong>Packet:</strong>{" "}
                        {selectedCategoryDetails.packet ? "Yes" : "No"}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
            {pratimaCategory && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-900">
                  Maa Durga Pratima contribution (Optional)
                </p>
                <div className="mt-3 grid grid-cols-1 items-end gap-3 md:grid-cols-3">
                  {pratimaCategory.minimumAmountPerUnit && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-amber-900">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={pratimaQuantity}
                        onChange={(event) =>
                          setPratimaQuantity(event.target.value)
                        }
                        className="w-full rounded-lg border border-amber-300 bg-white p-2 text-sm"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-amber-900">
                      Contribution amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={pratimaAmount}
                      onChange={(event) => setPratimaAmount(event.target.value)}
                      placeholder={`Minimum ₹${(
                        Number(pratimaCategory.rate) *
                        (pratimaCategory.minimumAmountPerUnit
                          ? Number(pratimaQuantity) || 1
                          : 1)
                      ).toLocaleString("en-IN")}`}
                      className="w-full rounded-lg border border-amber-300 bg-white p-2 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handlePratimaContribution}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                      {donations.some(
                        (donation) =>
                          donation.categoryCode === "maa_durga_pratima"
                      )
                        ? "Update contribution"
                        : "Add contribution"}
                    </button>
                    {donations.some(
                      (donation) =>
                        donation.categoryCode === "maa_durga_pratima"
                    ) && (
                      <button
                        type="button"
                        onClick={removePratimaContribution}
                        className="rounded-lg border border-amber-400 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            {donations.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 text-left font-semibold text-slate-700">
                        Category
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700">
                        Quantity
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700">
                        Amount
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.id} className="border-b border-slate-200">
                        <td className="p-3 text-slate-800 font-medium">
                          {d.category}
                        </td>
                        <td className="p-3 text-slate-700">{d.number}</td>
                        <td className="p-3 text-slate-700">
                          ₹{d.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="flex gap-3 p-3">
                          <button
                            type="button"
                            onClick={() => handleEditDonation(d)}
                            className="text-blue-600 hover:text-blue-800"
                            aria-label={`Edit ${d.category}`}
                            title="Edit donation item"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDonation(d.id)}
                            className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full transition-colors"
                            aria-label={`Remove ${d.category}`}
                            title="Remove donation item"
                          >
                            <XCircle size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
              3. Payment & Finalize
            </h2>
            <div className="space-y-6">
              {prasadEligibleDonationAmount > 0 && (
                <DonationFulfillmentFields
                  mode={fulfillmentMode}
                  onModeChange={(mode) => {
                    setFulfillmentMode(mode);
                    setSelectedPrasadType("");
                  }}
                  prasadType={selectedPrasadType}
                  onPrasadTypeChange={setSelectedPrasadType}
                  hasGramOption={effectiveHasGramCollectionOption}
                  hasPacketOption={effectiveHasPacketCollectionOption}
                  courierEligible={isCourierDonationEligible}
                  minimumCourierAmount={minimumCourierDonationAmount}
                  deliveryAddress={deliveryAddress}
                  onDeliveryAddressChange={setDeliveryAddress}
                  disabled={isSubmitting}
                />
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-2">
                    Mahaprasad Summary
                  </h4>
                  <p className="text-sm flex justify-between pr-1">
                    Total Weight:{" "}
                    <span className="font-bold">
                      {/* --- UPDATED: Show final adjusted weight --- */}
                      {formatPrasadWeight(
                        categoryV2PrasadPreview
                          ? categoryV2PrasadPreview.grams
                          : fulfillmentMode === "courier"
                            ? 0
                            : finalDisplayedWeight
                      )}
                    </span>
                  </p>
                  {/* --- UPDATED: Conditionally show note --- */}
                  {!usesOnlyCategoryV2 && weightDifference > 0 && (
                    <p className="text-xs text-purple-600 mt-1 text-right">
                      (Includes {Math.round(weightDifference)}g adjustment)
                    </p>
                  )}
                  <p className="text-sm flex justify-between pr-1">
                    Total Packets:{" "}
                    <span className="font-bold">
                      {categoryV2PrasadPreview
                        ? categoryV2PrasadPreview.packets.toLocaleString("en-IN")
                        : fulfillmentMode === "courier"
                          ? "1"
                          : totalPackets.toLocaleString("en-IN")}
                    </span>
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-800 mb-2">
                    Donation Summary
                  </h4>
                  <p className="text-sm flex justify-between">
                    Sub-Total:{" "}
                    <span>₹{totalAmount.toLocaleString("en-IN")}</span>
                  </p>
                  <p className="text-sm flex justify-between">
                    Courier:{" "}
                    <span>₹{courierCharge.toLocaleString("en-IN")}</span>
                  </p>
                  <hr className="my-1 border-green-200" />
                  <p className="font-bold flex justify-between">
                    Grand Total:{" "}
                    <span>
                      ₹{(totalAmount + courierCharge).toLocaleString("en-IN")}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {donationType === "individual" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="QR Code">QR Code</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks (Optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="2"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any notes..."
                  ></textarea>
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              onClick={resetForm}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100 order-1"
              disabled={isSubmitting}
            >
              Clear Form
            </button>
            {donationType === "individual" ? (
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-300 w-52 flex items-center justify-center gap-2 order-2"
                disabled={isSubmitting || donations.length === 0}
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Printer size={18} /> Generate Receipt
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleAddToGroup}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 w-52 flex items-center justify-center gap-2 order-2"
                disabled={isPayingGroup || donations.length === 0}
              >
                <Users size={18} /> Add to Group
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GuestReceipt;
