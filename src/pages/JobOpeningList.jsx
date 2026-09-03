import { useState, useEffect, useContext } from "react";
import { AdminContext } from "../context/AdminContext"; // Adjust path as needed

const JobOpeningList = () => {
  const [expandedOpening, setExpandedOpening] = useState(null); // Changed to single ID
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get context values
  const { jobOpeningList, jobOpeningCount, getJobOpeningList, aToken } =
    useContext(AdminContext);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      if (!aToken) {
        setError("Authentication token not found");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await getJobOpeningList();
        setError(null);
      } catch (err) {
        setError("Failed to fetch job openings");
        console.error("Error fetching job openings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [aToken]);

  // Group job openings by user
  const groupJobOpeningsByUser = (jobOpenings) => {
    const grouped = {};

    jobOpenings.forEach((job) => {
      const userId = job.userId._id;
      if (!grouped[userId]) {
        grouped[userId] = {
          userId: userId,
          username: job.userId.fullname || "Unknown User",
          userEmail: job.userId.email || "No email provided",
          openings: [],
        };
      }
      grouped[userId].openings.push(job);
    });

    return Object.values(grouped);
  };

  // Calculate statistics
  const totalOpenings = jobOpeningCount || jobOpeningList.length;
  const openPositions = jobOpeningList.filter((job) => job.isOpen).length;
  const groupedData = groupJobOpeningsByUser(jobOpeningList);
  const totalEmployers = groupedData.length;

  const toggleOpeningExpansion = (openingId) => {
    // If clicking the same opening, close it; otherwise, open the new one
    setExpandedOpening(expandedOpening === openingId ? null : openingId);
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-2 sm:p-4 lg:p-6 hover:shadow-md transition-shadow duration-200">
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

  const getStatusColor = (isOpen) => {
    return isOpen ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const getJobTypeColor = (jobType) => {
    switch (jobType) {
      case "Full-time":
        return "bg-blue-100 text-blue-800";
      case "Part-time":
        return "bg-orange-100 text-orange-800";
      case "Freelance":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Function to shorten location for mobile
  const formatLocation = (location) => {
    if (!location) return "Location not specified";
    const parts = location.split(", ");
    if (parts.length >= 3) {
      return `${parts[0]}, ${parts[parts.length - 2]}`;
    }
    return location;
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "Date not specified";
    return new Date(dateString).toLocaleDateString();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading job openings...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Data
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
  }

  // No data state
  if (!jobOpeningList || jobOpeningList.length === 0) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-8 py-2 sm:py-6 lg:py-8">
          <div className="mb-3 sm:mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
              Job Openings
            </h1>
            <p className="text-xs sm:text-sm lg:text-lg text-gray-600">
              Discover employment opportunities posted by local employers and
              businesses
            </p>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-6xl mb-4">💼</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Job Openings Available
            </h2>
            <p className="text-gray-600">
              There are currently no job openings posted. Check back later!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-8 py-2 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-3 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
            Job Openings
          </h1>
          <p className="text-xs sm:text-sm lg:text-lg text-gray-600">
            Discover employment opportunities posted by local employers and
            businesses
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 mb-3 sm:mb-6 lg:mb-8">
          <StatCard
            title="Total Job Openings"
            value={totalOpenings}
            icon="💼"
            color="text-blue-600"
          />
          <StatCard
            title="Open Positions"
            value={openPositions}
            icon="✓"
            color="text-green-600"
          />
          <StatCard
            title="Active Employers"
            value={totalEmployers}
            icon="🏢"
            color="text-purple-600"
          />
        </div>

        {/* Job Openings List */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
          <div className="p-2 sm:p-4 lg:p-6 border-b border-gray-100">
            <h2 className="text-base sm:text-lg lg:text-2xl font-semibold text-gray-900">
              Available Positions ({totalOpenings})
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {groupedData.map((user) => (
              <div key={user.userId}>
                {user.openings.map((opening, index) => {
                  const isExpanded = expandedOpening === opening._id;
                  const isFirstOpening = index === 0;

                  return (
                    <div key={opening._id}>
                      {/* Employer Separator - only show for first opening of each employer */}
                      {isFirstOpening && (
                        <div className="px-2 sm:px-4 lg:px-6 py-1.5 sm:py-3 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                              Posted by {user.username}
                            </span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>
                        </div>
                      )}

                      {/* Job Opening Item */}
                      <div className="p-2 sm:p-4 lg:p-6">
                        {/* Opening Header - Clickable */}
                        <div
                          className="flex items-start justify-between cursor-pointer hover:bg-gray-50 p-1.5 sm:p-3 rounded-lg transition-colors gap-2"
                          onClick={() => toggleOpeningExpansion(opening._id)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-1 mb-1">
                              <h3 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">
                                {opening.title}
                              </h3>

                              <div className="flex flex-col gap-1 text-xs text-gray-600">
                                {opening.category && (
                                  <span className="text-blue-600 font-medium">
                                    {opening.category}
                                  </span>
                                )}
                                {opening.location && (
                                  <span className="flex items-center gap-1">
                                    <span>📍</span>
                                    <span className="truncate">
                                      <span className="sm:hidden">
                                        {formatLocation(opening.location)}
                                      </span>
                                      <span className="hidden sm:inline">
                                        {opening.location}
                                      </span>
                                    </span>
                                  </span>
                                )}
                                {opening.salary && (
                                  <span className="flex items-center gap-1">
                                    <span>💰</span>
                                    <span>
                                      ₹{opening.salary.toLocaleString()}/month
                                    </span>
                                  </span>
                                )}
                              </div>

                              {/* Tags moved to bottom */}
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(
                                    opening.isOpen
                                  )}`}
                                >
                                  {opening.isOpen ? "Hiring" : "Filled"}
                                </span>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getJobTypeColor(
                                    opening.jobType
                                  )}`}
                                >
                                  {opening.jobType}
                                </span>
                              </div>
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
                          <div className="mt-2 space-y-2 bg-gray-50 rounded-lg p-2 sm:p-4">
                            {opening.description && (
                              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                                {opening.description}
                              </p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 text-xs">
                              {opening.availabilityDate && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 flex-shrink-0">
                                    📅
                                  </span>
                                  <span>
                                    Start date{" "}
                                    {formatDate(opening.availabilityDate)}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 flex-shrink-0">
                                  🕒
                                </span>
                                <span>
                                  Posted{" "}
                                  {formatDate(
                                    opening.postedDate || opening.createdAt
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Job Requirements */}
                            {opening.requirements &&
                              opening.requirements.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-1.5 text-xs sm:text-sm">
                                    Job Requirements:
                                  </h5>
                                  <div className="flex flex-wrap gap-1">
                                    {opening.requirements.map(
                                      (req, reqIndex) => (
                                        <span
                                          key={reqIndex}
                                          className="bg-white text-gray-700 px-2 py-1 rounded-full text-xs border border-gray-200"
                                        >
                                          {req}
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Contact Info */}
                            <div className="bg-white rounded-lg p-2.5 border border-gray-200">
                              <h5 className="font-medium text-gray-900 mb-1.5 text-xs sm:text-sm">
                                Apply Now - Contact Information:
                              </h5>
                              <div className="flex flex-col gap-1 text-xs">
                                {opening.contact?.email && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 flex-shrink-0">
                                      📧
                                    </span>
                                    <span className="break-all">
                                      {opening.contact.email}
                                    </span>
                                  </div>
                                )}
                                {opening.contact?.number && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 flex-shrink-0">
                                      📞
                                    </span>
                                    <span>
                                      {opening.contact.code || "+91"}{" "}
                                      {opening.contact.number}
                                    </span>
                                  </div>
                                )}
                                {!opening.contact?.email &&
                                  !opening.contact?.number && (
                                    <div className="text-gray-500 italic">
                                      Contact information not provided
                                    </div>
                                  )}
                              </div>
                            </div>
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

export default JobOpeningList;
