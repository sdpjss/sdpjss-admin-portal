import { useState, useEffect, useRef, useContext } from "react";
import {
  Search,
  Plus,
  X,
  User,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Clock,
  Trash2,
  Download,
  XCircle,
  Printer,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import axios from "axios";
import { AdminContext } from "../context/AdminContext";
import { toast } from "react-toastify";
import html2pdf from "html2pdf.js";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import ReCAPTCHA from "react-google-recaptcha";
import { printElements } from "../utils/printElements";
import DonationFulfillmentFields, {
  emptyDeliveryAddress,
  formatDeliveryAddress,
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

const toWords = (num) => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  if (num === 0) return "Zero";
  let words = "";
  if (Math.floor(num / 10000000) > 0) {
    words += `${toWords(Math.floor(num / 10000000))} Crore `;
    num %= 10000000;
  }
  if (Math.floor(num / 100000) > 0) {
    words += `${toWords(Math.floor(num / 100000))} Lakh `;
    num %= 100000;
  }
  if (Math.floor(num / 1000) > 0) {
    words += `${toWords(Math.floor(num / 1000))} Thousand `;
    num %= 1000;
  }
  if (Math.floor(num / 100) > 0) {
    words += `${ones[Math.floor(num / 100)]} Hundred `;
    num %= 100;
  }
  if (num >= 20) {
    words += `${tens[Math.floor(num / 10)]} ${ones[num % 10]} `;
  } else if (num >= 10) {
    words += `${teens[num - 10]} `;
  } else if (num > 0) {
    words += `${ones[num]} `;
  }
  return words.trim();
};

const ReceiptTemplate = ({ donationData, userData, courierCharge = 0 }) => {
  if (!donationData || !userData) return null;

  const donation = {
    ...donationData,
    amount:
      Number(donationData.amount || 0) + Number(courierCharge || 0),
  };
  const user = {
    ...userData,
    fatherName: userData.fatherName || userData.father || "",
  };

  return (
    <div style={{ position: "relative" }}>
      <DonationReceiptTemplate receiptData={{ donation, user }} />
    </div>
  );
};

const PrasadTemplate = ({ donationData, userData, totalWeight, totalPackets }) => {
  if (!donationData || !userData) return null;

  const user = {
    ...userData,
    fatherName: userData.fatherName || userData.father || "",
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

const ReceiptModal = ({ data, isGroup, onClose, adminName, totals }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const receiptRef = useRef(null);
  const prasadTokenRef = useRef(null);

  const currentReceiptData = isGroup ? data[currentIndex] : data;
  if (!currentReceiptData) return null;

  // Simplified totals logic
  const currentTotals = getSavedPrasadTotals(
    currentReceiptData.donationData,
    isGroup ? currentReceiptData : totals
  );
  const hasPrasadToken =
    currentTotals.totalWeight > 0 || currentTotals.totalPackets > 0;

  const handleDownloadClick = (receiptNode, filename) => {
    html2pdf()
      .from(receiptNode)
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .save();
  };

  const handlePrintClick = (node) => {
    const receiptId = isGroup
      ? data[currentIndex].donationData.receiptId
      : data.donationData.receiptId;
    printElements({
      elements: node,
      title: `Receipt-${receiptId}`,
      printStyles:
        "@media print { @page { size: A4; margin: 0; } body { margin: 0; } }",
    });
  };

  const handleDownloadAll = async () => {
    toast.info(`Starting download of ${data.length} receipts...`);
    for (let i = 0; i < data.length; i++) {
      const receipt = data[i];
      const element = document.createElement("div");
      document.body.appendChild(element);
      const root = createRoot(element);

      // Temporarily render component to get HTML
      flushSync(() => {
        root.render(
          <ReceiptTemplate
            donationData={receipt.donationData}
            userData={receipt.userData}
            adminName={adminName}
            {...getSavedPrasadTotals(receipt.donationData, {
              totalWeight: receipt.totalWeight,
              totalPackets: receipt.totalPackets,
              minPrasadWeight: receipt.minPrasadWeight,
            })}
            courierCharge={receipt.donationData.courierCharge}
          />
        );
      });

      await html2pdf()
        .from(element)
        .set({
          margin: 0,
          filename: `Receipt-${receipt.donationData.receiptId}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .save();

      root.unmount();
      document.body.removeChild(element);
      toast.success(
        `Downloaded Receipt-${receipt.donationData.receiptId}.pdf (${i + 1}/${
          data.length
        })`
      );
    }
    toast.success("All receipts downloaded!");
  };

  const handlePrintAll = () => {
    const printContainer = document.createElement("div");
    document.body.appendChild(printContainer);
    const root = createRoot(printContainer);

    flushSync(() => {
      root.render(
        <>
          <style>{`
          @media print {
            body * { visibility: hidden; }
            #print-all-container, #print-all-container * { visibility: visible; }
            #print-all-container { position: absolute; left: 0; top: 0; width: 100%; }
            .print-page { page-break-after: always; }
          }`}</style>
          <div id="print-all-container">
            {data.map((receipt, index) => {
              return (
                <div key={index} className="print-page">
                  <ReceiptTemplate
                    donationData={receipt.donationData}
                    userData={receipt.userData}
                    adminName={adminName}
                    {...getSavedPrasadTotals(receipt.donationData, {
                      totalWeight: receipt.totalWeight,
                      totalPackets: receipt.totalPackets,
                      minPrasadWeight: receipt.minPrasadWeight,
                    })}
                    courierCharge={receipt.donationData.courierCharge}
                  />
                </div>
              );
            })}
          </div>
        </>
      );
    });

    window.print();

    root.unmount();
    document.body.removeChild(printContainer);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h2 className="text-xl font-bold text-gray-800">
            Receipt Preview {isGroup && `(${currentIndex + 1}/${data.length})`}
          </h2>
          <div className="flex items-center gap-2">
            {!isGroup ? (
              <>
                <button
                  onClick={() =>
                    handleDownloadClick(
                      receiptRef.current,
                      `Receipt-${currentReceiptData.donationData.receiptId}.pdf`
                    )
                  }
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-green-700 text-sm"
                >
                  <Download size={16} /> Donation Receipt PDF
                </button>
                {hasPrasadToken && (
                  <button
                    onClick={() =>
                      handleDownloadClick(
                        prasadTokenRef.current,
                        `Prasad-Token-${currentReceiptData.donationData.receiptId}.pdf`
                      )
                    }
                    className="flex items-center gap-2 bg-amber-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-amber-700 text-sm"
                  >
                    <Download size={16} /> Prasad Token PDF
                  </button>
                )}
                <button
                  onClick={() => handlePrintClick(receiptRef.current)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-blue-700 text-sm"
                >
                  <Printer size={16} /> Print
                </button>
              </>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    handleDownloadClick(
                      receiptRef.current,
                      `Receipt-${currentReceiptData.donationData.receiptId}.pdf`
                    )
                  }
                  className="flex items-center gap-1 bg-green-600 text-white px-2 py-1 rounded-md text-xs hover:bg-green-700"
                >
                  <Download size={14} /> Donation Receipt PDF
                </button>
                {hasPrasadToken && (
                  <button
                    onClick={() =>
                      handleDownloadClick(
                        prasadTokenRef.current,
                        `Prasad-Token-${currentReceiptData.donationData.receiptId}.pdf`
                      )
                    }
                    className="flex items-center gap-1 bg-amber-600 text-white px-2 py-1 rounded-md text-xs hover:bg-amber-700"
                  >
                    <Download size={14} /> Prasad Token PDF
                  </button>
                )}
                <button
                  onClick={() => handlePrintClick(receiptRef.current)}
                  className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-700"
                >
                  <Printer size={14} /> Print This
                </button>
                <button
                  onClick={handleDownloadAll}
                  className="flex items-center gap-1 bg-green-700 text-white px-2 py-1 rounded-md text-xs hover:bg-green-800"
                >
                  <Download size={14} /> Download All Separately
                </button>
                <button
                  onClick={handlePrintAll}
                  className="flex items-center gap-1 bg-blue-700 text-white px-2 py-1 rounded-md text-xs hover:bg-blue-800"
                >
                  <Printer size={14} /> Print All
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-600"
            >
              <XCircle size={28} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto relative bg-gray-200">
          {isGroup && (
            <>
              <button
                onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                disabled={currentIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 shadow-md hover:bg-gray-100 disabled:opacity-30 z-10"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={() =>
                  setCurrentIndex((p) => Math.min(data.length - 1, p + 1))
                }
                disabled={currentIndex === data.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-1 shadow-md hover:bg-gray-100 disabled:opacity-30 z-10"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <div ref={receiptRef}>
            <ReceiptTemplate
              donationData={currentReceiptData.donationData}
              userData={currentReceiptData.userData}
              adminName={adminName}
              totalWeight={currentTotals.totalWeight}
              totalPackets={currentTotals.totalPackets}
              minPrasadWeight={currentTotals.minPrasadWeight}
              courierCharge={currentReceiptData.donationData.courierCharge}
            />
          </div>
          {hasPrasadToken && (
            <div
              ref={prasadTokenRef}
              style={{ position: "fixed", left: "-10000px", top: 0, width: "800px" }}
            >
              <PrasadTemplate
                donationData={currentReceiptData.donationData}
                userData={currentReceiptData.userData}
                totalWeight={currentTotals.totalWeight}
                totalPackets={currentTotals.totalPackets}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Terms and Conditions Modal Component
const TermsModal = ({ onClose }) => {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
          <h2 className="text-xl font-bold">Terms and Conditions</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="text-sm text-gray-700 space-y-4">
          <p>
            By registering, you agree to the following terms and conditions.
            These terms govern your use of the donation portal and your personal
            data.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>Data Privacy:</strong> We collect and store personal
              information you provide, including your name, contact details, and
              address, to facilitate donations and for community record-keeping.
              We will not share your data with third parties without your
              explicit consent.
            </li>
            <li>
              <strong>Donation Purpose:</strong> All donations are made to Shree
              Durga Patwaye Jati Sudhar Samiti for its stated charitable and
              community purposes. Donations are non-refundable.
            </li>
            <li>
              <strong>Mahaprasad Delivery:</strong> If you opt for courier
              delivery, you agree to bear the applicable courier charges.
              Delivery times are estimates and may vary.
            </li>
            <li>
              <strong>Account Responsibility:</strong> You are responsible for
              maintaining the confidentiality of your account credentials and
              for all activities that occur under your account.
            </li>
            <li>
              <strong>Accuracy of Information:</strong> You certify that the
              information you provide is accurate and complete to the best of
              your knowledge.
            </li>
          </ul>
          <p>
            We reserve the right to modify these terms and conditions at any
            time. Your continued use of the portal constitutes your acceptance
            of the revised terms.
          </p>
        </div>
      </div>
    </div>
  );
};

const Receipt = () => {
  const {
    backendUrl,
    aToken,
    userList,
    getUserList,
    getFamilyList,
    getDonationList,
    donationList,
    adminName,
  } = useContext(AdminContext);

  const [selectedCategoryDetails, setSelectedCategoryDetails] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [donationType, setDonationType] = useState("individual");
  const [groupDonations, setGroupDonations] = useState([]);
  const [totalGroupAmount, setTotalGroupAmount] = useState(0);
  const [isPayingGroup, setIsPayingGroup] = useState(false);
  const [groupPaymentMethod, setGroupPaymentMethod] = useState("Cash");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [willCome, setWillCome] = useState("");
  const [selectedPrasadType, setSelectedPrasadType] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState({
    ...emptyDeliveryAddress,
  });
  const [donations, setDonations] = useState([]);
  const [editingDonationId, setEditingDonationId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const categoryDropdownRef = useRef(null);
  const categoryInputRef = useRef(null);
  const [quantity, setQuantity] = useState(1);
  const [dynamicAmount, setDynamicAmount] = useState("");
  const [pratimaAmount, setPratimaAmount] = useState("");
  const [pratimaQuantity, setPratimaQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [khandans, setKhandans] = useState([]);
  const [courierCharges, setCourierCharges] = useState([]);
  const [userPreviousDonations, setUserPreviousDonations] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [minPrasadWeight, setMinPrasadWeight] = useState(0);
  const [minimumCourierDonationAmount, setMinimumCourierDonationAmount] =
    useState(1210);
  const [prasadRate, setPrasadRate] = useState(null);

  // New state for the add user form with validation
  const [newUser, setNewUser] = useState({
    fullname: "",
    gender: "",
    dob: "",
    khandanid: "",
    fatherName: "",
    contact: {
      email: "",
      mobileno: { code: "+91", number: "" },
      whatsappno: "",
    },
    address: {
      currlocation: "",
      country: "",
      state: "",
      district: "",
      city: "",
      postoffice: "",
      pin: "",
      landmark: "",
      street: "",
      apartment: "",
      floor: "",
      room: "",
    },
    profession: { category: "", job: "", specialization: "" },
  });

  const [validationErrors, setValidationErrors] = useState({});

  const handleCloseModal = () => {
    setShowReceiptModal(false);
    setReceiptData(null);
    resetForm();
  };

  const loadDonations = async () => {
    try {
      await getDonationList();
    } catch (error) {
      console.error("Error loading donations:", error);
    }
  };

  const userSearchRef = useRef(null);
  const paymentMethods = ["Cash", "QR Code"];
  const genderOptions = ["male", "female", "other"];

  // Effect to handle single khandan case
  useEffect(() => {
    if (khandans.length === 1) {
      setNewUser((prev) => ({ ...prev, khandanid: khandans[0]._id }));
    }
  }, [khandans]);

  useEffect(() => {
    if (donationType === "group") {
      setPaymentMethod("Cash");
    } else {
      setPaymentMethod("");
    }
  }, [donationType]);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateMobile = (mobile) => /^\d{10}$/.test(mobile);
  const ValidationMessage = ({ show, message }) =>
    !show ? null : <p className="text-red-500 text-sm mt-1">{message}</p>;

  const locationOptions = [
    {
      value: "in_manpur",
      label: "In Manpur",
      address: {
        city: "Gaya",
        state: "Bihar",
        district: "Gaya",
        country: "India",
        pin: "823003",
        postoffice: "Buniyadganj",
        street: "Manpur",
      },
    },
    {
      value: "in_gaya_outside_manpur",
      label: "In Gaya but outside Manpur",
      address: {
        city: "Gaya",
        state: "Bihar",
        district: "Gaya",
        country: "India",
        pin: "",
        postoffice: "",
        street: "",
      },
    },
    {
      value: "in_bihar_outside_gaya",
      label: "In Bihar but outside Gaya",
      address: {
        city: "",
        state: "Bihar",
        district: "",
        country: "India",
        pin: "",
        postoffice: "",
        street: "",
      },
    },
    {
      value: "in_india_outside_bihar",
      label: "In India but outside Bihar",
      address: {
        city: "",
        state: "",
        district: "",
        country: "India",
        pin: "",
        postoffice: "",
        street: "",
      },
    },
    {
      value: "outside_india",
      label: "Outside India",
      address: {
        city: "",
        state: "",
        district: "",
        country: "",
        pin: "",
        postoffice: "",
        street: "",
      },
    },
  ];

  const capitalizeAndFixCursor = (e, field) => {
    const { value, selectionStart } = e.target;
    const cleanValue = value.replace(/\s{2,}/g, " ").trimStart();
    const capitalized = cleanValue
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    setNewUser((prev) => ({ ...prev, [field]: capitalized }));

    setTimeout(() => {
      const input = e.target;
      if (input) {
        input.selectionEnd = selectionStart;
      }
    }, 0);
  };

  const handleKhandanChangeForNewUser = (khandanId) => {
    setNewUser((prev) => ({ ...prev, khandanid: khandanId }));
  };

  const fetchCourierCharges = async () => {
    try {
      const response = await axios.get(
        backendUrl + "/api/admin/courier-charges",
        { headers: { aToken } }
      );
      if (response.data.success) {
        setCourierCharges(response.data.courierCharges || []);
      }
    } catch (error) {
      console.error("Error fetching courier charges:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (aToken) {
        setLoading(true);
        try {
          await getUserList();
          await fetchCategories();
          await fetchPrasadRate();
          await fetchCourierCharges();
          const khandanData = await getFamilyList();
          if (khandanData && khandanData.success) {
            setKhandans(khandanData.families || []);
          }
          await loadDonations();
        } catch (error) {
          console.error("Error fetching initial data:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchData();
  }, [aToken]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(backendUrl + "/api/admin/categories", {
        headers: { aToken },
      });
      if (response.data.success) {
        const fetchedCategories = response.data.categories || [];
        setCategories(fetchedCategories);

        const dynamicCategories = fetchedCategories.filter(
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
    }
  };

  const fetchPrasadRate = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/admin/prasad-rate",
        { headers: { aToken } }
      );
      if (data.success && data.rate) {
        setPrasadRate(data.rate);
        setMinimumCourierDonationAmount(
          Number(data.rate.minimumCourierDonationAmount) || 0
        );
      }
    } catch (error) {
      console.error("Error fetching Prasad configuration:", error);
    }
  };

  const getKhandanName = (khandanId) => {
    const khandan = khandans.find((k) => k._id === khandanId._id);
    return khandan ? khandan.name : "Unknown Khandan";
  };

  const formatKhandanOption = (khandan) =>
    `${khandan.name}${
      khandan.address.landmark ? `, ${khandan.address.landmark}` : ""
    }${khandan.address.street ? `, ${khandan.address.street}` : ""} (${
      khandan.khandanid
    })`;

  const formatAddress = (address) => {
    if (!address) return "";
    const parts = [
      address.apartment,
      address.street,
      address.landmark,
      address.city,
      address.district,
      address.state,
      address.country,
      address.pin,
    ];
    return parts.filter(Boolean).join(", ");
  };

  useEffect(() => {
    if (willCome === "NO" && selectedUser?.address) {
      setDeliveryAddress({
        ...emptyDeliveryAddress,
        ...selectedUser.address,
      });
    } else if (willCome !== "NO") {
      setDeliveryAddress({ ...emptyDeliveryAddress });
    }
  }, [willCome, selectedUser]);

  useEffect(() => {
    if (userSearch.length > 0) {
      const filtered = userList.filter(
        (user) =>
          user.fullname.toLowerCase().includes(userSearch.toLowerCase()) ||
          (user.contact.mobileno &&
            user.contact.mobileno.number.includes(userSearch)) ||
          (user.contact.email &&
            user.contact.email
              .toLowerCase()
              .includes(userSearch.toLowerCase())) ||
          getKhandanName(user.khandanid)
            .toLowerCase()
            .includes(userSearch.toLowerCase())
      );
      setFilteredUsers(filtered);
      setShowUserDropdown(true);
    } else {
      setFilteredUsers([]);
      setShowUserDropdown(false);
    }
  }, [userSearch, userList, khandans]);

  useEffect(() => {
    if (selectedUser && donationList) {
      const previous = donationList
        .filter((donation) => donation.userId?._id === selectedUser._id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 2);
      setUserPreviousDonations(previous);
    } else {
      setUserPreviousDonations([]);
    }
  }, [selectedUser, donationList]);

  const getAvailableCategories = () => {
    const selectedCategoryIds = donations
      .filter((donation) => donation.id !== editingDonationId)
      .map((donation) => donation.categoryId);
    return categories
      .filter(
        (cat) =>
          !selectedCategoryIds.includes(cat._id) &&
          cat.isActive &&
          cat.showInRegularDonation !== false &&
          cat.categoryCode !== "maa_durga_pratima" &&
          (!cat.availableFor?.length || cat.availableFor.includes("self"))
      )
      .filter((cat) =>
        cat.categoryName.toLowerCase().includes(categorySearch.toLowerCase())
      );
  };

  const handleUserSelect = (user) => {
    console.log("Selected user: ", user);
    setSelectedUser(user);
    setUserSearch("");
    setShowUserDropdown(false);
    if (userSearchRef.current) {
      userSearchRef.current.blur();
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category._id);
    setCategorySearch(category.categoryName);
    setShowCategoryDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    const availableCategories = getAvailableCategories();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prevIndex) =>
        prevIndex < availableCategories.length - 1 ? prevIndex + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prevIndex) =>
        prevIndex > 0 ? prevIndex - 1 : availableCategories.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex > -1) {
      e.preventDefault();
      handleCategorySelect(availableCategories[highlightedIndex]);
    }
  };

  const handleAddDonation = () => {
    if (!selectedCategory) {
      toast.warn("Please select a category.");
      return;
    }
    const category = categories.find((cat) => cat._id === selectedCategory);
    if (!category) return;

    const isDynamic = categoryUsesMinimumAmount(category);
    let newDonation;

    if (isDynamic) {
      const amount = Number(dynamicAmount) || 0;
      const donationQuantity = category.minimumAmountPerUnit
        ? parseInt(quantity, 10)
        : 1;
      if (
        category.minimumAmountPerUnit &&
        (!Number.isInteger(donationQuantity) || donationQuantity < 1)
      ) {
        toast.warn("Please enter a valid quantity.");
        return;
      }
      const minimumAmount =
        category.configurationVersion === "category-v2"
          ? Number(category.rate) * donationQuantity
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
      if (category.configurationVersion !== "category-v2") {
        weight =
          amount < category.rate
            ? category.dynamic.minvalue
            : Math.floor(amount / category.rate) * category.weight;
      }
      newDonation = {
        id: editingDonationId || Date.now(),
        categoryId: category._id,
        category: category.categoryName,
        categoryCode: category.categoryCode,
        number: donationQuantity,
        amount: amount,
        isPacket: false,
        quantity: weight,
        prasadType:
          category.configurationVersion === "category-v2"
            ? category.prasadType
            : category.categoryCode === "maa_durga_pratima"
              ? "none"
              : category.packet
                ? "packet"
                : "grams",
        allowGramAlternativeForInPerson:
          category.configurationVersion === "category-v2" &&
          category.prasadType === "packet" &&
          (category.allowGramAlternativeForInPerson ||
            category.categoryName.toLowerCase().includes("professional")),
        packetsPerUnit: category.packetsPerUnit || 0,
        configurationVersion: category.configurationVersion,
      };
    } else {
      if (!quantity || parseInt(quantity, 10) < 1) {
        toast.warn("Please enter a valid quantity.");
        return;
      }
      const amount = category.rate * parseInt(quantity, 10);
      const weight = category.weight * parseInt(quantity, 10);
      newDonation = {
        id: editingDonationId || Date.now(),
        categoryId: category._id,
        category: category.categoryName,
        categoryCode: category.categoryCode,
        number: parseInt(quantity, 10),
        amount: amount,
        isPacket:
          category.configurationVersion === "category-v2"
            ? false
            : category.packet,
        quantity:
          category.configurationVersion === "category-v2" ? 0 : weight,
        prasadType:
          category.configurationVersion === "category-v2"
            ? category.prasadType
            : category.categoryCode === "maa_durga_pratima"
              ? "none"
              : category.packet
                ? "packet"
                : "grams",
        allowGramAlternativeForInPerson:
          category.configurationVersion === "category-v2" &&
          category.prasadType === "packet" &&
          (category.allowGramAlternativeForInPerson ||
            category.categoryName.toLowerCase().includes("professional")),
        packetsPerUnit: category.packetsPerUnit || 0,
        configurationVersion: category.configurationVersion,
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
    setSelectedCategory("");
    setCategorySearch("");
    setQuantity(1);
    setDynamicAmount("");
    setSelectedCategoryDetails(null);
    setShowCategoryDropdown(false);
  };

  const removeDonation = (id) => {
    setDonations(donations.filter((donation) => donation.id !== id));
    if (editingDonationId === id) setEditingDonationId(null);
  };

  const handleEditDonation = (donation) => {
    if (donation.categoryCode === "maa_durga_pratima") {
      setPratimaQuantity(donation.number);
      setPratimaAmount(String(donation.amount));
      toast.info("Pratima contribution loaded for editing");
      return;
    }
    const category = categories.find(
      (item) =>
        item._id === donation.categoryId ||
        item.categoryName === donation.category
    );
    if (!category) return toast.error("Donation category is no longer available");
    setEditingDonationId(donation.id);
    setSelectedCategory(category._id);
    setCategorySearch(category.categoryName);
    setShowCategoryDropdown(false);
    toast.info("Donation item loaded for editing");
  };

  const pratimaCategory = categories.find(
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
      categoryId: pratimaCategory._id,
      category: pratimaCategory.categoryName,
      categoryCode: pratimaCategory.categoryCode,
      number: units,
      amount,
      isPacket: false,
      quantity: 0,
      prasadType: "none",
      allowGramAlternativeForInPerson: false,
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

  useEffect(() => {
    if (selectedCategory) {
      const details = categories.find((c) => c._id === selectedCategory);
      setSelectedCategoryDetails(details);
      setCategorySearch(details?.categoryName || "");
      const editingDonation = donations.find(
        (donation) => donation.id === editingDonationId
      );
      if (editingDonation) {
        setDynamicAmount(String(editingDonation.amount));
        setQuantity(editingDonation.number);
      } else if (categoryUsesMinimumAmount(details)) {
        setDynamicAmount("");
        setQuantity(1);
      } else {
        setDynamicAmount("");
        setQuantity(details?.packet ? 1 : "");
      }
    } else {
      setSelectedCategoryDetails(null);
      setQuantity(1);
      setDynamicAmount("");
    }
  }, [selectedCategory, categories, donations, editingDonationId]);

  const totalAmount = donations.reduce(
    (sum, donation) => sum + donation.amount,
    0
  );
  const prasadEligibleDonationAmount = donations.reduce(
    (sum, donation) =>
      donation.prasadType === "none" ? sum : sum + donation.amount,
    0
  );
  const isCourierDonationEligible =
    prasadEligibleDonationAmount >= minimumCourierDonationAmount;
  const hasPrasadEligibleDonation = prasadEligibleDonationAmount > 0;

  useEffect(() => {
    if (!hasPrasadEligibleDonation) {
      setWillCome("");
      setDeliveryAddress({ ...emptyDeliveryAddress });
    } else if (!isCourierDonationEligible) {
      setWillCome("YES");
      setDeliveryAddress({ ...emptyDeliveryAddress });
    } else {
      setWillCome((current) => (current === "NO" ? current : ""));
    }
  }, [hasPrasadEligibleDonation, isCourierDonationEligible]);
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
  const effectiveHasGramCollectionOption = usesOnlyCategoryV2
    ? hasGramCollectionOption
    : prasadEligibleDonationAmount > 0;
  const effectiveHasPacketCollectionOption = hasPacketCollectionOption;
  const categoryV2PrasadPreview = calculateCategoryV2Prasad(
    donations,
    prasadRate,
    willCome === "NO" ? "courier" : willCome === "YES" ? "collection" : "",
    selectedPrasadType
  );

  useEffect(() => {
    setSelectedPrasadType((current) => {
      if (!hasPrasadEligibleDonation || willCome !== "YES") return "";
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
    hasPrasadEligibleDonation,
    willCome,
  ]);
  const totalWeight = donations.reduce(
    (sum, donation) => sum + donation.quantity,
    0
  );
  const totalPackets = donations.reduce(
    (count, donation) => count + (donation.isPacket ? donation.number : 0),
    0
  );

  const finalTotalWeight =
    totalWeight > 0 && totalWeight < minPrasadWeight
      ? minPrasadWeight
      : totalWeight;

  const getCourierChargeForAddress = (address) =>
    courierCharges.find((charge) => charge.region === address.currlocation)
      ?.amount || 0;

  const courierCharge =
    willCome === "NO"
      ? getCourierChargeForAddress(deliveryAddress)
      : 0;

  const netPayableAmount = totalAmount + courierCharge;

  const updateNestedField = (path, value) => {
    const pathArray = path.split(".");
    setNewUser((prev) => {
      const newState = { ...prev };
      let current = newState;
      for (let i = 0; i < pathArray.length - 1; i++) {
        current[pathArray[i]] = { ...current[pathArray[i]] };
        current = current[pathArray[i]];
      }
      current[pathArray[pathArray.length - 1]] = value;
      return newState;
    });
  };

  const handleLocationChange = (locationValue) => {
    updateNestedField("address.currlocation", locationValue);
    const selectedLocation = locationOptions.find(
      (option) => option.value === locationValue
    );
    if (selectedLocation) {
      Object.keys(selectedLocation.address).forEach((key) =>
        updateNestedField(`address.${key}`, selectedLocation.address[key])
      );
    }
  };

  const validateNewUser = () => {
    const errors = {};
    if (!newUser.fullname.trim()) errors.fullname = "Full name is required.";
    if (!newUser.fatherName.trim())
      errors.fatherName = "Father's name is required.";
    if (!newUser.gender) errors.gender = "Gender is required.";
    if (!newUser.dob) errors.dob = "Date of birth is required.";
    if (!newUser.khandanid) errors.khandanid = "Khandan is required.";
    if (!newUser.address.currlocation) errors.address = "Address is required.";
    if (!acceptedTerms)
      errors.terms = "You must accept the terms and conditions.";

    const today = new Date();
    const dobDate = new Date(newUser.dob);
    const minAllowedDate = new Date();
    minAllowedDate.setFullYear(today.getFullYear() - 10);
    if (dobDate > minAllowedDate) {
      errors.dob = "User must be at least 10 years old.";
    }

    if (newUser.contact.email && !validateEmail(newUser.contact.email)) {
      errors.email = "Invalid email address.";
    }

    if (!newUser.contact.email && !newUser.contact.mobileno.number) {
      errors.contact =
        "At least one contact method (email or mobile) is required.";
    }

    if (
      newUser.contact.mobileno.number &&
      !validateMobile(newUser.contact.mobileno.number)
    ) {
      errors.mobile = "Invalid 10-digit mobile number.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterUser = async () => {
    if (!validateNewUser()) {
      return toast.error("Please fix the validation errors.");
    }
    if (!recaptchaToken) {
      return toast.error("Please complete the reCAPTCHA.");
    }

    try {
      setLoading(true);
      const userData = {
        fullname: newUser.fullname.trim().replace(/\s{2,}/g, " "),
        fatherName: newUser.fatherName.trim().replace(/\s{2,}/g, " "),
        gender: newUser.gender,
        dob: newUser.dob,
        khandanid: newUser.khandanid,

        email: newUser.contact.email,
        mobile: newUser.contact.mobileno,
        whatsappno: newUser.contact.whatsappno,

        address: newUser.address,
        profession: newUser.profession,
        recaptchaToken,
      };

      const response = await axios.post(
        backendUrl + "/api/admin/register",
        userData,
        { headers: { aToken } }
      );
      if (response.data.success) {
        const { userId, username } = response.data;
        const newUserData = {
          _id: userId,
          fullname: newUser.fullname,
          username,
          ...newUser,
        };
        await getUserList();
        handleUserSelect(newUserData);
        setNewUser({
          fullname: "",
          gender: "",
          dob: "",
          khandanid: "",
          fatherName: "",
          contact: {
            email: "",
            mobileno: { code: "+91", number: "" },
            whatsappno: "",
          },
          address: {
            currlocation: "",
            country: "",
            state: "",
            district: "",
            city: "",
            postoffice: "",
            pin: "",
            landmark: "",
            street: "",
            apartment: "",
            floor: "",
            room: "",
          },
          profession: { category: "", job: "", specialization: "" },
        });
        setAcceptedTerms(false);
        setRecaptchaToken(null);
        setValidationErrors({});
        setShowAddUserForm(false);
        toast.success(`User registered successfully! Username: ${username}`);
      } else {
        toast.error(`Error: ${response.data.message}`);
      }
    } catch (error) {
      console.error("Error registering user:", error);
      toast.error(
        `Error registering user: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setUserSearch("");
    setDonations([]);
    setEditingDonationId(null);
    setWillCome("");
    setSelectedPrasadType("");
    setDeliveryAddress({ ...emptyDeliveryAddress });
    if (donationType === "individual") setPaymentMethod("");
    setRemarks("");
    setSelectedCategory("");
    setCategorySearch("");
    setQuantity(1);
    setDynamicAmount("");
    setPratimaAmount("");
    setPratimaQuantity(1);
    setUserPreviousDonations([]);
  };

  const handleSubmit = async () => {
    if (!selectedUser) return toast.error("Please select a user");
    if (donations.length === 0)
      return toast.error("Please add at least one donation");
    if (!paymentMethod) return toast.error("Please select a payment method");
    if (
      prasadEligibleDonationAmount > 0 &&
      !["YES", "NO"].includes(willCome)
    ) {
      return toast.error("Please select a Mahaprasad fulfilment mode");
    }
    if (
      prasadEligibleDonationAmount > 0 &&
      willCome === "YES" &&
      !selectedPrasadType
    ) {
      return toast.error("Please select the Mahaprasad type");
    }
    if (willCome === "NO" && !isCourierDonationEligible) {
      return toast.error(
        `Courier requires at least ₹${minimumCourierDonationAmount.toLocaleString("en-IN")} from Prasad-eligible categories. Please select in-person collection.`
      );
    }
    if (willCome === "NO") {
      const addressError = getDeliveryAddressError(deliveryAddress);
      if (addressError) return toast.error(addressError);
    }

    try {
      setLoading(true);
      console.log("testing.. user : ", selectedUser);
      const mahaprasadFulfillment =
        prasadEligibleDonationAmount <= 0
          ? { mode: "none", type: "none" }
          : willCome === "NO"
            ? { mode: "courier", type: "packet" }
            : { mode: "collection", type: selectedPrasadType };
      const orderData = {
        userId: selectedUser._id,
        donatedFor: selectedUser._id,
        donatedAs: "self",
        list: donations.map((d) => ({
          categoryId: d.categoryId,
          category: d.category,
          number: d.number,
          amount: d.amount,
          isPacket: d.isPacket,
          quantity: d.quantity,
        })),
        amount: netPayableAmount,
        method: paymentMethod,
        courierCharge,
        remarks,
        postalAddress:
          mahaprasadFulfillment.mode === "courier"
            ? formatDeliveryAddress(deliveryAddress)
            : formatAddress(selectedUser.address),
        deliveryAddress:
          mahaprasadFulfillment.mode === "courier"
            ? deliveryAddress
            : undefined,
        mahaprasadFulfillment,
      };

      if (["Cash", "QR Code"].includes(paymentMethod)) {
        const response = await axios.post(
          backendUrl + "/api/admin/create-donation-order",
          orderData,
          { headers: { aToken, "Content-Type": "application/json" } }
        );
        if (response.data.success) {
          toast.success(`${paymentMethod} donation recorded successfully!`);
          console.log("after dibtui: ", response.data);
          setReceiptData({
            donationData: response.data.donation,
            userData: selectedUser,
          });
          setShowReceiptModal(true);
          await getDonationList();
        } else {
          toast.error(`Error: ${response.data.message}`);
        }
      }
    } catch (error) {
      console.error("Error submitting donation:", error);
      toast.error("Error submitting donation");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToGroup = () => {
    if (!selectedUser || netPayableAmount <= 0) {
      toast.error("Please select a user and add donation items first.");
      return;
    }

    if (
      prasadEligibleDonationAmount > 0 &&
      !["YES", "NO"].includes(willCome)
    ) {
      return toast.error("Please select a Mahaprasad fulfilment mode");
    }
    if (
      prasadEligibleDonationAmount > 0 &&
      willCome === "YES" &&
      !selectedPrasadType
    ) {
      return toast.error("Please select the Mahaprasad type");
    }
    if (willCome === "NO") {
      if (!isCourierDonationEligible) {
        return toast.error("This donation is not eligible for courier delivery");
      }
      const addressError = getDeliveryAddressError(deliveryAddress);
      if (addressError) return toast.error(addressError);
    }
    const mahaprasadFulfillment =
      prasadEligibleDonationAmount <= 0
        ? { mode: "none", type: "none" }
        : willCome === "NO"
          ? { mode: "courier", type: "packet" }
          : { mode: "collection", type: selectedPrasadType };
    const newGroupEntry = {
      localId: Date.now(),
      user: selectedUser,
      donations: donations,
      netPayableAmount: netPayableAmount,
      orderPayload: {
        userId: selectedUser._id,
        donatedFor: selectedUser._id,
        donatedAs: "self",
        list: donations.map((d) => ({
          categoryId: d.categoryId,
          category: d.category,
          number: d.number,
          amount: d.amount,
          isPacket: d.isPacket,
          quantity: d.quantity,
        })),
        amount: netPayableAmount,
        method: groupPaymentMethod,
        courierCharge,
        remarks,
        postalAddress:
          mahaprasadFulfillment.mode === "courier"
            ? formatDeliveryAddress(deliveryAddress)
            : formatAddress(selectedUser.address),
        deliveryAddress:
          mahaprasadFulfillment.mode === "courier"
            ? deliveryAddress
            : undefined,
        mahaprasadFulfillment,
      },
      donationData: {
        amount: netPayableAmount,
        list: donations,
        courierCharge,
        receiptId: `TEMP-${Date.now()}`,
        createdAt: new Date().toISOString(),
        method: groupPaymentMethod,
        transactionId: "N/A",
      },
      userData: selectedUser,
      totals: categoryV2PrasadPreview
        ? {
            totalWeight: categoryV2PrasadPreview.grams,
            totalPackets: categoryV2PrasadPreview.packets,
            minPrasadWeight: 0,
          }
        : { totalWeight, totalPackets, minPrasadWeight },
    };

    setGroupDonations((prev) => [...prev, newGroupEntry]);
    setTotalGroupAmount((prev) => prev + netPayableAmount);
    toast.success(
      `${
        selectedUser.fullname
      }'s donation of ₹${netPayableAmount.toLocaleString(
        "en-IN"
      )} has been added to the group list.`
    );
    resetForm();
  };

  const handleDeleteFromGroup = (localId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this receipt from the group?"
      )
    ) {
      const receiptToRemove = groupDonations.find((g) => g.localId === localId);
      if (receiptToRemove) {
        setTotalGroupAmount((prev) => prev - receiptToRemove.netPayableAmount);
        setGroupDonations((prev) => prev.filter((g) => g.localId !== localId));
      }
    }
  };

  const handlePayGroup = async () => {
    if (
      groupDonations.length === 0 ||
      !window.confirm(
        `Process ${groupDonations.length} donations via ${groupPaymentMethod}?`
      )
    ) {
      return;
    }
    setIsPayingGroup(true);
    const successfulReceipts = [];
    const failedReceipts = [];
    for (const receipt of groupDonations) {
      try {
        const response = await axios.post(
          backendUrl + "/api/admin/create-donation-order",
          { ...receipt.orderPayload, method: groupPaymentMethod },
          { headers: { aToken, "Content-Type": "application/json" } }
        );
        if (response.data.success) {
          successfulReceipts.push({
            donationData: response.data.donation,
            userData: receipt.userData,
            ...receipt.totals,
          });
        } else {
          failedReceipts.push({
            name: receipt.user.fullname,
            reason: response.data.message,
          });
        }
      } catch (error) {
        failedReceipts.push({
          name: receipt.user.fullname,
          reason: error.response?.data?.message || "Network Error",
        });
      }
    }
    toast.success(
      `Batch complete! Success: ${successfulReceipts.length}, Failed: ${failedReceipts.length}`
    );
    if (failedReceipts.length > 0) {
      const errorDetails = failedReceipts
        .map((f) => `- ${f.name}: ${f.reason}`)
        .join("\n");
      toast.error(
        <div>
          <p>Failures:</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{errorDetails}</pre>
        </div>,
        { autoClose: 10000 }
      );
    }
    if (successfulReceipts.length > 0) {
      setReceiptData(successfulReceipts);
      setShowReceiptModal(true);
    }
    await getDonationList();
    setGroupDonations([]);
    setTotalGroupAmount(0);
    setIsPayingGroup(false);
  };

  const handleEndGroup = () => {
    if (
      groupDonations.length > 0 &&
      !window.confirm(
        "Are you sure you want to end and reset? The current group list will be cleared without payment."
      )
    ) {
      return;
    }
    setGroupDonations([]);
    setTotalGroupAmount(0);
    resetForm();
  };

  // Close form on Esc key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape" && showAddUserForm) {
        setShowAddUserForm(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [showAddUserForm]);

  return (
    <>
      {showReceiptModal && receiptData && (
        <ReceiptModal
          data={receiptData}
          isGroup={Array.isArray(receiptData)}
          onClose={handleCloseModal}
          adminName={adminName}
          totals={
            !Array.isArray(receiptData)
              ? categoryV2PrasadPreview
                ? {
                    totalWeight: categoryV2PrasadPreview.grams,
                    totalPackets: categoryV2PrasadPreview.packets,
                    minPrasadWeight: 0,
                  }
                : { totalWeight, totalPackets, minPrasadWeight }
              : null
          }
        />
      )}
      {showTermsModal && (
        <TermsModal onClose={() => setShowTermsModal(false)} />
      )}
      <div className="p-6 md:p-8 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Donation Receipt</h1>
          <div className="flex items-center bg-gray-200 rounded-full p-1 self-start md:self-center">
            <button
              onClick={() => setDonationType("individual")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                donationType === "individual"
                  ? "bg-white text-green-600 shadow-md"
                  : "text-gray-600 hover:bg-gray-300"
              }`}
            >
              Individual Donation
            </button>
            <button
              onClick={() => setDonationType("group")}
              className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                donationType === "group"
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-gray-600 hover:bg-gray-300"
              }`}
            >
              Group Donation
            </button>
          </div>
        </div>

        {donationType === "group" && (
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h2 className="text-2xl font-bold text-blue-800">
                Group Donation Summary
              </h2>
              <div className="flex items-center gap-2">
                <select
                  className="rounded-lg border bg-white px-3 py-2 text-sm"
                  value={groupPaymentMethod}
                  onChange={(event) => setGroupPaymentMethod(event.target.value)}
                  disabled={isPayingGroup}
                >
                  <option value="Cash">Pay via Cash</option>
                  <option value="QR Code">Pay via QR Code</option>
                </select>
                <button
                  onClick={handlePayGroup}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:bg-green-400"
                  disabled={isPayingGroup || groupDonations.length === 0}
                >
                  {isPayingGroup
                    ? "Processing..."
                    : `Pay All (${groupDonations.length})`}
                </button>
                <button
                  onClick={handleEndGroup}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
                  disabled={isPayingGroup}
                >
                  End & Reset
                </button>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center border-b pb-2 mb-2">
                <span className="text-lg font-semibold text-gray-700">
                  Total Group Donation:
                </span>
                <span className="text-2xl font-bold text-blue-600">
                  ₹{totalGroupAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="mt-4 max-h-60 overflow-y-auto pr-2">
                <h3 className="font-semibold text-gray-600 mb-2">
                  Receipts Added ({groupDonations.length}):
                </h3>
                {groupDonations.length > 0 ? (
                  <ul className="space-y-2">
                    {groupDonations.map((donation, index) => (
                      <li
                        key={donation.localId}
                        className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-800">
                            {index + 1}. {donation.user.fullname}
                          </span>
                          <span className="font-medium text-gray-900">
                            ₹{donation.netPayableAmount.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleDeleteFromGroup(donation.localId)
                          }
                          className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove receipt"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">
                    No receipts added to the group yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 space-y-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select User
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={userSearchRef}
                  type="text"
                  placeholder="Search by name, phone, email, or khandan..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onFocus={() =>
                    userSearch.length > 0 && setShowUserDropdown(true)
                  }
                />
              </div>
              {showUserDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <div
                        key={user._id}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => handleUserSelect(user)}
                      >
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.fullname}
                            </div>
                            <div className="text-sm text-gray-600">
                              {user.contact.mobileno?.code}{" "}
                              {user.contact.mobileno?.number} •{" "}
                              {user.contact.email}
                            </div>
                            <div className="text-xs text-blue-600">
                              Father's Name: {user.fatherName}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center">
                      <p className="text-gray-500 mb-2">No users found</p>
                      <button
                        onClick={() => {
                          setShowAddUserForm(true);
                          setShowUserDropdown(false);
                        }}
                        className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Add New User
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedUser && (
              <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedUser.fullname}
                      </h3>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          {selectedUser.contact.mobileno?.code}{" "}
                          {selectedUser.contact.mobileno?.number}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          {selectedUser.contact.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3" />
                          {selectedUser.address.street},{" "}
                          {selectedUser.address.city},{" "}
                          {selectedUser.address.state} -{" "}
                          {selectedUser.address.pin}
                        </div>
                        <div className="text-blue-600 font-medium">
                          Father's Name: {selectedUser.fatherName}
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearch("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {showAddUserForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Add New User</h2>
                    <button
                      onClick={() => setShowAddUserForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        value={newUser.fullname}
                        onChange={(e) => capitalizeAndFixCursor(e, "fullname")}
                        required
                      />
                      <ValidationMessage
                        show={validationErrors.fullname}
                        message={validationErrors.fullname}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={newUser.gender}
                          onChange={(e) =>
                            setNewUser({ ...newUser, gender: e.target.value })
                          }
                          required
                        >
                          <option value="">Select Gender</option>
                          {genderOptions.map((gender) => (
                            <option key={gender} value={gender}>
                              {gender.charAt(0).toUpperCase() + gender.slice(1)}
                            </option>
                          ))}
                        </select>
                        <ValidationMessage
                          show={validationErrors.gender}
                          message={validationErrors.gender}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={newUser.dob}
                          onChange={(e) =>
                            setNewUser({ ...newUser, dob: e.target.value })
                          }
                          required
                        />
                        <ValidationMessage
                          show={validationErrors.dob}
                          message={validationErrors.dob}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Khandan <span className="text-red-500">*</span>
                      </label>
                      {khandans.length <= 1 ? (
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-100"
                          value={khandans[0]?.name || ""}
                          disabled
                        />
                      ) : (
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={newUser.khandanid}
                          onChange={(e) =>
                            handleKhandanChangeForNewUser(e.target.value)
                          }
                          required
                        >
                          <option value="">Select Khandan</option>
                          {khandans.map((khandan) => (
                            <option key={khandan._id} value={khandan._id}>
                              {formatKhandanOption(khandan)}
                            </option>
                          ))}
                        </select>
                      )}
                      <ValidationMessage
                        show={validationErrors.khandanid}
                        message={validationErrors.khandanid}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Father's Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        value={newUser.fatherName}
                        onChange={(e) =>
                          capitalizeAndFixCursor(e, "fatherName")
                        }
                        required
                      />
                      <ValidationMessage
                        show={validationErrors.fatherName}
                        message={validationErrors.fatherName}
                      />
                    </div>
                    <div className="pt-1">
                      <h3 className="border-b pb-2 text-lg font-semibold text-gray-800 mb-3">
                        Contact Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.contact.email}
                            onChange={(e) =>
                              updateNestedField("contact.email", e.target.value)
                            }
                            placeholder="Enter email address"
                          />
                          <ValidationMessage
                            show={validationErrors.email}
                            message={validationErrors.email}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mobile Number
                          </label>
                          <div className="flex">
                            <select
                              className="px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50"
                              value={newUser.contact.mobileno.code}
                              onChange={(e) =>
                                updateNestedField(
                                  "contact.mobileno.code",
                                  e.target.value
                                )
                              }
                            >
                              <option value="+91">+91</option>
                              <option value="+1">+1</option>
                              <option value="+44">+44</option>
                            </select>
                            <input
                              type="tel"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              value={newUser.contact.mobileno.number}
                              onChange={(e) =>
                                updateNestedField(
                                  "contact.mobileno.number",
                                  e.target.value
                                )
                              }
                              placeholder="Enter 10-digit mobile number"
                              maxLength="10"
                            />
                          </div>
                          <ValidationMessage
                            show={validationErrors.mobile}
                            message={validationErrors.mobile}
                          />
                          <ValidationMessage
                            show={validationErrors.contact}
                            message={validationErrors.contact}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            WhatsApp Number
                          </label>
                          <input
                            type="tel"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.contact.whatsappno}
                            onChange={(e) =>
                              updateNestedField(
                                "contact.whatsappno",
                                e.target.value
                              )
                            }
                            placeholder="Enter WhatsApp number (optional)"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pt-1">
                      <h3 className="border-b pb-2 text-lg font-semibold text-gray-800 mb-3">
                        Address Information
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Current Location{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={newUser.address.currlocation}
                          onChange={(e) => handleLocationChange(e.target.value)}
                          required
                        >
                          <option value="">Select Location</option>
                          {locationOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <ValidationMessage
                          show={validationErrors.address}
                          message={validationErrors.address}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.country}
                            onChange={(e) =>
                              updateNestedField(
                                "address.country",
                                e.target.value
                              )
                            }
                            placeholder="Enter country"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.state}
                            onChange={(e) =>
                              updateNestedField("address.state", e.target.value)
                            }
                            placeholder="Enter state"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            District
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.district}
                            onChange={(e) =>
                              updateNestedField(
                                "address.district",
                                e.target.value
                              )
                            }
                            placeholder="Enter district"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.city}
                            onChange={(e) =>
                              updateNestedField("address.city", e.target.value)
                            }
                            placeholder="Enter city"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Post Office
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.postoffice}
                            onChange={(e) =>
                              updateNestedField(
                                "address.postoffice",
                                e.target.value
                              )
                            }
                            placeholder="Enter post office"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            PIN Code
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.pin}
                            onChange={(e) =>
                              updateNestedField("address.pin", e.target.value)
                            }
                            placeholder="Enter PIN code"
                            maxLength="6"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Landmark
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.landmark}
                            onChange={(e) =>
                              updateNestedField(
                                "address.landmark",
                                e.target.value
                              )
                            }
                            placeholder="Enter landmark"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Street
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.street}
                            onChange={(e) =>
                              updateNestedField(
                                "address.street",
                                e.target.value
                              )
                            }
                            placeholder="Enter street"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Apartment/Building
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.apartment}
                            onChange={(e) =>
                              updateNestedField(
                                "address.apartment",
                                e.target.value
                              )
                            }
                            placeholder="Enter apartment/building"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Floor
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.floor}
                            onChange={(e) =>
                              updateNestedField("address.floor", e.target.value)
                            }
                            placeholder="Enter floor"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Room
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.address.room}
                            onChange={(e) =>
                              updateNestedField("address.room", e.target.value)
                            }
                            placeholder="Enter room"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">
                        Professional Information (Optional)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.profession.category}
                            onChange={(e) =>
                              updateNestedField(
                                "profession.category",
                                e.target.value
                              )
                            }
                            placeholder="e.g., IT, Healthcare, Education"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Job Title
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.profession.job}
                            onChange={(e) =>
                              updateNestedField(
                                "profession.job",
                                e.target.value
                              )
                            }
                            placeholder="e.g., Software Engineer, Doctor"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Specialization
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            value={newUser.profession.specialization}
                            onChange={(e) =>
                              updateNestedField(
                                "profession.specialization",
                                e.target.value
                              )
                            }
                            placeholder="e.g., React Developer, Cardiologist"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input
                        type="checkbox"
                        id="terms-checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="h-4 w-4 text-green-600 rounded"
                      />
                      <label
                        htmlFor="terms-checkbox"
                        className="text-sm text-gray-700"
                      >
                        I agree to the{" "}
                        <span
                          onClick={() => setShowTermsModal(true)}
                          className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium"
                        >
                          Terms & Conditions
                        </span>
                      </label>
                      <ValidationMessage
                        show={validationErrors.terms}
                        message={validationErrors.terms}
                      />
                    </div>
                    <div className="flex justify-center pt-2">
                      <ReCAPTCHA
                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                        onChange={setRecaptchaToken}
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAddUserForm(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRegisterUser}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400"
                      disabled={loading || !acceptedTerms || !recaptchaToken}
                    >
                      {loading ? "Registering..." : "Register User"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {userPreviousDonations.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Previous Donations
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {userPreviousDonations.map((donation) => (
                  <div
                    key={donation._id}
                    className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-2 pb-2 border-b">
                      <span className="font-semibold text-blue-800">
                        Date:{" "}
                        {new Date(donation.date).toLocaleDateString("en-IN")}
                      </span>
                      <span className="font-bold text-gray-800">
                        Total: ₹{donation.amount}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left font-medium text-gray-600 py-1 px-2">
                            Category
                          </th>
                          <th className="text-right font-medium text-gray-600 py-1 px-2">
                            Qty
                          </th>
                          <th className="text-right font-medium text-gray-600 py-1 px-2">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {donation.list.map((item, index) => (
                          <tr key={index}>
                            <td className="py-1 px-2">{item.category}</td>
                            <td className="text-right py-1 px-2">
                              {item.number}
                            </td>
                            <td className="text-right py-1 px-2">
                              ₹{item.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Donation Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-gray-50 p-4 rounded-lg">
              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="relative">
                  <input
                    ref={categoryInputRef}
                    type="text"
                    className="w-full px-3 py-2 border rounded-lg bg-white pr-10"
                    placeholder="Search category..."
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setShowCategoryDropdown(true);
                      setSelectedCategory("");
                      setHighlightedIndex(-1);
                    }}
                    onFocus={() => setShowCategoryDropdown(true)}
                    onKeyDown={handleKeyDown}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                {showCategoryDropdown && (
                  <div
                    ref={categoryDropdownRef}
                    className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto mt-1"
                  >
                    {getAvailableCategories().length > 0 ? (
                      getAvailableCategories().map((cat, index) => (
                        <div
                          key={cat._id}
                          className={`p-2 hover:bg-gray-100 cursor-pointer ${
                            index === highlightedIndex ? "bg-gray-100" : ""
                          }`}
                          onClick={() => handleCategorySelect(cat)}
                        >
                          {cat.categoryName}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-gray-500 text-center">
                        No categories found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {categoryUsesMinimumAmount(selectedCategoryDetails) ? (
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
                      className="w-full px-3 py-2 border rounded-lg"
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
                    className="w-full px-3 py-2 border rounded-lg"
                    value={dynamicAmount}
                    onChange={(e) => setDynamicAmount(e.target.value)}
                    disabled={!selectedCategoryDetails}
                  />
                </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="w-full px-3 py-2 border rounded-lg"
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
                      value={
                        selectedCategoryDetails
                          ? (
                              selectedCategoryDetails.rate *
                              (Number(quantity) || 0)
                            ).toLocaleString("en-IN")
                          : "0"
                      }
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
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 rounded-lg">
                <div className="flex flex-wrap justify-around items-center gap-x-6 gap-y-2">
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
              <div className="overflow-x-auto mt-6">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Category
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Quantity
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Amount
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((donation) => (
                      <tr
                        key={donation.id}
                        className="border-t border-gray-200"
                      >
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {donation.category}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {donation.number}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          ₹{donation.amount}
                        </td>
                        <td className="flex gap-3 px-4 py-2">
                          <button
                            type="button"
                            onClick={() => handleEditDonation(donation)}
                            className="text-blue-600 hover:text-blue-800"
                            aria-label={`Edit ${donation.category}`}
                            title="Edit donation item"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDonation(donation.id)}
                            className="text-red-600 hover:text-red-800"
                            aria-label={`Remove ${donation.category}`}
                            title="Remove donation item"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {prasadEligibleDonationAmount > 0 && (
              <DonationFulfillmentFields
                mode={
                  willCome === "YES"
                    ? "collection"
                    : willCome === "NO"
                      ? "courier"
                      : ""
                }
                onModeChange={(mode) => {
                  setWillCome(mode === "courier" ? "NO" : "YES");
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
                disabled={loading}
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courierCharge === 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Mahaprasad Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Weight:</span>
                    <span className="font-medium">
                      {formatPrasadWeight(
                        categoryV2PrasadPreview
                          ? categoryV2PrasadPreview.grams
                          : willCome === "NO"
                            ? 0
                            : finalTotalWeight
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Packet:</span>
                    <span className="font-medium">
                      {categoryV2PrasadPreview
                        ? categoryV2PrasadPreview.packets.toLocaleString("en-IN")
                        : willCome === "NO"
                          ? 1
                          : totalPackets}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div
              className={`bg-green-50 rounded-lg p-4 ${
                courierCharge > 0 ? "md:col-span-2" : ""
              }`}
            >
              <h3 className="font-semibold text-gray-800 mb-3">
                Donation Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Donation Amount:</span>
                  <span className="font-medium">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Courier Charge:</span>
                  <span className="font-medium">
                    ₹{courierCharge}
                    {willCome === "NO" && selectedUser && courierCharge > 0 && (
                      <span className="text-xs text-gray-500 ml-1">
                        (auto-calculated)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Net Payable Amount:</span>
                  <span className="font-bold text-green-600">
                    ₹{netPayableAmount}
                  </span>
                </div>
                {netPayableAmount > 0 && (
                  <div className="text-xs text-gray-600 capitalize pt-2 border-t">
                    <strong>In Words:</strong> {toWords(netPayableAmount)}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${
              donationType === "group" ? "hidden" : ""
            }`}
          >
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Payment Option
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">Select Payment Method</option>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows="3"
                placeholder="Enter any additional remarks..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            {donationType === "individual" ? (
              <button
                onClick={handleSubmit}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:bg-green-400"
                disabled={loading}
              >
                <CreditCard className="h-5 w-5" />
                {loading ? "Processing..." : "Submit Receipt"}
              </button>
            ) : (
              <button
                onClick={handleAddToGroup}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-gray-400"
                disabled={!selectedUser || netPayableAmount <= 0}
              >
                <Plus className="h-5 w-5" />
                Add Receipt to Group
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Receipt;
