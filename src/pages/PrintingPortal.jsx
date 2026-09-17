import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  useMemo,
  forwardRef,
} from "react";
import axios from "axios";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import html2pdf from "html2pdf.js";
import { AdminContext } from "../context/AdminContext";
import DonationEditModal from "../components/DonationEditModal";
import PublicDonationReceiptTemplate from "../components/DonationReceiptTemplate";
import PrasadTokenTemplate from "../components/PrasadTokenTemplate";
import { printElements } from "../utils/printElements";
import { getSavedPrasadTotals } from "../utils/prasadCalculation";

const addressLabelStyles = `

    .pdf-page-wrapper {
        width: 287mm;
        height: 200mm;
        page-break-after: always;
        break-after: page;
        box-sizing: border-box;
        padding: 5mm;
        overflow: hidden;
    }

    .labels-grid-container {
        /* Use CSS Grid for the 2x3 layout */
        display: grid;
        grid-template-columns: repeat(2, 1fr); /* Two equal-width columns */
        grid-auto-rows: minmax(30mm, auto); /* Approx. 3 rows per page (200mm height / 3 = 66.6mm height per label) */
        gap: 2mm; /* Spacing between labels */
        box-sizing: border-box;
        height: 100%;
    }

    .address-label-wrapper {
        /* CRITICAL for Page Breaks: Keeps the label from splitting */
        page-break-inside: avoid;
        break-inside: avoid;

        /* Ensure the wrapper respects the grid size */
        width: 100%;
        height: 100%;

        /* Optional: Add visible border for debugging and professionalism */
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
        overflow: hidden;
    }

    /* Ensure the print content fills the label wrapper */
    .address-label-wrapper > div {
        padding: 3mm;
        height: 100%;
    }
`;

