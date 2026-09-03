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
  Scissors,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { AdminContext } from "../context/AdminContext";
import html2pdf from "html2pdf.js";
import { toast } from "react-toastify";
import { printElements } from "../utils/printElements";

// Helper function to convert number to Indian currency words (no changes here)
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
  const numToWords = (n) => {
    let word = "";
    if (n === 0) return word;
    if (n < 20) {
      word = ones[n];
    } else {
      word =
        tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    }
    return word;
  };
  const number = Math.round(num);
  if (number === 0) return "Zero Rupees Only";
  if (number > 999999999) return "Number is too large";
  let result = "";
  const crore = Math.floor(number / 10000000);
  const lakh = Math.floor((number % 10000000) / 100000);
  const thousand = Math.floor((number % 100000) / 1000);
  const hundred = Math.floor((number % 1000) / 100);
  const rest = number % 100;
  if (crore) result += numToWords(crore) + " Crore ";
  if (lakh) result += numToWords(lakh) + " Lakh ";
  if (thousand) result += numToWords(thousand) + " Thousand ";
  if (hundred) result += numToWords(hundred) + " Hundred ";
  if (rest) result += numToWords(rest);
  return result.trim().replace(/\s+/g, " ") + " Rupees Only";
};

// =================================================================
// MODAL COMPONENT (*** UPDATED ***)
// =================================================================
const ReceiptModal = ({
  data,
  isGroup,
  onClose,
  courierCharge,
  adminName,
  totals,
  minDonationWeight, // UPDATED: Accept minDonationWeight prop
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const receiptRef = useRef(null);

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

  const currentTotals = isGroup
    ? totals.find((t) => t.receiptId === donationData.receiptId) || {
        totalWeight: 0,
        totalPackets: 0,
      }
    : totals;

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

  const handlePrintCurrent = () => {
    if (receiptRef.current) {
      printElements({
        elements: receiptRef.current,
        title: `Print Receipt - ${donationData.receiptId}`,
        printStyles: `
          body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: white; }
          @media print {
            body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
            .bill-container { box-shadow: none !important; border: none !important; }
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
          .bill-container { box-shadow: none !important; border: none !important; margin-top: 20px; }
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
          const receiptTotals = totals.find(
            (t) => t.receiptId === receipt.donationData.receiptId
          ) || { totalWeight: 0, totalPackets: 0 };
          return (
            <div
              id={`receipt-preview-${index}`}
              key={receipt.donationData.receiptId}
            >
              <ReceiptTemplate
                donationData={receipt.donationData}
                guestData={receipt.guestData}
                courierCharge={courierCharge}
                adminName={adminName}
                totalWeight={receiptTotals.totalWeight}
                totalPackets={receiptTotals.totalPackets}
                totalAmount={donationData.amount}
                minDonationWeight={minDonationWeight} // UPDATED: Pass prop
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
                {isGroup ? "Download This" : "Download PDF"}
              </button>
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
                courierCharge={courierCharge}
                adminName={adminName}
                totalWeight={currentTotals.totalWeight}
                totalPackets={currentTotals.totalPackets}
                minDonationWeight={minDonationWeight} // UPDATED: Pass prop
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// =================================================================
// RECEIPT TEMPLATE COMPONENT (*** UPDATED ***)
// =================================================================
const ReceiptTemplate = ({
  donationData,
  guestData,
  courierCharge = 0,
  adminName,
  totalWeight,
  totalPackets,
  minDonationWeight = 0, // UPDATED: Accept minDonationWeight prop
}) => {
  const finalTotalAmount = donationData.amount + courierCharge;

  // UPDATED: Calculate weight difference and final displayed weight for the slip
  const weightDifference =
    minDonationWeight > totalWeight ? minDonationWeight - totalWeight : 0;
  const finalSlipWeight = totalWeight + weightDifference;

  const headerCellStyle = {
    padding: "8px",
    textAlign: "left",
    borderBottom: "1px solid #eee",
    backgroundColor: "#f2f2f2",
    fontWeight: 600,
    fontSize: "12px",
  };
  const bodyCellStyle = {
    padding: "8px",
    textAlign: "left",
    borderBottom: "1px solid #eee",
    fontSize: "12px",
  };
  const bodyCellRightAlign = { ...bodyCellStyle, textAlign: "right" };

  return (
    <>
      <style>
        {`@media print { body { -webkit-print-color-adjust: exact; } .bill-container { box-shadow: none !important; border: none !important;} }`}
      </style>
      <div
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          width: "60%",
          height: "60%",
          transform: "translate(-50%, -50%)",
          backgroundImage:
            "url(https://res.cloudinary.com/needlesscat/image/upload/v1754307740/logo_unr2rc.jpg)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundSize: "contain",
          opacity: 0.08,
          zIndex: 10,
          pointerEvents: "none",
        }}
      ></div>
      <div
        className="bill-container"
        style={{
          maxWidth: "800px",
          margin: "auto",
          border: "1px solid #ccc",
          padding: "10px 20px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          color: "#333",
          position: "relative",
          backgroundColor: "white", // Important for print
        }}
      >
        <div
          className="header"
          style={{
            textAlign: "center",
            borderBottom: "2px solid #d32f2f",
            paddingBottom: "10px",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              <b>Estd. 1939</b>
            </span>
            <span>
              <b>Reg. No. 2020/272</b>
            </span>
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: "bold",
              color: "#d32f2f",
              marginBottom: "1px",
            }}
          >
            SHREE DURGAJI PATWAY JATI SUDHAR SAMITI
          </div>
          <div style={{ marginBottom: "1px", fontSize: "14px" }}>
            Shree Durga Sthan, Patwatoli, Manpur, P.O. Buniyadganj, Gaya Ji -
            823003
          </div>
          <div style={{ fontSize: "12px", color: "#444" }}>
            <strong>PAN:</strong> ABBTS1301C | <strong>Contact:</strong> 0631
            2952160, +91 9472030916 | <strong>Email:</strong>{" "}
            sdpjssmanpur@gmail.com
          </div>
        </div>
        <div
          style={{
            fontSize: "16px",
            fontWeight: 600,
            textAlign: "center",
            margin: "5px 0",
            letterSpacing: "1px",
          }}
        >
          DONATION RECEIPT
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            fontSize: "12px",
          }}
        >
          <div>
            <strong>Receipt No:</strong> {donationData.receiptId}
          </div>
          <div>
            <strong>Date:</strong>{" "}
            {new Date(donationData.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <div
          style={{
            backgroundColor: "#f9f9f9",
            padding: "8px",
            border: "1px dashed #ddd",
            borderRadius: "8px",
            marginBottom: "8px",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#d32f2f",
              borderBottom: "1px solid #eee",
              paddingBottom: "3px",
              fontSize: "14px",
              marginBottom: "6px",
            }}
          >
            Donor Details
          </h3>
          <div style={{ display: "flex", gap: "20px" }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "12px", margin: "2px 0" }}>
                <strong>Name:</strong> {guestData.fullname} S/O{" "}
                {guestData.father}
              </p>
              <p style={{ fontSize: "12px", margin: "2px 0" }}>
                <strong>Mobile:</strong> {guestData.contact.mobileno.code}{" "}
                {guestData.contact.mobileno.number}
              </p>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "12px", margin: "2px 0" }}>
                <strong>Address:</strong> {guestData.address.street},{" "}
                {guestData.address.city}, {guestData.address.state} -{" "}
                {guestData.address.pin}
              </p>
            </div>
          </div>
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "8px",
          }}
        >
          <thead>
            <tr>
              {["Item", "Quantity", "Amount (₹)", "Weight (g)", "Packet"].map(
                (header) => (
                  <th
                    key={header}
                    style={{
                      ...headerCellStyle,
                      textAlign: [
                        "Quantity",
                        "Amount (₹)",
                        "Weight (g)",
                        "Packet",
                      ].includes(header)
                        ? "right"
                        : "left",
                    }}
                  >
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {donationData.list.map((item, index) => (
              <tr key={index}>
                <td style={bodyCellStyle}>{item.category}</td>
                <td style={bodyCellRightAlign}>
                  {item.number.toLocaleString("en-IN")}
                </td>
                <td style={bodyCellRightAlign}>
                  ₹{item.amount.toLocaleString("en-IN")}
                </td>
                <td style={bodyCellRightAlign}>
                  {item.quantity.toLocaleString("en-IN")}
                </td>
                <td style={bodyCellRightAlign}>
                  {item.isPacket ? "Yes" : "No"}
                </td>
              </tr>
            ))}
            {
              <tr>
                <td
                  colSpan={2}
                  style={{
                    ...bodyCellStyle,
                    borderTop: "2px solid #ddd",
                    fontWeight: "bold",
                  }}
                >
                  Courier Charges
                </td>
                <td
                  style={{
                    ...bodyCellRightAlign,
                    borderTop: "2px solid #ddd",
                    fontWeight: "bold",
                  }}
                >
                  ₹{courierCharge.toLocaleString("en-IN")}
                </td>
                <td
                  colSpan={2}
                  style={{ ...bodyCellStyle, borderTop: "2px solid #ddd" }}
                ></td>
              </tr>
            }
            <tr
              style={{
                fontWeight: "bold",
                fontSize: "12px",
                backgroundColor: "#f2f2f2",
              }}
            >
              <td
                colSpan={2}
                style={{
                  padding: "10px 8px",
                  textAlign: "left",
                  borderTop: "2px solid #ddd",
                }}
              >
                TOTAL AMOUNT
              </td>
              <td
                style={{
                  ...bodyCellRightAlign,
                  padding: "10px 8px",
                  borderTop: "2px solid #ddd",
                }}
              >
                ₹{finalTotalAmount.toLocaleString("en-IN")}
              </td>
              <td
                colSpan={2}
                style={{ padding: "10px 8px", borderTop: "2px solid #ddd" }}
              ></td>
            </tr>
          </tbody>
        </table>

        {/* --- UPDATED: Conditionally show weight adjustment note --- */}
        {weightDifference > 0 && (
          <div
            style={{
              padding: "6px",
              backgroundColor: "#fffbe6",
              border: "1px solid #ffe58f",
              marginTop: "8px",
              fontSize: "11px",
              color: "#8a6d3b",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            <b>
              **Additional +{Math.round(weightDifference)}g is added to meet the
              minimum halwa as prasad to the donor.**
            </b>
          </div>
        )}
        {/* --- END UPDATE --- */}

        <div
          style={{
            padding: "6px",
            backgroundColor: "#f9f9f9",
            borderLeft: "4px solid #d32f2f",
            marginTop: "8px",
            fontWeight: "bold",
            fontSize: "12px",
          }}
        >
          Amount in Words: {toWords(finalTotalAmount)}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "#f9f9f9",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            marginTop: "8px",
            fontSize: "12px",
          }}
        >
          <div>
            <p style={{ margin: "0 0 3px 0" }}>
              <strong>Payment Method:</strong> {donationData.method}
            </p>
            <p style={{ margin: "0" }}>
              <strong>Transaction ID:</strong>{" "}
              {donationData.transactionId || "N/A"}
            </p>
          </div>
          <div
            style={{
              backgroundColor: "#077e13ff",
              color: "white",
              padding: "6px 12px",
              borderRadius: "4px",
              fontWeight: "bold",
              border: "1px solid #044202ff",
              fontSize: "14px",
            }}
          >
            PAID
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "15px",
            paddingTop: "6px",
            borderTop: "1px solid #ccc",
            fontSize: "10px",
            color: "#777",
          }}
        >
          <p>
            Thank you for your generous contribution. This is a
            computer-generated receipt.
          </p>
          <p style={{ marginTop: "2px", fontStyle: "italic" }}>
            Generated by: <strong>{adminName}</strong> on{" "}
            {new Date().toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* --- TEAR-OFF SLIP START --- */}
      <div
        style={{
          marginTop: "8px",
          position: "relative",
          borderTop: "2px dashed #333",
        }}
      >
        <Scissors
          size={18}
          style={{
            position: "absolute",
            top: "-12px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "white",
            padding: "0 5px",
          }}
        />

        {/* Watermark background */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "40%",
            height: "60%",
            transform: "translate(-50%, -40%)",
            backgroundImage:
              "url(https://res.cloudinary.com/needlesscat/image/upload/v1754307740/logo_unr2rc.jpg)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center center",
            backgroundSize: "contain",
            opacity: 0.06,
            zIndex: 10,
            pointerEvents: "none",
          }}
        ></div>

        {/* Main slip container */}
        <div
          style={{
            maxWidth: "800px",
            margin: "auto",
            marginTop: "8px",
            border: "2px solid #d32f2f",
            borderRadius: "8px",
            padding: "10px 20px",
            backgroundColor: "#fefefe",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            color: "#333",
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "10px",
              borderBottom: "1px solid #e0e0e0",
              paddingBottom: "6px",
            }}
          >
            <h4
              style={{
                margin: "0",
                fontSize: "14px",
                fontWeight: "700",
                color: "#d32f2f",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Donation Summary Slip
            </h4>
            <div
              style={{
                fontSize: "12px",
                color: "#666",
                marginTop: "2px",
                fontStyle: "italic",
              }}
            >
              Keep this slip for your records
            </div>
          </div>

          {/* Main content area */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              alignItems: "flex-start",
            }}
          >
            {/* Left side - Donor Information */}
            <div
              style={{
                flex: "1",
                backgroundColor: "#f8f9ff",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #e8e8ff",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#4a4a9a",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Donor Details
              </div>
              <table
                style={{
                  width: "100%",
                  fontSize: "12px",
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: "2px 0",
                        fontWeight: "600",
                        color: "#555",
                        width: "70px",
                        verticalAlign: "top",
                      }}
                    >
                      Receipt No:
                    </td>
                    <td
                      style={{
                        padding: "2px 0 0 8px",
                        fontWeight: "700",
                        color: "#d32f2f",
                      }}
                    >
                      {donationData.receiptId}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "2px 0",
                        fontWeight: "600",
                        color: "#555",
                        verticalAlign: "top",
                      }}
                    >
                      Name:
                    </td>
                    <td style={{ padding: "2px 0 0 8px", color: "#333" }}>
                      {guestData.fullname} {guestData.gender === "female" ? "D/O" : "S/O"} {guestData.father}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "2px 0",
                        fontWeight: "600",
                        color: "#555",
                        verticalAlign: "top",
                      }}
                    >
                      Location:
                    </td>
                    <td style={{ padding: "2px 0 0 8px", color: "#333" }}>
                      {guestData.address.city}, {guestData.address.state}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        padding: "2px 0",
                        fontWeight: "600",
                        color: "#555",
                        verticalAlign: "top",
                      }}
                    >
                      Mobile:
                    </td>
                    <td style={{ padding: "2px 0 0 8px", color: "#333" }}>
                      {guestData.contact.mobileno.number}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right side - Summary Totals */}
            <div
              style={{
                flex: "0 0 180px",
                backgroundColor: "#f0f8f0",
                padding: "5px",
                borderRadius: "6px",
                border: "2px solid #d4edda",
              }}
            >
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#155724",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  textAlign: "center",
                }}
              >
                Summary Totals
              </div>

              <div style={{ marginBottom: "4px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0px 8px 4px 8px",
                    backgroundColor: "white",
                    borderRadius: "4px",
                    marginBottom: "2px",
                    border: "1px solid #e8f5e8",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#555",
                    }}
                  >
                    Weights(g):
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#155724",
                      backgroundColor: "#d4edda",
                      marginTop: "4px",
                      padding: "0px 8px 4px 8px",
                      borderRadius: "3px",
                    }}
                  >
                    {/* --- UPDATED: Use final adjusted weight --- */}
                    {finalSlipWeight?.toLocaleString("en-IN")}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0px 8px 4px 8px",
                    backgroundColor: "white",
                    borderRadius: "4px",
                    marginBottom: "2px",
                    border: "1px solid #e8f5e8",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#555",
                    }}
                  >
                    Packets:
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#155724",
                      backgroundColor: "#d4edda",
                      marginTop: "4px",
                      padding: "0px 8px 4px 8px",
                      borderRadius: "3px",
                    }}
                  >
                    {totalPackets?.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Total Amount - Highlighted */}
              <div
                style={{
                  backgroundColor: "#d32f2f",
                  color: "white",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  textAlign: "center",
                  border: "2px solid #b71c1c",
                  boxShadow: "0 2px 4px rgba(211,47,47,0.3)",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginBottom: "2px",
                    opacity: 0.9,
                  }}
                >
                  TOTAL AMOUNT:{" "}
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      letterSpacing: "0.5px",
                    }}
                  >
                    ₹{finalTotalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: "8px",
              paddingTop: "6px",
              borderTop: "1px solid #e0e0e0",
              textAlign: "center",
              fontSize: "8px",
              color: "#888",
              fontStyle: "italic",
            }}
          >
            Generated by {adminName} on {new Date().toLocaleDateString("en-IN")}{" "}
            • Thank you for your donation
          </div>
        </div>
      </div>
      {/* --- TEAR-OFF SLIP END --- */}
    </>
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
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [minDonationWeight, setMinDonationWeight] = useState(0); // UPDATED: State for min weight

  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categorySearchRef = useRef(null);
  const donorSearchRef = useRef(null);

  const courierCharge = 0;

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
    const donatedCategoryNames = donations.map((d) => d.category);
    const filtered = allCategories.filter(
      (cat) =>
        !donatedCategoryNames.includes(cat.categoryName) &&
        cat.categoryName
          .toLowerCase()
          .includes(categorySearchQuery.toLowerCase())
    );
    return filtered;
  }, [allCategories, donations, categorySearchQuery]);

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

  // UPDATED: Calculate final displayed weight and difference for UI feedback
  const weightDifference =
    minDonationWeight > totalWeight && donations.length > 0
      ? minDonationWeight - totalWeight
      : 0;
  const finalDisplayedWeight = totalWeight + weightDifference;

  const calculatedAmountForStandard =
    selectedCategoryDetails && !selectedCategoryDetails.dynamic?.isDynamic
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
    if (category?.dynamic?.isDynamic) {
      setDynamicAmount(category.rate.toString());
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
    const isDynamic = selectedCategoryDetails.dynamic?.isDynamic;
    let newDonation;
    if (isDynamic) {
      const amount = Number(dynamicAmount) || 0;
      if (amount <= 0) {
        toast.warn("Please enter a valid amount for the dynamic donation.");
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
      newDonation = {
        id: Date.now(),
        category: selectedCategoryDetails.categoryName,
        number: 1,
        amount: amount,
        isPacket: false,
        quantity: weight,
      };
    } else {
      if (!quantity || parseInt(quantity, 10) < 1) {
        toast.warn("Please enter a valid quantity.");
        return;
      }
      const calculatedAmount =
        selectedCategoryDetails.rate * parseInt(quantity, 10);
      newDonation = {
        id: Date.now(),
        category: selectedCategoryDetails.categoryName,
        number: parseInt(quantity, 10),
        amount: calculatedAmount,
        isPacket: selectedCategoryDetails.packet,
        quantity: selectedCategoryDetails.weight * parseInt(quantity, 10),
      };
    }
    setDonations([...donations, newDonation]);
    setSelectedCategoryId("");
    setSelectedCategoryDetails(null);
    setQuantity(1);
    setDynamicAmount("");
    setCategorySearchQuery("");
  };

  const removeDonation = (id) => {
    setDonations(donations.filter((d) => d.id !== id));
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
    setPaymentMethod("Cash");
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
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const payload = {
      list: donations.map(({ id: _id, ...rest }) => rest),
      method: paymentMethod,
      remarks,
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
        setReceiptTotals({ totalWeight, totalPackets }); // Pass original totals
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
      totalAmount: totalAmount,
      totalWeight: totalWeight,
      totalPackets: totalPackets,
      payload: {
        list: donations.map(({ id: _id, ...rest }) => rest),
        remarks,
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
    setTotalGroupAmount((prev) => prev + totalAmount);
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
          successfulReceiptTotals.push({
            receiptId: response.data.data.donationData.receiptId,
            totalWeight: receipt.totalWeight,
            totalPackets: receipt.totalPackets,
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
          courierCharge={courierCharge}
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
                <input
                  type="text"
                  placeholder="Search categories..."
                  className="w-full px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={categorySearchQuery}
                  onFocus={() => setIsCategoryDropdownOpen(true)}
                  onChange={(e) => {
                    setCategorySearchQuery(e.target.value);
                    setIsCategoryDropdownOpen(true);
                  }}
                />
                {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                    {availableCategories.length > 0 ? (
                      availableCategories.map((category, index) => (
                        <div
                          key={category._id}
                          className={`p-3 cursor-pointer border-b last:border-b-0 ${
                            index === highlightedIndex
                              ? "bg-indigo-100"
                              : "hover:bg-indigo-50"
                          }`}
                          onClick={() => handleSelectCategory(category)}
                        >
                          <p className="font-medium text-gray-800">
                            {category.categoryName}
                          </p>
                          <p className="text-xs text-gray-500">
                            ₹{category.rate} | {category.weight}g |{" "}
                            {category.packet ? "Packet" : "Loose"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-gray-500 text-sm">
                        No categories found.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCategoryDetails?.dynamic?.isDynamic ? (
                // DYNAMIC CATEGORY VIEW
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter custom amount"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={dynamicAmount}
                    onChange={(e) => setDynamicAmount(e.target.value)}
                    disabled={!selectedCategoryDetails}
                  />
                </div>
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
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-300 flex items-center justify-center gap-2 h-10"
              >
                <Plus size={18} /> Add
              </button>
            </div>

            {selectedCategoryDetails && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 rounded-lg">
                <div className="pl-1 pb-1">
                  <b>Details: </b>
                </div>
                <hr />
                <div className="flex justify-between p-1">
                  <p>Category: {selectedCategoryDetails.categoryName} </p>
                  <p>Rate: ₹{selectedCategoryDetails.rate} </p>
                  <p>Weight: {selectedCategoryDetails.weight}g </p>
                  <p>Packet: {selectedCategoryDetails.packet ? "Yes" : "No"}</p>
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
                        Weight (g)
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700">
                        Packet
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700">
                        Action
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
                        <td className="p-3 text-slate-700">{d.quantity}</td>
                        <td className="p-3 text-slate-700">
                          {d.isPacket ? "Yes" : "No"}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => removeDonation(d.id)}
                            className="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-full transition-colors"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-800 mb-2">
                    Mahaprasad Summary
                  </h4>
                  <p className="text-sm flex justify-between pr-1">
                    Total Weight (g):{" "}
                    <span className="font-bold">
                      {/* --- UPDATED: Show final adjusted weight --- */}
                      {finalDisplayedWeight.toLocaleString("en-IN")}
                    </span>
                  </p>
                  {/* --- UPDATED: Conditionally show note --- */}
                  {weightDifference > 0 && (
                    <p className="text-xs text-purple-600 mt-1 text-right">
                      (Includes {Math.round(weightDifference)}g adjustment)
                    </p>
                  )}
                  <p className="text-sm flex justify-between pr-1">
                    Total Packets:{" "}
                    <span className="font-bold">
                      {totalPackets.toLocaleString("en-IN")}
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
