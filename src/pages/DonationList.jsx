import { useState, useEffect, useContext, useMemo } from "react";
import axios from "axios";
import { AdminContext } from "../context/AdminContext";
import {
  DollarSign,
  Filter,
  X,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronRight,
  Users,
  Tag,
  TrendingUp,
  FileText,
  Package,
  Scale,
  Calendar as CalendarIcon,
  Clock,
  RefreshCw,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

// Helper component for the export dropdown (No changes needed here)
const ExportDropdown = ({ onExport, color = "blue" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format) => {
    onExport(format);
    setIsOpen(false);
  };

  const colorClasses = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    purple: "bg-purple-600 hover:bg-purple-700",
    red: "bg-red-600 hover:bg-red-700", // NEW: Added red color for the new tab
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors ${colorClasses[color]}`}
      >
        <Download size={16} />
        <span>Export Data</span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          <button
            onClick={() => handleExport("csv")}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            CSV
          </button>
          <button
            onClick={() => handleExport("excel")}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Excel
          </button>
        </div>
      )}
    </div>
  );
};

// convert gm to kg and gm
const convertGramsToKgAndGm = (totalGrams) => {
  const kg = Math.floor(totalGrams / 1000);
  const grams = totalGrams % 1000;

  if (kg > 0) {
    if (grams > 0) {
      return `${kg} kg ${grams} gm`;
    }
    return `${kg} kg`;
  }
  return `${grams} gm`;
};

const DonationList = () => {
  const [donationType, setDonationType] = useState("registered");
  const [activeTab, setActiveTab] = useState("donations");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guestDonationList, setGuestDonationList] = useState([]);
  const [donationsFilters, setDonationsFilters] = useState({
    dateFrom: "",
    dateTo: "",
    users: [],
    categories: [],
    paymentMode: "all",
  });
  const [recentFilters, setRecentFilters] = useState({
    selectedDate: new Date().toISOString().split("T")[0],
  });
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [overallView, setOverallView] = useState("category");
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [dateRange, setDateRange] = useState({ min: "", max: "" });
  const [reconcilingId, setReconcilingId] = useState(null);

  const { backendUrl, donationList, getDonationList, aToken } =
    useContext(AdminContext);

  useEffect(() => {
    const fetchData = async () => {
      if (!aToken) {
        setError("Authentication token not found");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        await getDonationList();
        const guestResponse = await axios.get(
          backendUrl + "/api/admin/guest-donation-list",
          {
            headers: { aToken },
          }
        );
        if (guestResponse.data.success) {
          setGuestDonationList(guestResponse.data.donations);
        } else {
          throw new Error("Failed to fetch guest donations");
        }
        setError(null);
      } catch (err) {
        setError("Failed to fetch data");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [aToken]);

  const activeDonationList =
    donationType === "registered" ? donationList : guestDonationList;

  useEffect(() => {
    if (activeDonationList && activeDonationList.length > 0) {
      const users = [
        ...new Map(
          activeDonationList.map((d) => [
            d.userId?._id,
            {
              value: d.userId?._id,
              label: d.userId?.fullname || "Unknown User",
            },
          ])
        ).values(),
      ].filter((user) => user.value); // Filter out potential undefined users
      setAvailableUsers(users);

      const categories = [
        ...new Set(
          activeDonationList.flatMap((d) => d.list.map((item) => item.category))
        ),
      ];
      setAvailableCategories(categories);

      const dates = activeDonationList.map((d) => new Date(d.createdAt));
      const minDate = new Date(Math.min(...dates)).toISOString().split("T")[0];
      const maxDate = new Date(Math.max(...dates)).toISOString().split("T")[0];
      setDateRange({ min: minDate, max: maxDate });

      setDonationsFilters({
        dateFrom: minDate,
        dateTo: maxDate,
        users: [],
        categories: [],
        paymentMode: "all",
      });
    } else {
      setAvailableUsers([]);
      setAvailableCategories([]);
      setDateRange({ min: "", max: "" });
      setDonationsFilters({
        dateFrom: "",
        dateTo: "",
        users: [],
        categories: [],
        paymentMode: "all",
      });
    }
  }, [activeDonationList]);

  // Generic file export utility
  const exportData = (format, data, headers, filename) => {
    if (format === "csv") {
      const csv = Papa.unparse({
        fields: headers.map((h) => h.label),
        data: data.map((row) => headers.map((h) => row[h.key])),
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      downloadFile(blob, `${filename}.csv`);
    } else if (format === "excel") {
      const worksheet = XLSX.utils.json_to_sheet(
        data.map((row) => {
          const excelRow = {};
          headers.forEach((h) => {
            excelRow[h.label] = row[h.key];
          });
          return excelRow;
        })
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    }
  };

  const downloadFile = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Filtering and Grouping Logic
  // Filtering Logic
  const getFilteredDonations = () => {
    if (!activeDonationList) return [];

    // Filter for completed donations for the main tab
    const completedDonations = activeDonationList.filter(
      (d) => d.paymentStatus === "completed" && !d.refunded
    );

    if (activeTab === "donations") {
      return completedDonations.filter((d) => {
        const donationDate = new Date(d.createdAt).toISOString().split("T")[0];
        if (
          donationsFilters.dateFrom &&
          donationDate < donationsFilters.dateFrom
        )
          return false;
        if (donationsFilters.dateTo && donationDate > donationsFilters.dateTo)
          return false;
        if (
          donationsFilters.users.length > 0 &&
          !donationsFilters.users.includes(d.userId._id)
        )
          return false;
        if (
          donationsFilters.categories.length > 0 &&
          !d.list.some((item) =>
            donationsFilters.categories.includes(item.category)
          )
        )
          return false;
        if (
          donationsFilters.paymentMode !== "all" &&
          d.method !== donationsFilters.paymentMode
        )
          return false;
        return true;
      });
    }
    if (activeTab === "recent") {
      return completedDonations.filter(
        (d) =>
          new Date(d.createdAt).toISOString().split("T")[0] ===
          recentFilters.selectedDate
      );
    }
    // For overall analytics, we also use only completed donations
    if (activeTab === "overall") {
      return completedDonations;
    }
    return [];
  };

  const filteredDonations = getFilteredDonations();

  const groupDonationsByCategory = (donations) => {
    const grouped = {};
    donations.forEach((donation) => {
      donation.list.forEach((item) => {
        const category = item.category;
        if (!grouped[category]) {
          grouped[category] = {
            category,
            quantity: 0,
            amount: 0,
            donations: [],
          };
        }
        grouped[category].quantity += item.number || 0; // Use 'number' field
        grouped[category].amount += item.amount;
        grouped[category].donations.push({
          ...donation,
          itemAmount: item.amount,
          itemName: item.category,
          itemNumber: item.number,
        });
      });
    });

    // Add Courier as a separate category
    const courierData = donations.reduce(
      (acc, donation) => {
        if (donation.courierCharge > 0) {
          acc.quantity++;
          acc.amount += donation.courierCharge;
          acc.donations.push({
            ...donation,
            itemName: "Courier",
            itemAmount: donation.courierCharge,
            itemNumber: 1, // Representing one courier charge
          });
        }
        return acc;
      },
      { category: "Courier", quantity: 0, amount: 0, donations: [] }
    );
    if (courierData.quantity > 0) {
      grouped.Courier = courierData;
    }

    return Object.values(grouped);
  };

  const groupDonationsByUser = (donations) => {
    const grouped = {};
    donations.forEach((donation) => {
      const userId = donation.userId._id;
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          userName: donation.userId.fullname || "Unknown",
          userFatherName: donation.userId.fatherName || "",
          totalDonations: 0,
          totalAmount: 0,
          donations: [],
        };
      }
      grouped[userId].totalDonations++;
      grouped[userId].totalAmount += donation.amount;
      grouped[userId].donations.push(donation);
    });
    return Object.values(grouped);
  };

  // ... (rest of the component remains unchanged)
  // UI Components
  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-xl font-bold ${color}`}>
            {typeof value === "number" && title.includes("Amount")
              ? `₹${value.toLocaleString("en-IN")}`
              : value.toLocaleString()}
          </p>
        </div>
        <div
          className={`p-3 rounded-full ${color
            .replace("text-", "bg-")
            .replace("-600", "-100")}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  const MultiSelectDropdown = ({
    options,
    selected,
    onChange,
    placeholder,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-left flex justify-between items-center bg-white"
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : `${selected.length} selected`}
          </span>
          <ChevronDown size={16} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={(e) => {
                    const newSelected = e.target.checked
                      ? [...selected, option.value]
                      : selected.filter((id) => id !== option.value);
                    onChange(newSelected);
                  }}
                  className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm truncate">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Tab Content Components
  const DonationsTab = () => {
    const stats = {
      totalCount: filteredDonations.length,
      completedCount: filteredDonations.filter(
        (d) => d.paymentStatus === "completed"
      ).length,
      totalAmount: filteredDonations.reduce((sum, d) => sum + d.amount, 0),
      uniqueDonors: new Set(filteredDonations.map((d) => d.userId._id)).size,
      totalWeight: filteredDonations.reduce((total, donation) => {
        const donationWeight = donation.list.reduce(
          (itemSum, item) => itemSum + (item.isPacket ? 0 : item.quantity || 0),
          0
        );
        return total + donationWeight;
      }, 0),

      totalPacketCount: filteredDonations.reduce((total, donation) => {
        const donationPackets = donation.list.reduce(
          (itemSum, item) => itemSum + (item.isPacket ? item.quantity : 0),
          0
        );
        return total + donationPackets;
      }, 0),
    };

    const handleExport = (format) => {
      // Re-organize data for export based on your request
      const exportDataList = [];
      const sortedDonations = [...filteredDonations].sort(
        (a, b) =>
          new Date(a.createdAt) - new Date(b.createdAt) ||
          (a.userId.fullname || "").localeCompare(b.userId.fullname || "")
      );

      sortedDonations.forEach((d) => {
        // User & date info only for the first row of each user's donation on a specific day
        const donorName = (d.donatedAs === 'child') ? d.donatedFor.fullname : d.userId.fullname;
        const relationship = d.relationName
          ? `W/O ${d.relationName}`
          : (d.donatedAs === 'child')
            ? `${d.donatedFor.gender === "female" ? "D/O" : "S/O"} ${d.userId.fullname}`
            : `${d.userId.gender === "female" ? "D/O" : "S/O"} ${d.userId.fatherName}`;

        // Derive Prasad Collection Mode
        const prasadCollectionModeAsLocalPickup = (d) => {
          const address = d.postalAddress.toLowerCase();
          if (address === "will collect from durga sthan") {
            return true;
          }
          if (!address
              || (address.includes("manpur") && address.includes("gaya") && address.includes("bihar"))
              || (address.includes("gaya") && address.includes("bihar"))) {
            return true;
          }
          return false;
        };

        const baseRow = {
          date: new Date(d.createdAt).toLocaleDateString("en-IN"),
          userId: `${d.userId._id}`,
          profileName: `${d.userId.fullname} ${d.userId.gender === "female" ? "D/O" : "S/O"} ${d.userId.fatherName}`,
          mobileNumber: `${d.userId.contact.mobileno.code} - ${d.userId.contact.mobileno.number}`,
          email: d.userId.contact.email || '-',
          donatedFor: d.donatedAs,
          donatedForName: `${donorName} ${relationship}`,
          receiptId: d.receiptId,
        };

        const collectionMode = prasadCollectionModeAsLocalPickup(d) ? 'Local Pickup' : 'Courier';

        d.list.forEach((item) => {
          const totalPackets = item.isPacket ? item.quantity : 0;
          const totalWeightInGrams = item.isPacket ? 0 : item.quantity;
          const totalWeight = item.isPacket ? '-' : convertGramsToKgAndGm(totalWeightInGrams);

          exportDataList.push({
            ...baseRow,
            category: item.category,
            number: item.number,
            amount: item.amount,
            //courierCharge: null, // Default to null for category rows
            collectionMode: collectionMode,
            courierAddress: d.postalAddress,
            prasadTotalPackets: `${totalPackets}`,
            prasadTotalWeight: `${totalWeight === '0 gm' ? '-' : totalWeight}`,
          });
        });
      });

      const headers = [
        { label: "Date", key: "date" },
        { label: "User Ref Number", key: "userId" },
        { label: "Profile Name", key: "profileName" },
        { label: "Mobile Number", key: "mobileNumber" },
        { label: "Email Address", key: "email" },
        { label: "Donated For", key: "donatedFor" },
        { label: "Donated For Name", key: "donatedForName" },
        { label: "Receipt #", key: "receiptId" },
        { label: "Category", key: "category" },
        { label: "Number", key: "number" },
        { label: "Amount", key: "amount" },
        { label: "Prasad Collection Mode", key: "collectionMode" },
        { label: "Courier Address", key: "courierAddress" },
        { label: "Prasad Packet", key: "prasadTotalPackets" },
        { label: "Prasad Weight", key: "prasadTotalWeight" },
        //{ label: "Courier Charge", key: "courierCharge" },
      ];

      const filename =
        donationType === "registered"
          ? "All_Registered_Donations"
          : "All_Guest_Donations";
      exportData(format, exportDataList, headers, filename);
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Donations"
            value={stats.totalCount}
            icon={<FileText size={22} />}
            color="text-blue-600"
          />
          <StatCard
            title="Total Amount"
            value={stats.totalAmount}
            icon={<DollarSign size={22} />}
            color="text-purple-600"
          />
          <StatCard
            title="Total Weight"
            value={`${(stats.totalWeight / 1000).toLocaleString()} kg`}
            icon={<Scale size={22} />}
            color="text-green-600"
          />
          <StatCard
            title="Total Packet Count"
            value={stats.totalPacketCount.toLocaleString()}
            icon={<Package size={22} />}
            color="text-orange-600"
          />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="text-blue-500 w-5 h-5" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={donationsFilters.dateFrom}
                min={dateRange.min}
                max={dateRange.max}
                onChange={(e) =>
                  setDonationsFilters({
                    ...donationsFilters,
                    dateFrom: e.target.value,
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={donationsFilters.dateTo}
                min={dateRange.min}
                max={dateRange.max}
                onChange={(e) =>
                  setDonationsFilters({
                    ...donationsFilters,
                    dateTo: e.target.value,
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Mode
              </label>
              <select
                value={donationsFilters.paymentMode}
                onChange={(e) =>
                  setDonationsFilters({
                    ...donationsFilters,
                    paymentMode: e.target.value,
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="all">All Payments</option>
                <option value="Online">Online</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Users
              </label>
              <MultiSelectDropdown
                options={availableUsers}
                selected={donationsFilters.users}
                onChange={(users) =>
                  setDonationsFilters({ ...donationsFilters, users })
                }
                placeholder="All Users"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories
              </label>
              <MultiSelectDropdown
                options={availableCategories.map((cat) => ({
                  value: cat,
                  label: cat,
                }))}
                selected={donationsFilters.categories}
                onChange={(categories) =>
                  setDonationsFilters({ ...donationsFilters, categories })
                }
                placeholder="All Categories"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() =>
                setDonationsFilters({
                  dateFrom: dateRange.min,
                  dateTo: dateRange.max,
                  users: [],
                  categories: [],
                  paymentMode: "all",
                })
              }
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <X size={16} /> Clear All Filters
            </button>
            <ExportDropdown onExport={handleExport} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Donations List ({stats.totalCount})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Receipt #",
                    "User",
                    "Donated For",
                    "Categories",
                    "Amount",
                    "Method",
                    "Status",
                    "Date",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDonations.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {d.receiptId}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        {d.userId.fullname || "Unknown"}
                        {d.userId.fatherName && (
                          <p className="text-xs text-gray-500">
                            {d.userId.gender === "female"
                              ? `D/O ${d.userId.fatherName}`
                              : `S/O ${d.userId.fatherName}`}
                          </p>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="px-4 py-3 text-sm text-gray-900">
                        {d.donatedAs === "child" ? "Child" : "Self"}
                        <p className="text-xs text-gray-500">
                          {d.donatedAs === "child" ? d.donatedFor.fullname : ""}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {d.list.map((item, index) => (
                        <div key={index}>
                          {item.category}{" "}
                          <span className="font-semibold">({item.number})</span>
                        </div>
                      ))}
                      {d.courierCharge > 0 && (
                        <div>
                          Courier <span className="font-semibold">(1)</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ₹{d.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          d.method === "Cash"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {d.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          d.paymentStatus === "Completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {d.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(d.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total: {stats.totalCount} donations
            </div>
            <div className="text-lg font-semibold text-gray-900">
              Total Amount: ₹{stats.totalAmount.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RecentDonationsTab = () => {
    const categoryData = groupDonationsByCategory(filteredDonations);
    const totals = categoryData.reduce(
      (acc, cat) => ({
        quantity: acc.quantity + cat.quantity,
        amount: acc.amount + cat.amount,
      }),
      { quantity: 0, amount: 0 }
    );

    const handleExport = (format) => {
      const headers = [
        { label: "Category", key: "category" },
        { label: "Quantity", key: "quantity" },
        { label: "Amount", key: "amount" },
      ];
      const data = categoryData.map((c) => ({
        category: c.category,
        quantity: c.quantity,
        amount: c.amount.toLocaleString("en-IN"),
      }));
      exportData(
        format,
        data,
        headers,
        `Recent_Donations_${recentFilters.selectedDate}`
      );
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="text-blue-500 w-5 h-5" />
            <h3 className="text-lg font-semibold text-gray-900">Select Date</h3>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="date"
              value={recentFilters.selectedDate}
              onChange={(e) =>
                setRecentFilters({ selectedDate: e.target.value })
              }
              className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <ExportDropdown onExport={handleExport} color="green" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Donations for{" "}
              {new Date(
                recentFilters.selectedDate + "T00:00:00"
              ).toLocaleDateString("en-IN")}
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {categoryData.map((category) => (
              <div key={category.category}>
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                  onClick={() => {
                    const newExpanded = new Set(expandedCategories);
                    expandedCategories.has(category.category)
                      ? newExpanded.delete(category.category)
                      : newExpanded.add(category.category);
                    setExpandedCategories(newExpanded);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {expandedCategories.has(category.category) ? (
                      <ChevronDown size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {category.category}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Quantity: {category.quantity} | Amount: ₹
                        {category.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <Tag className="text-gray-400" size={20} />
                </div>
                {expandedCategories.has(category.category) && (
                  <div className="px-8 pb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h5 className="font-medium text-gray-700 mb-2">
                        Donors:
                      </h5>
                      <div className="space-y-2">
                        {category.donations.map((d) => (
                          <div
                            key={d._id + d.itemName}
                            className="flex justify-between items-center text-sm"
                          >
                            <div>
                              {d.userId.fullname || "Unknown"}
                              {d.userId.fatherName && (
                                <span className="text-xs text-gray-500 ml-1">
                                  {d.userId.gender === "female"
                                    ? `D/O ${d.userId.fatherName}`
                                    : `S/O ${d.userId.fatherName}`}
                                </span>
                              )}
                              <br />
                              <span className="text-xs text-gray-500">
                                Number: ({d.itemNumber})
                              </span>
                            </div>
                            <span className="font-medium">
                              ₹{d.itemAmount.toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="p-4 bg-blue-50 border-t border-gray-200 flex justify-between items-center">
            <div className="text-lg font-semibold text-blue-900">
              Total Quantity: {totals.quantity}
            </div>
            <div className="text-lg font-semibold text-blue-900">
              Total Amount: ₹{totals.amount.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const OverallDonationsTab = () => {
    const DonationsToShow =
      donationType === "registered" ? donationList : guestDonationList;
    const dataList = DonationsToShow.filter(
      (d) => d.paymentStatus === "completed" && !d.refunded
    );
    const categoryData = groupDonationsByCategory(dataList || []);
    const userData = groupDonationsByUser(dataList || []);
    const grandTotal = (dataList || []).reduce(
      (sum, d) => sum + d.amount + d.courierCharge,
      0
    );

    const handleExport = (format) => {
      if (overallView === "category") {
        const headers = [
          { label: "Category", key: "category" },
          { label: "Total Items", key: "quantity" },
          { label: "Total Amount", key: "amount" },
        ];
        const data = categoryData.map((c) => ({
          category: c.category,
          quantity: c.quantity,
          amount: c.amount.toLocaleString("en-IN"),
        }));
        const filename =
          donationType === "registered"
            ? "Overall_Registered_By_Category"
            : "Overall_Guest_By_Category";
        exportData(format, data, headers, filename);
      } else {
        const headers = [
          { label: "User", key: "userName" },
          { label: "Total Donations", key: "totalDonations" },
          { label: "Total Amount", key: "totalAmount" },
        ];
        const data = userData.map((u) => ({
          userName: u.userName,
          totalDonations: u.totalDonations,
          totalAmount: u.totalAmount.toLocaleString("en-IN"),
        }));
        const filename =
          donationType === "registered"
            ? "Overall_Registered_By_User"
            : "Overall_Guest_By_User";
        exportData(format, data, headers, filename);
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Overall Analytics
            </h3>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setOverallView("category")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  overallView === "category"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                By Category
              </button>
              <button
                onClick={() => setOverallView("users")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  overallView === "users"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                By User
              </button>
            </div>
          </div>
          <ExportDropdown onExport={handleExport} color="purple" />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900">
              {overallView === "category" ? "Category-wise" : "User-wise"}{" "}
              Breakdown
            </h4>
          </div>
          <div className="divide-y divide-gray-200">
            {(overallView === "category" ? categoryData : userData).map(
              (item) => {
                const id =
                  overallView === "category" ? item.category : item.userId;
                const title =
                  overallView === "category" ? item.category : item.userName;
                const stats =
                  overallView === "category"
                    ? `Total Items: ${
                        item.quantity
                      } | Total Amount: ₹${item.amount.toLocaleString("en-IN")}`
                    : `Total Donations: ${
                        item.totalDonations
                      } | Total Amount: ₹${item.totalAmount.toLocaleString(
                        "en-IN"
                      )}`;
                return (
                  <div key={id}>
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                      onClick={() => {
                        const newExpanded = new Set(expandedItems);
                        expandedItems.has(id)
                          ? newExpanded.delete(id)
                          : newExpanded.add(id);
                        setExpandedItems(newExpanded);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {expandedItems.has(id) ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                        <div>
                          <h5 className="font-medium text-gray-900">{title}</h5>
                          <p className="text-sm text-gray-500">{stats}</p>
                        </div>
                      </div>
                      {overallView === "category" ? (
                        <TrendingUp className="text-gray-400" size={20} />
                      ) : (
                        <Users className="text-gray-400" size={20} />
                      )}
                    </div>
                    {expandedItems.has(id) && (
                      <div className="px-8 pb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h6 className="font-medium text-gray-700 mb-2">
                            Details:
                          </h6>
                          <div className="space-y-2">
                            {item.donations
                              .sort(
                                (a, b) =>
                                  new Date(a.createdAt) - new Date(b.createdAt)
                              )
                              .map((d) => (
                                <div
                                  key={d._id}
                                  className="bg-white rounded p-2 text-sm flex justify-between items-center"
                                >
                                  <span>
                                    <span className="font-medium">
                                      {new Date(d.createdAt).toLocaleDateString(
                                        "en-IN"
                                      )}
                                    </span>
                                    {" | "}
                                    {d.receiptId}
                                    {overallView === "category"
                                      ? ` | Donated by: ${
                                          d.userId.fullname
                                        } (Quantity: ${
                                          d.list.find(
                                            (i) => i.category === item.category
                                          ).number
                                        })`
                                      : ` | Category: ${d.list
                                          .map((i) => i.category)
                                          .join(", ")}`}
                                  </span>
                                  <span className="font-medium text-green-600">
                                    ₹{d.amount.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Total Categories</p>
              <p className="text-lg font-bold text-gray-900">
                {categoryData.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Donors</p>
              <p className="text-lg font-bold text-gray-900">
                {userData.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Grand Total Amount</p>
              <p className="text-lg font-bold text-green-600">
                ₹{grandTotal.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Tab for Pending & Failed Donations
  const PendingFailedTab = () => {
    const pendingFailedDonations = useMemo(() => {
      console.log("Active Donation List:", activeDonationList);
      return (activeDonationList || []).filter(
        (d) => d.paymentStatus === "pending" || d.paymentStatus === "failed"
      );
    }, [activeDonationList]);

    const stats = useMemo(() => {
      const pending = pendingFailedDonations.filter(
        (d) => d.paymentStatus === "pending"
      );
      console.log("Pending Donations:", pending);
      const failed = pendingFailedDonations.filter(
        (d) => d.paymentStatus === "failed"
      );
      console.log("Failed Donations:", failed);
      return {
        totalCount: pendingFailedDonations.length,
        pendingCount: pending.length,
        failedCount: failed.length,
        totalAmount: pendingFailedDonations.reduce(
          (sum, d) => sum + d.amount,
          0
        ),
      };
    }, [pendingFailedDonations]);

    const handleExport = (format) => {
      const exportDataList = [];
      pendingFailedDonations.forEach((d) => {
        exportDataList.push({
          date: new Date(d.createdAt).toLocaleDateString("en-IN"),
          user: `${d.userId?.fullname || "N/A"} ${
            d.userId?.gender === "female" ? "D/O" : "S/O"
            } ${d.userId?.fatherName || "N/A"
          }`,
          razorpayOrderId: d.razorpayOrderId || "N/A",
          categories: d.list
            .map((item) => `${item.category} (${item.number})`)
            .join(", "),
          amount: d.amount,
          method: d.method,
          status: d.paymentStatus,
        });
      });
      const headers = [
        { label: "Date", key: "date" },
        { label: "User", key: "user" },
        { label: "Razorpay Order ID", key: "razorpayOrderId" },
        { label: "Categories", key: "categories" },
        { label: "Amount (INR)", key: "amount" },
        { label: "Method", key: "method" },
        { label: "Status", key: "status" },
      ];
      const filename =
        donationType === "registered"
          ? "Pending_Failed_Registered_Donations"
          : "Pending_Failed_Guest_Donations";
      exportData(format, exportDataList, headers, filename);
    };

    const handleReconcile = async (donationId) => {
      if (!donationId) return;
      setReconcilingId(donationId); // Set loading state for this specific row

      try {
        const response = await axios.post(
          `${backendUrl}/api/admin/reconcile-donation`,
          { donationId },
          { headers: { aToken } }
        );

        if (response.data.success) {
          alert(`Success! ${response.data.message}`);
          // Refresh the entire donation list to reflect the change
          await getDonationList();
        } else {
          // If the backend says it failed (e.g., payment not captured), also refresh the list
          alert(`Info: ${response.data.message}`);
          await getDonationList();
        }
      } catch (error) {
        const errorMessage =
          error.response?.data?.message ||
          "An error occurred. Please try again.";
        alert(`Error: ${errorMessage}`);
        // If an error occurs, still refresh the list in case the status was updated to 'failed'
        await getDonationList();
      } finally {
        setReconcilingId(null); // Clear loading state
      }
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Pending/Failed"
            value={stats.totalCount}
            icon={<AlertCircle size={22} />}
            color="text-red-600"
          />
          <StatCard
            title="Pending Donations"
            value={stats.pendingCount}
            icon={<Clock size={22} />}
            color="text-orange-600"
          />
          <StatCard
            title="Failed Donations"
            value={stats.failedCount}
            icon={<X size={22} />}
            color="text-red-800"
          />
          <StatCard
            title="Total Amount"
            value={stats.totalAmount}
            icon={<DollarSign size={22} />}
            color="text-yellow-600"
          />
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Pending & Failed Donations List ({stats.totalCount})
            </h3>
            <ExportDropdown onExport={handleExport} color="red" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Razorpay Order ID",
                    "User",
                    "Categories",
                    "Amount",
                    "Method",
                    "Status",
                    "Date",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingFailedDonations.map((d) => (
                  <tr key={d._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {d.razorpayOrderId || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div>
                        {d.userId?.fullname || "Unknown"}
                        {d.userId?.fatherName && (
                          <p className="text-xs text-gray-500">
                            {d.userId?.gender === "female"
                              ? `D/O ${d.userId.fatherName}`
                              : `S/O ${d.userId.fatherName}`}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {d.list.map((item, index) => (
                        <div key={index}>
                          {item.category}{" "}
                          <span className="font-semibold">({item.number})</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ₹{d.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm">{d.method}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                          d.paymentStatus === "pending"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {d.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(d.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {d.paymentStatus === "pending" && (
                        <button
                          onClick={() => handleReconcile(d._id)}
                          disabled={reconcilingId === d._id}
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-wait"
                        >
                          {reconcilingId === d._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          <span>
                            {reconcilingId === d._id
                              ? "Checking..."
                              : "Reconcile"}
                          </span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Main Component Render
  if (loading)
    return (
      <div className="flex-grow flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading donations...</p>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="flex-grow flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-lg shadow-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Donations
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );

  const tabs = [
    { name: "All Donations", key: "donations" },
    { name: "Pending & Failed", key: "pending_failed" },
    { name: "Recent Donations", key: "recent" },
    { name: "Overall Analytics", key: "overall" },
  ];

  return (
    <div className="flex-grow bg-gray-50 p-4 md:p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Donation Management
            </h1>
            <p className="text-gray-600 mt-1">
              Track and manage all donations with detailed analytics
            </p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1 self-start">
            <button
              onClick={() => setDonationType("registered")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors w-1/2 md:w-auto ${
                donationType === "registered"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              Registered Users
            </button>
            <button
              onClick={() => setDonationType("guest")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors w-1/2 md:w-auto ${
                donationType === "guest"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              Guest Users
            </button>
          </div>
        </div>
        <div className="border-b border-gray-200 mt-4">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* MODIFIED: Added rendering for the new tab */}
      {activeTab === "donations" && <DonationsTab />}
      {activeTab === "pending_failed" && <PendingFailedTab />}
      {activeTab === "recent" && <RecentDonationsTab />}
      {activeTab === "overall" && <OverallDonationsTab />}
    </div>
  );
};

export default DonationList;
