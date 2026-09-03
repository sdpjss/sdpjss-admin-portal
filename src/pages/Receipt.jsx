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
  Scissors,
} from "lucide-react";
import axios from "axios";
import { AdminContext } from "../context/AdminContext";
import { toast } from "react-toastify";
import html2pdf from "html2pdf.js";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import ReCAPTCHA from "react-google-recaptcha";
import { printElements } from "../utils/printElements";

// Helper function to convert number to Indian currency words
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

const ReceiptTemplate = ({
  donationData,
  userData,
  adminName,
  totalWeight,
  totalPackets,
  courierCharge = 0,
  minPrasadWeight = 0,
}) => {
  if (!donationData || !userData) return null;

  const finalTotalAmount = donationData.amount + courierCharge;

  // New Logic: Calculate the final weight to display and the difference
  const displayWeight = Math.max(totalWeight, minPrasadWeight);
  const difference = displayWeight - totalWeight;

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
    <div className="m-2">
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
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: "1", paddingRight: "10px" }}>
              <p style={{ fontSize: "12px", margin: "3px 0" }}>
                <strong>Name:</strong> {userData.fullname} S/O{" "}
                {userData.fatherName}
              </p>
              <p style={{ fontSize: "12px", margin: "3px 0" }}>
                <strong>Mobile:</strong> {userData.contact.mobileno?.code}{" "}
                {userData.contact.mobileno?.number}
              </p>
            </div>
            <div style={{ flex: "1", paddingLeft: "10px" }}>
              <p style={{ fontSize: "12px", margin: "3px 0" }}>
                <strong>Address:</strong>{" "}
                {`${userData.address.street}, ${userData.address.city}, ${userData.address.state} - ${userData.address.pin}`}
              </p>
            </div>
          </div>
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "10px",
          }}
        >
          <thead>
            <tr>
              <th style={headerCellStyle}>Item</th>
              <th style={{ ...headerCellStyle, textAlign: "right" }}>
                Quantity
              </th>
              <th style={{ ...headerCellStyle, textAlign: "right" }}>
                Amount (₹)
              </th>
              <th style={{ ...headerCellStyle, textAlign: "right" }}>
                Weight (g)
              </th>
              <th style={{ ...headerCellStyle, textAlign: "right" }}>Packet</th>
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
            {courierCharge > 0 && (
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
            )}
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

        {difference > 0 && (
          <div
            style={{
              padding: "6px",
              backgroundColor: "#fffbe6",
              borderLeft: "4px solid #facc15",
              marginTop: "8px",
              fontWeight: "bold",
              fontSize: "11px",
              color: "#b45309",
              textAlign: "center",
            }}
          >
            **Additional +{Math.round(difference)}g is added to meet the minimum
            halwa as prasad to the donor.**
          </div>
        )}

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
            paddingTop: "8px",
            borderTop: "1px solid #ccc",
            fontSize: "10px",
            color: "#777",
            fontStyle: "italic",
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

      {courierCharge === 0 && (
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
          <div
            style={{
              maxWidth: "800px",
              margin: "auto",
              marginTop: "8px",
              border: "2px solid #d32f2f",
              borderRadius: "8px",
              padding: "10px 20px",
              backgroundColor: "#fefefe",
              boxShadow: "0 0 8px rgba(0,0,0,0.1)",
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
              color: "#333",
              position: "relative",
              zIndex: 2,
            }}
          >
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
                PRASAD TOKEN
              </h4>
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginTop: "2px",
                  fontStyle: "italic",
                }}
              >
                Bring this for prasad collection
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: "20px",
                alignItems: "flex-start",
              }}
            >
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
                          width: "70px",
                          verticalAlign: "top",
                        }}
                      >
                        Name:
                      </td>
                      <td style={{ padding: "2px 0 0 8px", color: "#333" }}>
                        {userData.fullname}
                      </td>
                    </tr>
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
                        Location:
                      </td>
                      <td style={{ padding: "2px 0 0 8px", color: "#333" }}>
                        {userData.address.city}, {userData.address.state}
                      </td>
                    </tr>
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
                        Mobile:
                      </td>
                      <td style={{ padding: "2px 0 0 8px", color: "#333" }}>
                        {userData.contact.mobileno.number}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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
                <div style={{ marginBottom: "3px" }}>
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
                      {displayWeight?.toLocaleString("en-IN")}
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
              Generated by {adminName} on{" "}
              {new Date().toLocaleDateString("en-IN")} • Thank you for your
              donation
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ReceiptModal = ({ data, isGroup, onClose, adminName, totals }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const receiptRef = useRef(null);

  const currentReceiptData = isGroup ? data[currentIndex] : data;
  if (!currentReceiptData) return null;

  // Simplified totals logic
  const currentTotals = isGroup ? currentReceiptData : totals;

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
            totalWeight={receipt.totalWeight}
            totalPackets={receipt.totalPackets}
            minPrasadWeight={receipt.minPrasadWeight}
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
                    totalWeight={receipt.totalWeight}
                    totalPackets={receipt.totalPackets}
                    minPrasadWeight={receipt.minPrasadWeight}
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
                  <Download size={16} /> Download
                </button>
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
                  <Download size={14} /> Download This
                </button>
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
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [willCome, setWillCome] = useState("YES");
  const [courierAddress, setCourierAddress] = useState("");
  const [donations, setDonations] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const categoryDropdownRef = useRef(null);
  const categoryInputRef = useRef(null);
  const [quantity, setQuantity] = useState(1);
  const [dynamicAmount, setDynamicAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [khandans, setKhandans] = useState([]);
  const [courierCharges, setCourierCharges] = useState([]);
  const [userPreviousDonations, setUserPreviousDonations] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [minPrasadWeight, setMinPrasadWeight] = useState(0);

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
  const paymentMethods = ["Cash", "Online"];
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

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

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
    if (willCome === "NO" && selectedUser) {
      setCourierAddress(formatAddress(selectedUser.address));
    } else {
      setCourierAddress("");
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
    const selectedCategoryIds = donations.map((d) => d.categoryId);
    return categories
      .filter((cat) => !selectedCategoryIds.includes(cat._id) && cat.isActive)
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

    const isDynamic = category.dynamic?.isDynamic;
    let newDonation;

    if (isDynamic) {
      const amount = Number(dynamicAmount) || 0;
      if (amount <= 0) {
        toast.warn("Please enter a valid amount for the dynamic donation.");
        return;
      }
      let weight = 0;
      if (amount < category.rate) {
        weight = category.dynamic.minvalue;
      } else {
        weight = Math.floor(amount / category.rate) * category.weight;
      }
      newDonation = {
        id: Date.now(),
        categoryId: category._id,
        category: category.categoryName,
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
      const amount = category.rate * parseInt(quantity, 10);
      const weight = category.weight * parseInt(quantity, 10);
      newDonation = {
        id: Date.now(),
        categoryId: category._id,
        category: category.categoryName,
        number: parseInt(quantity, 10),
        amount: amount,
        isPacket: category.packet,
        quantity: weight,
      };
    }

    setDonations([...donations, newDonation]);
    setSelectedCategory("");
    setCategorySearch("");
    setQuantity(1);
    setDynamicAmount("");
    setSelectedCategoryDetails(null);
    setShowCategoryDropdown(false);
  };

  const removeDonation = (id) => {
    setDonations(donations.filter((donation) => donation.id !== id));
  };

  const isLocalUser =
    selectedUser &&
    ["in_manpur", "in_gaya_outside_manpur"].includes(
      selectedUser.address.currlocation
    );

  useEffect(() => {
    if (isLocalUser) {
      setWillCome("YES");
    }
  }, [isLocalUser, selectedUser]);

  useEffect(() => {
    if (selectedCategory) {
      const details = categories.find((c) => c._id === selectedCategory);
      setSelectedCategoryDetails(details);
      setCategorySearch(details?.categoryName || "");
      if (details?.dynamic?.isDynamic) {
        setDynamicAmount(details.rate.toString());
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
  }, [selectedCategory, categories]);

  const totalAmount = donations.reduce(
    (sum, donation) => sum + donation.amount,
    0
  );
  const totalWeight = donations.reduce(
    (sum, donation) => sum + donation.quantity,
    0
  );
  const totalPackets = donations.reduce(
    (count, donation) => count + (donation.isPacket ? donation.number : 0),
    0
  );

  const finalTotalWeight = Math.max(totalWeight, minPrasadWeight);

  const getCourierChargeForAddress = (addressString) => {
    if (!addressString || courierCharges.length === 0) return 0;

    const location = addressString.toLowerCase();

    const hasManpur = location.includes("manpur");
    const hasGaya = location.includes("gaya");
    const hasBihar = location.includes("bihar");
    const hasIndia = location.includes("india");

    if (hasManpur && hasGaya) {
      return 0; // Considered local
    } else if (hasGaya && hasBihar && hasIndia) {
      return (
        courierCharges.find((c) => c.region === "in_gaya_outside_manpur")
          ?.amount || 0
      );
    } else if (hasBihar && hasIndia) {
      return (
        courierCharges.find((c) => c.region === "in_bihar_outside_gaya")
          ?.amount || 0
      );
    } else if (hasIndia) {
      return (
        courierCharges.find((c) => c.region === "in_india_outside_bihar")
          ?.amount || 0
      );
    } else {
      return (
        courierCharges.find((c) => c.region === "outside_india")?.amount || 0
      );
    }
  };

  const courierCharge =
    willCome === "NO" && selectedUser
      ? getCourierChargeForAddress(courierAddress)
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

  const handleRazorpayPayment = async (orderData) => {
    try {
      setPaymentLoading(true);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Failed to load payment gateway. Please try again.");
        return false;
      }
      const response = await axios.post(
        backendUrl + "/api/admin/create-donation-order",
        orderData,
        { headers: { aToken, "Content-Type": "application/json" } }
      );
      if (!response.data.success) {
        toast.error(`Error: ${response.data.message}`);
        return false;
      }
      const { order, donationId } = response.data;
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Donation Portal",
        description: "Donation Payment",
        order_id: order.id,
        handler: async (response) => {
          try {
            const verifyResponse = await axios.post(
              backendUrl + "/api/admin/verify-donation-payment",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                donationId,
              },
              { headers: { aToken, "Content-Type": "application/json" } }
            );
            if (verifyResponse.data.success) {
              toast.success("Payment successful! Donation recorded.");
              setReceiptData({
                donationData: verifyResponse.data.data.donationData,
                userData: verifyResponse.data.data.userData,
              });
              setShowReceiptModal(true);
              await getDonationList();
            } else {
              toast.error(
                `Payment verification failed: ${verifyResponse.data.message}`
              );
            }
          } catch (error) {
            console.error("Error verifying payment:", error);
            toast.error("Error verifying payment");
          }
        },
        prefill: {
          name: selectedUser?.fullname || "",
          email: selectedUser?.contact?.email || "",
          contact: selectedUser?.contact?.mobileno?.number || "",
        },
        theme: { color: "#16a34a" },
        modal: { ondismiss: () => toast.info("Payment cancelled") },
      };
      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
      return true;
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Error processing payment");
      return false;
    } finally {
      setPaymentLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setUserSearch("");
    setDonations([]);
    setWillCome("YES");
    setCourierAddress("");
    if (donationType === "individual") setPaymentMethod("");
    setRemarks("");
    setSelectedCategory("");
    setCategorySearch("");
    setQuantity(1);
    setDynamicAmount("");
    setUserPreviousDonations([]);
  };

  const handleSubmit = async () => {
    if (!selectedUser) return toast.error("Please select a user");
    if (donations.length === 0)
      return toast.error("Please add at least one donation");
    if (!paymentMethod) return toast.error("Please select a payment method");
    if (willCome === "NO" && !courierAddress.trim())
      return toast.error("Please provide a courier address");

    try {
      setLoading(true);
      console.log("testing.. user : ", selectedUser);
      const orderData = {
        userId: selectedUser._id,
        donatedFor: selectedUser._id,
        donatedAs: "self",
        list: donations.map((d) => ({
          categoryId: d.categoryId,
          category: d.category,
          number: d.number,
          amount: d.amount,
          isPacket: d.packet ? 1 : 0,
          quantity: d.quantity,
        })),
        amount: netPayableAmount,
        method: paymentMethod,
        courierCharge,
        remarks,
        postalAddress:
          willCome === "NO"
            ? courierAddress
            : `${selectedUser.address.street}, ${selectedUser.address.city}, ${selectedUser.address.state} - ${selectedUser.address.pin}`,
      };

      if (paymentMethod === "Cash") {
        const response = await axios.post(
          backendUrl + "/api/admin/create-donation-order",
          orderData,
          { headers: { aToken, "Content-Type": "application/json" } }
        );
        if (response.data.success) {
          toast.success("Cash donation recorded successfully!");
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
      } else if (paymentMethod === "Online") {
        await handleRazorpayPayment(orderData);
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

    const newGroupEntry = {
      localId: Date.now(),
      user: selectedUser,
      donations: donations,
      netPayableAmount: netPayableAmount,
      orderPayload: {
        userId: selectedUser._id,
        list: donations.map((d) => ({
          categoryId: d.categoryId,
          category: d.category,
          number: d.number,
          amount: d.amount,
          isPacket: d.packet ? 1 : 0,
          quantity: d.quantity,
        })),
        amount: netPayableAmount,
        method: "Cash",
        courierCharge,
        remarks,
        postalAddress:
          willCome === "NO"
            ? courierAddress
            : `${selectedUser.address.street}, ${selectedUser.address.city}, ${selectedUser.address.state} - ${selectedUser.address.pin}`,
      },
      donationData: {
        amount: netPayableAmount,
        list: donations,
        courierCharge,
        receiptId: `TEMP-${Date.now()}`,
        createdAt: new Date().toISOString(),
        method: "Cash",
        transactionId: "N/A",
      },
      userData: selectedUser,
      totals: { totalWeight, totalPackets, minPrasadWeight },
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
      !window.confirm(`Process ${groupDonations.length} cash donations?`)
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
          receipt.orderPayload,
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
              ? { totalWeight, totalPackets, minPrasadWeight }
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
                <button
                  onClick={handlePayGroup}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:bg-green-400"
                  disabled={isPayingGroup || groupDonations.length === 0}
                >
                  {isPayingGroup ? "Processing..." : "Pay All as Cash"}
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

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Will you come to Durga Sthan, Manpur, Patwatoli to get your
                Mahaprasad?
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="willCome"
                    value="YES"
                    checked={willCome === "YES"}
                    onChange={(e) => setWillCome(e.target.value)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium">YES</span>
                </label>
                <label
                  className={`flex items-center gap-2 ${
                    isLocalUser
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="willCome"
                    value="NO"
                    checked={willCome === "NO"}
                    onChange={(e) => setWillCome(e.target.value)}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                    disabled={isLocalUser}
                  />
                  <span className="text-sm font-medium">NO</span>
                </label>
              </div>
              {isLocalUser && (
                <p className="text-xs text-gray-500 mt-2">
                  Courier option is not available for your location. Please
                  select "YES".
                </p>
              )}
            </div>
            {willCome === "NO" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Courier/Postal Address for Mahaprasad
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  rows="3"
                  placeholder="Enter complete address for courier delivery..."
                  value={courierAddress}
                  onChange={(e) => setCourierAddress(e.target.value)}
                />
              </div>
            )}
          </div>

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

              {selectedCategoryDetails?.dynamic?.isDynamic ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="Enter custom amount"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={dynamicAmount}
                    onChange={(e) => setDynamicAmount(e.target.value)}
                    disabled={!selectedCategoryDetails}
                  />
                </div>
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
                <Plus size={18} /> Add
              </button>
            </div>

            {selectedCategoryDetails && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 text-sm text-yellow-800 rounded-lg">
                <div className="flex flex-wrap justify-around items-center gap-x-6 gap-y-2">
                  <p>
                    <strong>Rate:</strong> ₹{selectedCategoryDetails.rate}
                  </p>
                  <p>
                    <strong>Weight:</strong> {selectedCategoryDetails.weight}g
                  </p>
                  <p>
                    <strong>Packet:</strong>{" "}
                    {selectedCategoryDetails.packet ? "Yes" : "No"}
                  </p>
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
                        Weight (g)
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Packet
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                        Action
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
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {donation.quantity}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {donation.isPacket ? "Yes" : "No"}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeDonation(donation.id)}
                            className="text-red-600 hover:text-red-800"
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
                      {finalTotalWeight.toFixed(1)} g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Packet:</span>
                    <span className="font-medium">{totalPackets}</span>
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
                disabled={loading || paymentLoading}
              >
                <CreditCard className="h-5 w-5" />
                {loading || paymentLoading ? "Processing..." : "Submit Receipt"}
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
