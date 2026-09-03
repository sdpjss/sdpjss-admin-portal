import { useState, useContext, useEffect } from "react";
import { AdminContext } from "../context/AdminContext"; // Adjust path as needed

const AdvertisementList = () => {
  const [expandedAd, setExpandedAd] = useState(null); // Changed to single value for one-at-a-time expansion
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get data from AdminContext
  const { advertisementList, getAdvertisementList } =
    useContext(AdminContext);

  // Fetch advertisements on component mount
  useEffect(() => {
    const fetchAdvertisements = async () => {
      try {
        setLoading(true);
        await getAdvertisementList();
      } catch (err) {
        setError("Failed to fetch advertisements");
        console.error("Error fetching advertisements:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdvertisements();
  }, []);

  // Function to group advertisements by user
  const groupAdvertisementsByUser = (advertisements) => {
    const grouped = {};

    advertisements.forEach((ad) => {
      const userId = ad.userId._id || ad.userId;
      const username = ad.userId.fullname || "Unknown User";
      const userEmail = ad.userId.email || "No email";

      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          username,
          userEmail,
          advertisements: [],
        };
      }

      grouped[userId].advertisements.push(ad);
    });

    return Object.values(grouped);
  };

  // Calculate statistics
  const totalAdvertisements = advertisementList.length;
  const inactiveAdvertisements = advertisementList.filter(
    (ad) => !ad.isActive
  ).length;
  const expiredAdvertisements = advertisementList.filter(
    (ad) => new Date() > new Date(ad.validUntil)
  ).length;
  const groupedData = groupAdvertisementsByUser(advertisementList);
  const totalPosters = groupedData.length;

  const toggleAdExpansion = (adId) => {
    // If clicking on already expanded ad, close it. Otherwise, open the new one
    setExpandedAd(expandedAd === adId ? null : adId);
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">
            {title}
          </p>
          <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${color}`}>
            {value.toLocaleString()}
          </p>
        </div>
        <div
          className={`p-2 sm:p-3 rounded-full ${color
            .replace("text-", "bg-")
            .replace("-600", "-100")}`}
        >
          <span className="text-base sm:text-lg lg:text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  const getStatusColor = (isActive, isExpired) => {
    if (isExpired) return "bg-orange-100 text-orange-800";
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "Service":
        return "bg-blue-100 text-blue-800";
      case "Product":
        return "bg-purple-100 text-purple-800";
      case "Event":
        return "bg-orange-100 text-orange-800";
      case "Offer":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const isExpired = (validUntil) => {
    return new Date() > new Date(validUntil);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusText = (isActive, expired) => {
    if (expired) return "Expired";
    return isActive ? "Active" : "Inactive";
  };

  const getDetailedStatusText = (isActive, expired) => {
    if (expired) return "Advertisement Expired";
    return isActive ? "Currently Active" : "Currently Inactive";
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading advertisements...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (totalAdvertisements === 0) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        <div className="w-full max-w-none px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
              Advertisements
            </h1>
            <p className="text-xs sm:text-sm lg:text-lg text-gray-600">
              Browse local advertisements and services from community members
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 text-center">
            <p className="text-gray-500 text-lg">No advertisements found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-none px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
            Advertisements
          </h1>
          <p className="text-xs sm:text-sm lg:text-lg text-gray-600">
            Browse local advertisements and services from community members
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <StatCard
            title="Total Advertisements"
            value={totalAdvertisements}
            icon="📢"
            color="text-blue-600"
          />
          <StatCard
            title="Inactive Ads"
            value={inactiveAdvertisements}
            icon="❌"
            color="text-red-600"
          />
          <StatCard
            title="Expired Ads"
            value={expiredAdvertisements}
            icon="⏰"
            color="text-orange-600"
          />
          <StatCard
            title="Total Posters"
            value={totalPosters}
            icon="👥"
            color="text-purple-600"
          />
        </div>

        {/* Advertisements List */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
          <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-100">
            <h2 className="text-base sm:text-lg lg:text-2xl font-semibold text-gray-900">
              Community Advertisements ({totalAdvertisements})
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {groupedData.map((user) => (
              <div key={user.userId}>
                {user.advertisements.map((advertisement, index) => {
                  const isExpanded = expandedAd === advertisement._id;
                  const isFirstAd = index === 0;
                  const expired = isExpired(advertisement.validUntil);

                  return (
                    <div key={advertisement._id}>
                      {/* User Separator - only show for first advertisement of each user */}
                      {isFirstAd && (
                        <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                              Posted by {user.username}
                            </span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>
                        </div>
                      )}

                      {/* Advertisement Item */}
                      <div className="p-3 sm:p-4 lg:p-6">
                        {/* Advertisement Header - Clickable */}
                        <div
                          className="flex items-start justify-between cursor-pointer hover:bg-gray-50 p-2 sm:p-3 rounded-lg transition-colors gap-3"
                          onClick={() => toggleAdExpansion(advertisement._id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">
                                  {advertisement.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(
                                      advertisement.isActive,
                                      expired
                                    )}`}
                                  >
                                    {getStatusText(
                                      advertisement.isActive,
                                      expired
                                    )}
                                  </span>
                                  {advertisement.category && (
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(
                                        advertisement.category
                                      )}`}
                                    >
                                      {advertisement.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-xs text-gray-600">
                              {advertisement.location && (
                                <span className="flex items-center gap-1">
                                  <span>📍</span>
                                  <span className="truncate">
                                    {advertisement.location}
                                  </span>
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <span>📅</span>
                                <span>
                                  Valid until{" "}
                                  {formatDate(advertisement.validUntil)}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Simple Arrow Button */}
                          <button className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors">
                            <span className="text-gray-500 text-sm font-mono">
                              {isExpanded ? "v" : ">"}
                            </span>
                          </button>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-3 space-y-3 bg-gray-50 rounded-lg p-3 sm:p-4">
                            {advertisement.description && (
                              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                                {advertisement.description}
                              </p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 flex-shrink-0">
                                  📅
                                </span>
                                <span>
                                  Valid from{" "}
                                  {formatDate(advertisement.validFrom)} to{" "}
                                  {formatDate(advertisement.validUntil)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 flex-shrink-0">
                                  🕒
                                </span>
                                <span>
                                  Posted{" "}
                                  {formatDate(
                                    advertisement.postedDate ||
                                      advertisement.createdAt
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Status Indicator */}
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500 flex-shrink-0">
                                📊
                              </span>
                              <span
                                className={`px-2 py-1 rounded-full font-medium ${getStatusColor(
                                  advertisement.isActive,
                                  expired
                                )}`}
                              >
                                {getDetailedStatusText(
                                  advertisement.isActive,
                                  expired
                                )}
                              </span>
                            </div>

                            {/* Contact Info */}
                            {advertisement.contact && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <h5 className="font-medium text-gray-900 mb-2 text-xs sm:text-sm">
                                  Contact Information:
                                </h5>
                                <div className="flex flex-col gap-1 sm:gap-2 text-xs">
                                  {advertisement.contact.email && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 flex-shrink-0">
                                        📧
                                      </span>
                                      <span className="break-all">
                                        {advertisement.contact.email}
                                      </span>
                                    </div>
                                  )}
                                  {advertisement.contact.number && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 flex-shrink-0">
                                        📞
                                      </span>
                                      <span>
                                        {advertisement.contact.code || "+91"}{" "}
                                        {advertisement.contact.number}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvertisementList;