// Helper function (place this outside the component, or inside but before the return)
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// PrintableAddresses component
const PrintableAddresses = forwardRef(({ addresses }, ref) => {
  if (!addresses || addresses.length === 0) {
    return null;
  }

  // Chunk the addresses into groups of 10
  const pagesOfAddresses = chunkArray(addresses, 10); // 10 labels per page (2x5)

  return (
    <div ref={ref} style={{ fontFamily: "Arial, sans-serif" }}>
      <style>{addressLabelStyles}</style>

      {pagesOfAddresses.map((pageAddresses, pageIndex) => (
        // The critical wrapper to define a single page and force a break after it.
        <div key={pageIndex} className="pdf-page-wrapper">
          {/* Apply your grid container styles here */}
          <div className="labels-grid-container">
            {pageAddresses.map((addr) => (
              // Each individual label uses the break-inside: avoid style
              <div key={addr.id} className="address-label-wrapper">
                <AddressLabel addressData={addr} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
});
PrintableAddresses.displayName = "PrintableAddresses";

const AddressLabel = ({ addressData }) => {
  const {
    id,
    receiptId,
    toName,
    toAddress, // This field is assumed to contain the full, formatted street/city/pin
    toPhone
  } = addressData;

  const internalRef = receiptId;

  if (!addressData) return <p>No address data provided.</p>;

  // Internal styles for the label content to reduce unnecessary spacing
  const contentStyle = {
    fontSize: '16px',
    lineHeight: '1.2',
    color: '#333',
  };

  const refStyle = {
    fontSize: '11px',
    color: '#666',
    marginTop: '5px',
    paddingTop: '3px',
  };

  return (
    // The outermost div inside the .address-label-wrapper (as per the CSS update)
    <div
        key={id}
        style={{ padding: '4px', height: '100%', boxSizing: 'border-box' }}
    >

      {/* 2. Recipient Details */}
      <div style={contentStyle}>
        <p style={{ margin: '0 0 2px 0', fontSize: '18px', fontWeight: 'bold' }}>
          {toName}
        </p>

        {/* The main address block */}
        <p style={{ margin: '0 0 4px 0' }}>
          {toAddress}
        </p>

        {/* Phone Number */}
        <p style={{ margin: '10px 10px 0 0' }}>
          <strong>Mobile:</strong> {toPhone}
        </p>
      </div>

      {/* 3. Internal Reference (at the bottom) */}
      <div style={refStyle}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <strong>Ref:</strong>
            <span style={{ marginLeft: '4px', fontWeight: 'bold', color: '#000' }}>
                {internalRef}
            </span>
        </div>
      </div>

      {/* Optional: Placeholder for a small barcode/QR code if needed in the future */}
      {/* <div style={{ textAlign: 'center', marginTop: '5px' }}>
          <Barcode value={internalRef} width={0.8} height={20} displayValue={false} />
      </div> */}

    </div>
  );
};

const PrintableDonationDocument = forwardRef(
  (
    {
      donationData,
      guestData,
      totalWeight,
      totalPackets,
      courierCharge = 0,
      documentType = "receipt",
    },
    ref
  ) => {
    if (!donationData || !guestData) return null;

    const populatedUser =
      donationData.userId && typeof donationData.userId === "object"
        ? donationData.userId
        : guestData;
    const user = {
      ...populatedUser,
      contact: populatedUser.contact || guestData.contact,
      address: populatedUser.address || guestData.address,
      fullname:
        populatedUser.fullname || donationData.donorName || guestData.fullname,
      fatherName:
        populatedUser.fatherName ||
        populatedUser.father ||
        guestData.fatherName ||
        guestData.father ||
        "",
    };
    const childUser =
      donationData.donatedFor &&
      typeof donationData.donatedFor === "object"
        ? donationData.donatedFor
        : undefined;
    const receiptDonation = {
      ...donationData,
      amount:
        Number(donationData.amount || 0) + Number(courierCharge || 0),
    };
    const receiptData = { donation: receiptDonation, user, childUser };

    return (
      <div ref={ref} className="m-2" style={{ position: "relative" }}>
        {documentType === "prasad-token" ? (
          <PrasadTokenTemplate
            receiptData={receiptData}
            totalWeight={totalWeight}
            totalPackets={totalPackets}
          />
        ) : (
          <PublicDonationReceiptTemplate receiptData={receiptData} />
        )}
      </div>
    );
  }
);
PrintableDonationDocument.displayName = "PrintableDonationDocument";

const ReceiptPreviewModal = ({
  donation,
  onClose,
  onEdit
}) => {
  const receiptRef = useRef(null);
  const prasadTokenRef = useRef(null);

  const { totalWeight, totalPackets } = useMemo(() => {
    if (!donation || !donation.list) return { totalWeight: 0, totalPackets: 0 };
    const fallbackTotals = donation.list.reduce(
      (acc, d) => {
        acc.totalWeight += d.isPacket ? 0 : d.quantity;
        acc.totalPackets += d.isPacket ? d.quantity : 0;
        return acc;
      },
      { totalWeight: 0, totalPackets: 0 }
    );
    return getSavedPrasadTotals(donation, fallbackTotals);
  }, [donation]);

  const finalTotalWeight = totalWeight;
  const hasPrasadToken = totalWeight > 0 || totalPackets > 0;

  const { guestData, donationData } = useMemo(() => {
    const defaultAddress = {
      street: "N/A",
      city: "N/A",
      state: "N/A",
      pin: "N/A",
    };
    const defaultContact = { mobileno: { code: "+91", number: "N/A" } };
    let gd;

    switch (donation.userType) {
      case "guest": {
        const guest = donation.userId || {};
        gd = {
          contact: guest.contact || defaultContact,
          address: guest.address || defaultAddress,
        };
        break;
      }

      case "child": {
        const parent = donation.userId || {};
        gd = {
          contact: parent.contact || defaultContact,
          address: parent.address || defaultAddress,
        };
        break;
      }

      case "registered":
      default: {
        const user = donation.userId || {};
        gd = {
          contact: user.contact || defaultContact,
          address: user.address || defaultAddress,
        };
        break;
      }
    }

    const dd = { ...donation, transactionId: donation.transactionId || "N/A" };
    return { guestData: gd, donationData: dd };
  }, [donation]);

  const courierCharge = useMemo(() => {
    return donation?.courierCharge || 0;
  }, [donation?.courierCharge]);

  const handleDownloadPDF = () => {
    const element = receiptRef.current;
    const opt = {
      margin: 0,
      filename: `receipt-${donation.receiptId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().from(element).set(opt).save();
  };

  const handleDownloadPrasadToken = () => {
    const element = prasadTokenRef.current;
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `prasad-token-${donation.receiptId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().from(element).set(opt).save();
  };

  const handlePrint = () => {
    const element = receiptRef.current;
    if (element) {
      printElements({
        elements: element,
        title: `Print Receipt - ${donation.receiptId}`,
        printStyles: `
          body { margin: 0; font-family: 'Segoe UI', sans-serif; background: white; }
          @media print {
            body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
            .bill-container { box-shadow: none !important; border: 1px solid #ccc !important; }
          }
        `,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-200">
        <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full"></div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                Receipt Preview
              </h3>
              <p className="text-sm text-gray-600">
                Receipt ID: {donation.receiptId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors duration-200 text-gray-500 hover:text-gray-700"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6"
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

        <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="bg-white rounded-xl shadow-lg p-4 mx-auto border border-gray-200">
            <div className="transform scale-90 origin-top mx-auto transition-transform duration-300 hover:scale-95">
              <PrintableDonationDocument
                ref={receiptRef}
                donationData={donationData}
                guestData={guestData}
                totalWeight={totalWeight}
                totalPackets={totalPackets}
                courierCharge={courierCharge}
              />
            </div>
            {hasPrasadToken && (
              <div
                style={{ position: "fixed", left: "-10000px", top: 0, width: "800px" }}
              >
                <PrintableDonationDocument
                  ref={prasadTokenRef}
                  donationData={donationData}
                  guestData={guestData}
                  totalWeight={totalWeight}
                  totalPackets={totalPackets}
                  courierCharge={courierCharge}
                  documentType="prasad-token"
                />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
          <div className="flex flex-wrap justify-end items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Donation Receipt PDF
            </button>

            {hasPrasadToken && (
              <button
                onClick={handleDownloadPrasadToken}
                className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-amber-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Prasad Token PDF
              </button>
            )}

            <button
              onClick={handlePrint}
              className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-medium rounded-lg hover:from-green-700 hover:to-green-800 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
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
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Donation Receipt
            </button>

            <button
              onClick={() => onEdit(donation)}
              className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-amber-700 transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg"
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
              Edit
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Total Weight:{" "}
              <span className="font-medium text-gray-700">
                {finalTotalWeight} g
              </span>{" "}
              • Total Packets:{" "}
              <span className="font-medium text-gray-700">{totalPackets}</span>{" "}
              • Courier Charge:{" "}
              <span className="font-medium text-gray-700">
                ₹{courierCharge}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component
const PrintingPortal = () => {
  const [printType, setPrintType] = useState("receipt");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { backendUrl, aToken, adminName } = useContext(AdminContext);

  // States for Courier Address UI
  const [courierYear, setCourierYear] = useState(new Date().getFullYear());
  const [location, setLocation] = useState("all");
  const [donorType, setDonorType] = useState("all"); // <-- NEW STATE
  const [availableYears, setAvailableYears] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [addressCount, setAddressCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef("addresses");

  // States for Receipt UI
  const [receiptYear, setReceiptYear] = useState(new Date().getFullYear());
  const [paymentMode, setPaymentMode] = useState("all");
  const [userType, setUserType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [allDonations, setAllDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [previewDonation, setPreviewDonation] = useState(null);
  const [editingDonation, setEditingDonation] = useState(null);
  const [minPrasadWeight, setMinPrasadWeight] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      console.log("Fetching initial data - years and categories");
      if (!aToken) return;
      try {
        const [yearsRes, categoriesRes] = await Promise.all([
          axios.get(`${backendUrl}/api/admin/available-years`, {
            headers: { aToken },
          }),
          axios.get(`${backendUrl}/api/admin/categories`, {
            headers: { aToken },
          }),
        ]);

        if (yearsRes.data.success) {
          setAvailableYears(yearsRes.data.years);
        }

        if (categoriesRes.data.success) {
          const activeCategories =
            categoriesRes.data.categories.filter((cat) => cat.isActive) || [];
          const dynamicCategories = activeCategories.filter(
            (cat) => cat.dynamic?.isDynamic && cat.dynamic?.minvalue > 0
          );
          if (dynamicCategories.length > 0) {
            const minWeight = Math.min(
              ...dynamicCategories.map((cat) => cat.dynamic.minvalue)
            );
            setMinPrasadWeight(minWeight);
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
        setError("Could not load initial portal data.");
      }
    };
    fetchData();
  }, [backendUrl, aToken]);

  const fetchAddresses = useCallback(async () => {
    console.log("Fetching address for year:", courierYear, "location:", location, "donorType:", donorType);
    if (!courierYear) return;
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `${backendUrl}/api/admin/courier-addresses`,
        {
          params: { year: courierYear, location, donorType },
          headers: { aToken },
        }
      );
      if (response.data.success) {
        const allFetchedAddresses = response.data.addresses || [];

        // 3. Set the processed list to state
        setAddresses(allFetchedAddresses);
        setAddressCount(allFetchedAddresses.length);
      } else {
        setError(response.data.message || "Failed to fetch addresses.");
        setAddresses([]);
        setAddressCount(0);
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
      setError("An error occurred while fetching data.");
      setAddresses([]);
      setAddressCount(0);
    } finally {
      setLoading(false);
    }
  }, [courierYear, location, donorType, backendUrl, aToken]);

  const fetchDonations = useCallback(async () => {
    console.log("Fetching donations for receipts");
    setLoadingDonations(true);
    setError("");
    try {
      const [registeredRes, guestRes] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/donation-list`, {
          headers: { aToken },
        }),
        axios.get(`${backendUrl}/api/admin/guest-donation-list`, {
          headers: { aToken },
        }),
      ]);
      console.log(guestRes.data.donations);

      const registeredDonations = registeredRes.data.success
        ? registeredRes.data.donations
            .filter((d) => !d.refunded && d.paymentStatus === 'completed')
            .map((d) => ({
              ...d,
              userType: d.donatedFor ? "child" : "registered",
              relationship: d.relationName
                            ? `W/O ${d.relationName}`
                            : d.donatedFor
                              ? `${d.donatedFor.gender === 'female' ? "D/O" : "S/O"} ${d.userId.fullname}`
                              : `${d.userId.gender === 'female' ? "D/O" : "S/O"} ${d.userId.fatherName}`,
              donorName: d.donatedFor ? d.donatedFor.fullname : d.userId.fullname,
            }))
        : [];

      const guestDonations = guestRes.data.success
        ? guestRes.data.donations
            .filter((d) => !d.refunded && d.paymentStatus === 'completed')
            .map((d) => ({
              ...d,
              userType: "guest",
              relationship: `C/O ${d.userId.father}`,
              donorName: d.userId.fullname || "Guest",
            }))
        : [];
      setAllDonations([...registeredDonations, ...guestDonations]);
    } catch (err) {
      console.error("Failed to fetch donations:", err);
      setError("An error occurred while fetching donation data.");
      setAllDonations([]);
    } finally {
      setLoadingDonations(false);
    }
  }, [backendUrl, aToken]);

  useEffect(() => {
    if (printType === "courier_addresses") {
      fetchAddresses();
    } else if (printType === "receipt") {
      fetchDonations();
    }
  }, [printType, fetchAddresses, fetchDonations]);

  const filteredDonations = useMemo(() => {
    return allDonations.filter((d) => {
      const donationYear = new Date(d.createdAt).getFullYear();
      let donorName = "";
      switch (d.userType) {
        case "guest":
          donorName = (d.userId?.fullname || "Guest").toLowerCase();
          break;
        case "child":
          donorName = (d.donatedFor?.fullname || "").toLowerCase();
          break;
        case "registered":
        default:
          donorName = (d.userId?.fullname || "").toLowerCase();
          break;
      }

      const yearMatch =
        receiptYear === "all" || donationYear === parseInt(receiptYear);
      const paymentMatch =
        paymentMode === "all" || d.method.toLowerCase().includes(paymentMode);
      const userTypeMatch = userType === "all" || d.userType === userType;
      const searchMatch =
        searchTerm === "" || donorName.includes(searchTerm.toLowerCase());

      return yearMatch && paymentMatch && userTypeMatch && searchMatch;
    });
  }, [allDonations, receiptYear, paymentMode, userType, searchTerm]);

  const handleDownloadAddressesPDF = () => {
    if (downloading || addresses.length === 0) return;
    setDownloading(true);
    setError("");
    const element = printRef.current;
    if (!element) {
      setError("Could not find printable content.");
      setDownloading(false);
      return;
    }
    const opt = {
      margin: 0.5,
      filename: `courier-addresses-${courierYear}-${location}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };
    setTimeout(() => {
      html2pdf()
        .from(element)
        .set(opt)
        .save()
        .then(() => {
          setDownloading(false);
        })
        .catch((err) => {
          setError("An error occurred while generating the PDF.");
          console.error("PDF generation error:", err);
          setDownloading(false);
        });
    }, 100); // Safety timeout of 60 seconds

  };

  const prepareAddressDataForExport = (addresses) => {
    // Define the column headers you want in the Excel file
    const headers = [
        "Receipt ID",
        "Recipient Name",
        "Courier Address",
        "Mobile Number"
    ];

    // Map your complex address objects into simple arrays/objects
    const data = addresses.map(addr => ({
        'Receipt ID': addr.receiptId || '',
        'Recipient Name': addr.toName || '',
        // Use a simple, concatenated address string for export clarity
        'Full Address': addr.toAddress || 'N/A',
        'Phone Number': addr.toPhone || ''
    }));

    return [headers, ...data];
  };

  const exportToExcel = (addresses) => {
    if (!addresses || addresses.length === 0) {
        alert("No addresses selected to export.");
        return;
    }

    // 1. Prepare the data (transform objects to flat array/object)
    const worksheetData = prepareAddressDataForExport(addresses);

    // 2. Create a new workbook
    const workbook = XLSX.utils.book_new();

    // 3. Convert the data array/object into a worksheet
    const worksheet = XLSX.utils.json_to_sheet(worksheetData.slice(1), {
        header: worksheetData[0], // Pass headers explicitly
        skipHeader: true
    });

    // 4. Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Address Labels");

    // 5. Write (save) the workbook as a binary string
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

    // 6. Create a Blob and trigger download using file-saver
    const data = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
    });

    const filename = `addresses_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveAs(data, filename);
  };

  const handleUpdateSuccess = async (newDonationData, oldDonation) => {
    try {
      if (!newDonationData) {
        setAllDonations((prev) =>
          prev.filter((d) => d._id !== oldDonation._id)
        );
      } else {
        setAllDonations((prev) =>
          prev.map((d) =>
            d._id === oldDonation._id ? { ...d, ...newDonationData } : d
          )
        );
      }
      setEditingDonation(null);
      setPreviewDonation(null);
      await fetchDonations();
    } catch (err) {
      console.error("Failed to update donation list:", err);
      setError("Could not update donation list.");
    }
  };

  const renderCourierUI = () => (
    <>
      <div className="flex justify-end">
        <button
          onClick={() => exportToExcel(addresses)}
          className="excel-button py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
          style={{
              marginLeft: '10px',
              backgroundColor: '#107c41', /* Excel Green */
              color: 'white',
              padding: '8px 15px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
          }}>
          Export to Excel
        </button>
        <button
          onClick={handleDownloadAddressesPDF}
          className="py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed ml-3"
          disabled={downloading || addresses.length === 0}
        >
          {downloading ? "Generating PDF..." : "Download as PDF"}
        </button>
      </div>
      <div className="flex flex-wrap gap-5 my-5">
        {/* Year Filter */}
        <div className="flex flex-col">
          <label
            htmlFor="year"
            className="text-xs font-semibold text-gray-600 mb-1"
          >
            Year
          </label>
          <select
            id="year"
            value={courierYear}
            onChange={(e) => setCourierYear(e.target.value)}
            className="p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {/* Location Filter */}
        <div className="flex flex-col">
          <label
            htmlFor="location"
            className="text-xs font-semibold text-gray-600 mb-1"
          >
            Location
          </label>
          <select
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            {/* --- Turning-off location filter ---
            <option value="in_india">In India</option>
            <option value="outside_india">Outside India</option>*/}
          </select>
        </div>
        {/* --- NEW Donor Type Filter --- */}
        <div className="flex flex-col">
          <label
            htmlFor="donorType"
            className="text-xs font-semibold text-gray-600 mb-1"
          >
            Donor Type
          </label>
          <select
            id="donorType"
            value={donorType}
            onChange={(e) => setDonorType(e.target.value)}
            className="p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Donors</option>
            <option value="registered">Registered</option>
            <option value="guest">Guest</option>
          </select>
        </div>
      </div>
      <div className="mt-5">
        {loading ? (
          <p className="text-center p-10">Loading Addresses...</p>
        ) : (
          <>
            <div className="border rounded-lg p-4 bg-gray-50 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">Displaying {addresses.length} addresses. The layout here is a simplified UI view. The PDF generated will use the full, styled Address Labels.</p>
              <PrintableAddresses ref={printRef} addresses={addresses} />
            </div>
            <div className="mt-5 pt-4 border-t text-right font-bold text-gray-800">
              Total Addresses Found: {addressCount}
            </div>
          </>
        )}
      </div>
    </>
  );

  const renderReceiptUI = () => (
    <>
      {/* Filter Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
        {/* Year Filter */}
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="receiptYear"
            className="text-sm font-semibold text-gray-700"
          >
            Year
          </label>
          <select
            id="receiptYear"
            value={receiptYear}
            onChange={(e) => setReceiptYear(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="all">All Years</option>
            {[
              ...new Set(
                allDonations.map((d) => new Date(d.createdAt).getFullYear())
              ),
            ]
              .sort((a, b) => b - a)
              .map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
          </select>
        </div>

        {/* Payment Mode Filter */}
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="paymentMode"
            className="text-sm font-semibold text-gray-700"
          >
            Mode of Payment
          </label>
          <select
            id="paymentMode"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="cash">Offline (Cash)</option>
            <option value="qr code">QR</option>
          </select>
        </div>

        {/* User Type Filter */}
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="userType"
            className="text-sm font-semibold text-gray-700"
          >
            Type of User
          </label>
          <select
            id="userType"
            value={userType}
            onChange={(e) => setUserType(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="all">All</option>
            <option value="registered">Registered</option>
            <option value="guest">Guest</option>
            <option value="child">Child</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="flex flex-col space-y-2">
          <label
            htmlFor="searchTerm"
            className="text-sm font-semibold text-gray-700"
          >
            Search by Name
          </label>
          <input
            type="text"
            id="searchTerm"
            placeholder="Enter donor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-400"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="mt-6">
        {loadingDonations ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-lg border">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading Donations...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="max-h-[65vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-300 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Receipt ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Donor Name
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDonations.length > 0 ? (
                      filteredDonations.map((donation, index) => (
                        <tr
                          key={donation._id}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } hover:bg-blue-50 transition-colors duration-150`}
                        >
                          {/* Receipt ID */}
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900 font-mono">
                              {donation.receiptId}
                            </span>
                          </td>

                          {/* Donor Name */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">
                                {donation.donorName}
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                {donation.relationName}
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-6 py-4 text-right">
                            <span className="font-semibold text-green-600">
                              ₹{donation.amount.toLocaleString("en-IN")}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-6 py-4 text-center">
                            <span className="text-gray-700 font-medium">
                              {new Date(donation.createdAt).toLocaleDateString(
                                "en-IN"
                              )}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setPreviewDonation(donation)}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors duration-150 focus:ring-2 focus:ring-blue-300 focus:outline-none"
                            >
                              <svg
                                className="w-3 h-3 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              Preview
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <svg
                              className="w-12 h-12 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <p className="text-gray-500 text-base">
                              No donations found for the selected filters.
                            </p>
                            <p className="text-gray-400 text-sm">
                              Try adjusting your filter criteria
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Section */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-blue-800">
                    Total Donations Found:
                  </span>
                </div>
                <span className="text-lg font-bold text-blue-900 mt-2 sm:mt-0">
                  {filteredDonations.length}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <div className="p-5 bg-slate-100 rounded-lg shadow-lg font-sans">
      <div className="flex justify-between items-center border-b-2 border-gray-200 pb-4 mb-5">
        <h2 className="text-2xl font-bold text-gray-800 m-0">
          🖨️ Printing Portal
        </h2>
        <div className="flex flex-col items-start">
          <label
            htmlFor="printType"
            className="text-xs font-semibold text-gray-600 mb-1"
          >
            Print What
          </label>
          <select
            id="printType"
            value={printType}
            onChange={(e) => setPrintType(e.target.value)}
            className="p-2 border border-gray-300 rounded bg-white text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="courier_addresses">Courier Addresses</option>
            <option value="receipt">Receipt</option>
          </select>
        </div>
      </div>
      {error && (
        <p className="text-center p-4 text-red-700 bg-red-100 border border-red-300 rounded-md">
          {error}
        </p>
      )}
      {printType === "courier_addresses"
        ? renderCourierUI()
        : renderReceiptUI()}
      {/* Hidden component for generating address PDF
      <div className="absolute -left-full top-0">
        <PrintableAddresses ref={printRef} addresses={addresses} />
      </div>*/}
      {/* Modals for previewing and editing receipts */}
      {previewDonation && (
        <ReceiptPreviewModal
          donation={previewDonation}
          onClose={() => setPreviewDonation(null)}
          adminName={adminName}
          minPrasadWeight={minPrasadWeight}
          onEdit={(donationToEdit) => {
            setPreviewDonation(null);
            setEditingDonation(donationToEdit);
          }}
        />
      )}
      {editingDonation && (
        <DonationEditModal
          donation={editingDonation}
          onClose={() => setEditingDonation(null)}
          onUpdateSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
};

export default PrintingPortal;
