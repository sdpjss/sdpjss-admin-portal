import { useState, useEffect, useContext } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { assets } from "../assets/assets";
import axios from "axios";
import { AdminContext } from "../context/AdminContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { backendUrl, aToken, adminRole, allowedFeatures, adminName } =
    useContext(AdminContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalFamilies: 0,
    totalUsers: 0,
    totalDonations: 0,
    monthlyData: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState("families");
  const [showChart, setShowChart] = useState(adminRole === "superadmin");
  const [features, setFeatures] = useState([]);
  const [featuresLoading, setFeaturesLoading] = useState(true);

  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Fetch features based on admin role and permissions
  const fetchFeatures = async () => {
    try {
      setFeaturesLoading(true);
      const response = await fetch(
        `${backendUrl}/api/admin/list?access=admin`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            atoken: aToken,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        // First, get all active features from the backend
        let activeFeatures = data.data
          .filter((feature) => feature.isActive)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        // If the user is a regular admin, filter the list again
        if (adminRole === "admin") {
          activeFeatures = activeFeatures.filter((feature) =>
            allowedFeatures.includes(feature._id)
          );
        }
        setFeatures(activeFeatures);
      } else {
        console.error("Failed to fetch features");
        setFeatures([]);
      }
    } catch (error) {
      console.error("Error fetching features:", error);
      setFeatures([]);
    } finally {
      setFeaturesLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [backendUrl, aToken, adminRole, allowedFeatures]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // First, get available years
        const yearsResponse = await axios.get(
          backendUrl + "/api/admin/available-years",
          { headers: { aToken } }
        );

        // Use real years data if available, otherwise fallback to current year only
        if (yearsResponse.data.years && yearsResponse.data.years.length > 0) {
          setAvailableYears(yearsResponse.data.years);
        } else {
          // Fallback to current year only
          setAvailableYears([new Date().getFullYear()]);
        }

        // Fetch data for selected year
        const [familiesResponse, usersResponse, donationsResponse] =
          await Promise.all([
            axios.get(
              backendUrl + `/api/admin/family-count?year=${selectedYear}`,
              { headers: { aToken } }
            ),
            axios.get(
              backendUrl + `/api/admin/user-count?year=${selectedYear}`,
              {
                headers: { aToken },
              }
            ),
            axios.get(
              backendUrl + `/api/admin/donation-count?year=${selectedYear}`,
              { headers: { aToken } }
            ),
          ]);

        // Extract real data from API responses
        const familyData = familiesResponse.data;
        const userData = usersResponse.data;
        const donationData = donationsResponse.data;

        // Calculate totals from monthly data
        const totalFamilies = familyData.totalCount || 0;
        const totalUsers = userData.totalUsers || 0;
        const totalDonations = donationData.totalAmount || 0;

        // Combine monthly data from both APIs
        const monthlyData = [];
        const months = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];

        for (let i = 0; i < 12; i++) {
          const familyMonth = familyData.monthlyData
            ? familyData.monthlyData.find((m) => m.month === months[i])
            : null;
          const userMonth = userData.monthlyData
            ? userData.monthlyData.find((m) => m.month === months[i])
            : null;
          const donationMonth = donationData.monthlyData
            ? donationData.monthlyData.find((m) => m.month === months[i])
            : null;

          monthlyData.push({
            month: months[i],
            families: familyMonth ? familyMonth.families : 0,
            users: userMonth
              ? userMonth.completeUsers + userMonth.incompleteUsers
              : 0,
            donations: donationMonth ? donationMonth.donations : 0,
          });
        }

        const realStats = {
          totalFamilies: totalFamilies,
          totalUsers: totalUsers,
          totalDonations: totalDonations,
          monthlyData: monthlyData,
        };

        setStats(realStats);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedYear, backendUrl, aToken]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Default quick actions (fallback) - removed, will use empty array if no features
  const defaultQuickActions = [];

  // Generate quick actions from features
  const getQuickActionsFromFeatures = () => {
    if (featuresLoading) return [];

    if (features.length === 0) {
      return defaultQuickActions;
    }

    return features.map((feature, index) => {
      const colors = [
        "blue",
        "green",
        "purple",
        "orange",
        "indigo",
        "pink",
        "teal",
        "red",
      ];
      const color = colors[index % colors.length];

      // Get icon from assets based on iconName
      const getIcon = (iconName) => {
        // Map iconName to actual asset
        if (assets[iconName]) {
          return assets[iconName];
        }
        // Fallback mappings if exact match not found
        const iconMappings = {
          home_icon: assets.home_icon || assets.dashboard_icon,
          family_icon: assets.family_list || assets.family_icon,
          user_icon: assets.user_list || assets.user_icon,
          donation_icon: assets.donation_list || assets.donation_icon,
          notice_icon: assets.notice_board || assets.notice_icon,
        };
        return iconMappings[iconName] || assets.family_list; // Ultimate fallback
      };

      return {
        title: feature.featureName,
        icon: getIcon(feature.iconName),
        path: feature.link,
        color: color,
        description: `Access ${feature.featureName.toLowerCase()} management`,
        id: feature._id,
      };
    });
  };

  const quickActions = getQuickActionsFromFeatures();

  const StatCard = ({ title, value, icon, color, isLoading, subtitle }) => (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${color} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-white bg-opacity-10 rounded-full"></div>
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-white text-opacity-90 text-sm font-medium mb-1">
              {title}
            </p>
            {isLoading ? (
              <div className="h-10 bg-white bg-opacity-20 rounded w-24 animate-pulse"></div>
            ) : (
              <p className="text-white text-3xl font-bold mb-1">
                {typeof value === "number" && title.includes("Donation")
                  ? formatCurrency(value)
                  : value.toLocaleString()}
              </p>
            )}
            {subtitle && (
              <p className="text-white text-opacity-70 text-xs">{subtitle}</p>
            )}
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-xl">
            <img src={icon} alt={title} className="w-8 h-8" />
          </div>
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({ title, icon, path, color, description }) => (
    <button
      onClick={() => navigate(path)}
      className={`group relative overflow-hidden bg-white rounded-xl shadow-sm border-2 border-transparent hover:border-${color}-200 hover:shadow-lg transition-all duration-300 p-6 text-left w-full`}
    >
      <div className="flex items-start space-x-4">
        <div
          className={`flex-shrink-0 w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center group-hover:bg-${color}-200 transition-colors`}
        >
          <img src={icon} alt={title} className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-gray-500 text-sm">{description}</p>
        </div>
        <div
          className={`opacity-0 group-hover:opacity-100 transition-opacity text-${color}-600`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    </button>
  );

  const ChartToggle = ({ activeChart, setActiveChart }) => (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setActiveChart("families")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeChart === "families"
            ? "bg-blue-600 text-white shadow-lg"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Families
      </button>
      <button
        onClick={() => setActiveChart("users")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeChart === "users"
            ? "bg-green-600 text-white shadow-lg"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Users
      </button>
      <button
        onClick={() => setActiveChart("donations")}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          activeChart === "donations"
            ? "bg-purple-600 text-white shadow-lg"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Donations
      </button>
    </div>
  );

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {adminName || "Admin"}!
            </h1>
            <p className="text-gray-600">
              {adminRole === "superadmin"
                ? "Full system access - Manage your community with complete control."
                : "Manage your community with the features available to you."}
            </p>
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  adminRole === "superadmin"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {adminRole === "superadmin" ? "Super Admin" : "Admin"}
              </span>
            </div>
          </div>
          {adminRole === "superadmin" && (
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowChart(!showChart)}
                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                {showChart ? "Hide Analytics" : "Show Analytics"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - More Prominent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Families"
          value={stats.totalFamilies}
          icon={assets.family_list}
          color="from-blue-500 to-blue-600"
          isLoading={loading}
          subtitle="Registered families"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={assets.user_list}
          color="from-green-500 to-green-600"
          isLoading={loading}
          subtitle="Active community members"
        />
        <StatCard
          title="Total Donations"
          value={stats.totalDonations}
          icon={assets.donation_list}
          color="from-purple-500 to-purple-600"
          isLoading={loading}
          subtitle="Community contributions"
        />
      </div>

      {/* Quick Actions - Primary Focus */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {adminRole === "superadmin"
              ? "All Features"
              : "Your Available Features"}
          </h2>
          <p className="text-gray-500 text-sm">
            {adminRole === "superadmin"
              ? `${quickActions.length} features available`
              : `${quickActions.length} features accessible`}
          </p>
        </div>

        {featuresLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-xl"></div>
                  <div className="flex-1 min-w-0">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : quickActions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionCard
                key={action.id || index}
                title={action.title}
                icon={action.icon}
                path={action.path}
                color={action.color}
                description={action.description}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No features available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {adminRole === "admin"
                ? "Contact your super admin to get access to features."
                : "No active features found in the system."}
            </p>
          </div>
        )}
      </div>

      {/* Collapsible Charts Section - Only for SuperAdmin */}
      {adminRole === "superadmin" && showChart && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4 sm:mb-0">
              <h3 className="text-xl font-semibold text-gray-900">
                Monthly Analytics
              </h3>
              <div className="flex items-center gap-3">
                <label
                  htmlFor="year-select"
                  className="text-sm font-medium text-gray-700"
                >
                  Year:
                </label>
                <select
                  id="year-select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <ChartToggle
              activeChart={activeChart}
              setActiveChart={setActiveChart}
            />
          </div>

          {loading ? (
            <div className="h-80 bg-gray-50 rounded-xl animate-pulse flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 bg-gray-300 rounded-full mx-auto mb-2 animate-pulse"></div>
                <p className="text-gray-500">Loading chart data...</p>
              </div>
            </div>
          ) : (
            <div className="h-80 -ml-6">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === "donations" ? (
                  <BarChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) =>
                        `₹${(value / 1000).toFixed(0)}K`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                      }}
                      formatter={(value) => [
                        formatCurrency(value),
                        "Donations",
                      ]}
                    />
                    <Bar
                      dataKey="donations"
                      fill="#9333ea"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <LineChart data={stats.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend />
                    {activeChart === "families" && (
                      <Line
                        type="monotone"
                        dataKey="families"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ fill: "#2563eb", strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: "#2563eb", strokeWidth: 2 }}
                        name="New Families"
                      />
                    )}
                    {activeChart === "users" && (
                      <Line
                        type="monotone"
                        dataKey="users"
                        stroke="#16a34a"
                        strokeWidth={3}
                        dot={{ fill: "#16a34a", strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: "#16a34a", strokeWidth: 2 }}
                        name="New Users"
                      />
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
