import { useState, useContext, useEffect } from "react";
import { AdminContext } from "../context/AdminContext"; // Adjust the import path as needed

const StaffRequirementsList = () => {
  const [expandedRequirement, setExpandedRequirement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get AdminContext
  const {
    staffRequirementList,
    staffRequirementCount,
    getStaffRequirementList,
  } = useContext(AdminContext);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        await getStaffRequirementList();
      } catch (err) {
        setError("Failed to fetch staff requirements");
        console.error("Error fetching staff requirements:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Transform the data to match the expected format
  const transformDataToGroupedFormat = (staffRequirements) => {
    if (!staffRequirements || !Array.isArray(staffRequirements)) {
      return [];
    }

    // Group requirements by userId
    const groupedByUser = staffRequirements.reduce((acc, requirement) => {
      const userId = requirement.userId?._id || requirement.userId;
      const username =
        requirement.userId?.name ||
        requirement.userId?.fullname ||
        "Unknown User";
      const userEmail = requirement.userId?.email || "No email provided";

      if (!acc[userId]) {
        acc[userId] = {
          userId: userId,
          username: username,
          userEmail: userEmail,
          requirements: [],
        };
      }

      // Transform the requirement data
      const transformedRequirement = {
        _id: requirement._id,
        title: requirement.title,
        category: requirement.category,
        description: requirement.description,
        location: requirement.location,
        salary: requirement.salary,
        staffType: requirement.staffType,
        availabilityDate: requirement.availabilityDate
          ? new Date(requirement.availabilityDate)
          : null,
        requirements: requirement.requirements || [],
        isOpen: requirement.isOpen,
        contact: {
          email: requirement.contact?.email || userEmail,
          code: requirement.contact?.code || "+91",
          number: requirement.contact?.number || "",
        },
        postedDate: requirement.postedDate
          ? new Date(requirement.postedDate)
          : new Date(requirement.createdAt),
      };

      acc[userId].requirements.push(transformedRequirement);
      return acc;
    }, {});

    // Convert grouped object to array
    return Object.values(groupedByUser);
  };

  const groupedRequirements =
    transformDataToGroupedFormat(staffRequirementList);

  // Calculate statistics
  const totalRequirements =
    staffRequirementCount || staffRequirementList?.length || 0;
  const openRequirements =
    staffRequirementList?.filter((req) => req.isOpen)?.length || 0;
  const totalPosters = groupedRequirements.length;

  const toggleRequirementExpansion = (requirementId) => {
    if (expandedRequirement === requirementId) {
      setExpandedRequirement(null); // Collapse if same requirement is clicked
    } else {
      setExpandedRequirement(requirementId); // Expand the clicked requirement
    }
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

  const getStatusColor = (isOpen) => {
    return isOpen ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  const getStaffTypeColor = (staffType) => {
    switch (staffType) {
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff requirements...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error Loading Data
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!staffRequirementList || staffRequirementList.length === 0) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        <div className="w-full max-w-none px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
              Staff Requirements
            </h1>
            <p className="text-xs sm:text-sm lg:text-lg text-gray-600">
              Browse and manage staff requirement postings from community
              members
            </p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
            <StatCard
              title="Total Requirements"
              value={0}
              icon="💼"
              color="text-blue-600"
            />
            <StatCard
              title="Open Positions"
              value={0}
              icon="✓"
              color="text-green-600"
            />
            <StatCard
              title="Total Posters"
              value={0}
              icon="👥"
              color="text-purple-600"
            />
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Staff Requirements Found
            </h3>
            <p className="text-gray-600">
              There are currently no staff requirements posted by community
              members.
            </p>
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
            Staff Requirements
          </h1>
          <p className="text-xs sm:text-sm lg:text-lg text-gray-600">
            Browse and manage staff requirement postings from community members
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <StatCard
            title="Total Requirements"
            value={totalRequirements}
            icon="💼"
            color="text-blue-600"
          />
          <StatCard
            title="Open Positions"
            value={openRequirements}
            icon="✓"
            color="text-green-600"
          />
          <StatCard
            title="Total Posters"
            value={totalPosters}
            icon="👥"
            color="text-purple-600"
          />
        </div>

        {/* Requirements List */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100">
          <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-100">
            <h2 className="text-base sm:text-lg lg:text-2xl font-semibold text-gray-900">
              Staff Requirements
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            {groupedRequirements.map((user) => (
              <div key={user.userId}>
                {user.requirements.map((requirement, index) => {
                  const isExpanded = expandedRequirement === requirement._id;
                  const isFirstRequirement = index === 0;

                  return (
                    <div key={requirement._id}>
                      {/* User Separator - only show for first requirement of each user */}
                      {isFirstRequirement && (
                        <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                              Posted by {user.username}
                            </span>
                            <div className="flex-1 h-px bg-gray-200"></div>
                          </div>
                        </div>
                      )}

                      {/* Requirement Item */}
                      <div className="p-3 sm:p-4 lg:p-6">
                        {/* Requirement Header - Clickable */}
                        <div
                          className="flex items-start justify-between cursor-pointer hover:bg-gray-50 p-2 sm:p-3 rounded-lg transition-colors gap-3"
                          onClick={() =>
                            toggleRequirementExpansion(requirement._id)
                          }
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg">
                                  {requirement.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(
                                      requirement.isOpen
                                    )}`}
                                  >
                                    {requirement.isOpen ? "Open" : "Closed"}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStaffTypeColor(
                                      requirement.staffType
                                    )}`}
                                  >
                                    {requirement.staffType}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-xs text-gray-600">
                              {requirement.category && (
                                <span className="text-blue-600 font-medium">
                                  {requirement.category}
                                </span>
                              )}
                              {requirement.location && (
                                <span className="flex items-center gap-1">
                                  <span>📍</span>
                                  <span className="truncate">
                                    {requirement.location}
                                  </span>
                                </span>
                              )}
                              {requirement.salary && (
                                <span className="flex items-center gap-1">
                                  <span>💰</span>
                                  <span>
                                    ₹{requirement.salary.toLocaleString()}/month
                                  </span>
                                </span>
                              )}
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
                            {requirement.description && (
                              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                                {requirement.description}
                              </p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs">
                              {requirement.availabilityDate && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 flex-shrink-0">
                                    📅
                                  </span>
                                  <span>
                                    Available from{" "}
                                    {requirement.availabilityDate.toLocaleDateString()}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 flex-shrink-0">
                                  🕒
                                </span>
                                <span>
                                  Posted{" "}
                                  {requirement.postedDate.toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {/* Requirements/Skills */}
                            {requirement.requirements &&
                              requirement.requirements.length > 0 && (
                                <div>
                                  <h5 className="font-medium text-gray-900 mb-2 text-xs sm:text-sm">
                                    Requirements:
                                  </h5>
                                  <div className="flex flex-wrap gap-1 sm:gap-2">
                                    {requirement.requirements.map(
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
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <h5 className="font-medium text-gray-900 mb-2 text-xs sm:text-sm">
                                Contact Information:
                              </h5>
                              <div className="flex flex-col gap-1 sm:gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 flex-shrink-0">
                                    📧
                                  </span>
                                  <span className="break-all">
                                    {requirement.contact.email}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 flex-shrink-0">
                                    📞
                                  </span>
                                  <span>
                                    {requirement.contact.code}{" "}
                                    {requirement.contact.number}
                                  </span>
                                </div>
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

export default StaffRequirementsList;
