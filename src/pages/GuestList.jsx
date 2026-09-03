import { useState, useEffect, useContext } from "react";
import {
  Search,
  Users,
  Phone,
  MapPin,
  Calendar,
  User,
  UserCheck,
  Edit,
  X,
} from "lucide-react";
import { AdminContext } from "../context/AdminContext";
import { toast } from "react-toastify";

const GuestList = () => {
  const [guestUsers, setGuestUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [cardsPerRow, setCardsPerRow] = useState(3);
  const { backendUrl, aToken } = useContext(AdminContext);

  // ---- NEW STATES FOR EDITING & VALIDATION ----
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState({}); // <-- State for validation errors

  // Fetch guest users from API
  useEffect(() => {
    fetchGuestUsers();
  }, []);

  // Handle window resize to update cards per row
  useEffect(() => {
    const updateCardsPerRow = () => {
      if (window.innerWidth >= 1280) {
        setCardsPerRow(3);
      } else if (window.innerWidth >= 1024) {
        setCardsPerRow(2);
      } else {
        setCardsPerRow(1);
      }
    };

    updateCardsPerRow();
    window.addEventListener("resize", updateCardsPerRow);
    return () => window.removeEventListener("resize", updateCardsPerRow);
  }, []);

  const fetchGuestUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${backendUrl}/api/additional/all-guest-users`
      );
      const data = await response.json();

      if (data.success) {
        setGuestUsers(data.guestUsers);
        setFilteredUsers(data.guestUsers);
      } else {
        setError("Failed to fetch guest users");
      }
    } catch (err) {
      setError("Error fetching guest users: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(guestUsers);
    } else {
      const filtered = guestUsers.filter(
        (user) =>
          user.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.father?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.contact?.mobileno?.number?.includes(searchTerm) ||
          user.address?.city
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          user.address?.state?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, guestUsers]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleCardExpansion = (userId, index) => {
    const currentRow = Math.floor(index / cardsPerRow);
    const newExpandedCards = new Set();

    expandedCards.forEach((expandedIndex) => {
      const expandedRow = Math.floor(expandedIndex / cardsPerRow);
      if (expandedRow !== currentRow) {
        newExpandedCards.add(expandedIndex);
      }
    });

    if (!expandedCards.has(index)) {
      newExpandedCards.add(index);
    }
    setExpandedCards(newExpandedCards);
  };

  // ---- HELPER FUNCTIONS FOR VALIDATION & FORMATTING ----

  // Formats a string to Title Case
  const toTitleCase = (str) => {
    if (!str) return "";
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  // Validates a single form field
  const validateField = (name, value) => {
    const textFields = [
      "fullname",
      "father",
      "address.street",
      "address.city",
      "address.state",
    ];

    if (textFields.includes(name)) {
      if (!value) return "This field is required.";
      if (/\s{2,}/.test(value)) return "Multiple spaces are not allowed.";
    }

    if (name === "contact.mobileno.number") {
      if (!value) return "Mobile number is required.";
      if (value.length !== 10) return "Mobile number must be 10 digits.";
    }

    return ""; // No error
  };

  // ---- MODIFIED FUNCTIONS FOR EDITING ----

  // Open modal and set user data to be edited
  const handleEditClick = (user) => {
    setEditingUser({
      id: user._id,
      fullname: user.fullname || "",
      father: user.father || "",
      contact: {
        mobileno: {
          code: user.contact?.mobileno?.code || "+91",
          number: user.contact?.mobileno?.number || "",
        },
      },
      address: {
        street: user.address?.street || "",
        city: user.address?.city || "",
        state: user.address?.state || "",
        pin: user.address?.pin || "",
        country: user.address?.country || "India",
      },
    });
    setIsEditModalOpen(true);
    setFormErrors({}); // Clear previous errors when opening modal
  };

  // Handle changes in the edit form inputs with real-time validation
  const handleFormChange = (e) => {
    const { name, value: rawValue } = e.target;
    let value = rawValue;

    // --- Apply transformations first ---
    const textFields = [
      "fullname",
      "father",
      "address.street",
      "address.city",
      "address.state",
    ];
    if (textFields.includes(name)) {
      value = toTitleCase(value.replace(/\s{2,}/g, " ")); // Prevent multiple spaces and format
    }
    if (name === "contact.mobileno.number") {
      value = value.replace(/[^0-9]/g, "").slice(0, 10); // Allow only 10 digits
    }
    if (name === "address.pin") {
      value = value.replace(/[^0-9]/g, "").slice(0, 6); // Allow only 6 digits for PIN
    }

    // --- Update form state ---
    const keys = name.split(".");
    setEditingUser((prev) => {
      const newFormState = JSON.parse(JSON.stringify(prev)); // Deep copy
      let current = newFormState;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newFormState;
    });

    // --- Perform validation and update error state ---
    const error = validateField(name, value);
    setFormErrors((prevErrors) => ({
      ...prevErrors,
      [name]: error,
    }));
  };

  // Validate the entire form before submission
  const isFormValid = () => {
    if (!editingUser) return false;

    const errors = {};
    Object.keys(editingUser).forEach((key) => {
      // Simple check for top-level fields
      if (typeof editingUser[key] === "string") {
        const error = validateField(key, editingUser[key]);
        if (error) errors[key] = error;
      }
    });

    // Specific checks for nested fields
    const mobileError = validateField(
      "contact.mobileno.number",
      editingUser.contact.mobileno.number
    );
    if (mobileError) errors["contact.mobileno.number"] = mobileError;

    const cityError = validateField("address.city", editingUser.address.city);
    if (cityError) errors["address.city"] = cityError;

    const stateError = validateField(
      "address.state",
      editingUser.address.state
    );
    if (stateError) errors["address.state"] = stateError;

    setFormErrors(errors);
    return Object.values(errors).every((error) => !error); // Returns true if no error messages
  };

  // Handle form submission to update the user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast.error("Please fix the errors before saving.");
      return;
    }
    if (!editingUser) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`${backendUrl}/api/admin/edit-guest`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          aToken,
        },
        body: JSON.stringify(editingUser),
      });

      const data = await response.json();

      if (data.success) {
        const updatedGuestList = guestUsers.map((user) =>
          user._id === data.data._id ? data.data : user
        );
        setGuestUsers(updatedGuestList);
        toast.success("Guest user updated successfully!");
        setIsEditModalOpen(false);
        setEditingUser(null);
      } else {
        toast.error(data.message || "Failed to update user.");
      }
    } catch (err) {
      toast.error("An error occurred while updating the user.");
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p>{error}</p>
            <button
              onClick={fetchGuestUsers}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Guest Users
                </h1>
                <p className="text-gray-600">
                  Manage and view all guest user accounts
                </p>
              </div>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-800">
                  {guestUsers.length}{" "}
                  {guestUsers.length === 1 ? "Guest" : "Guests"}
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, mobile, city, or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Guest Users List */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? "No guests found" : "No guest users yet"}
            </h3>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {filteredUsers.map((user, index) => {
              const isExpanded = expandedCards.has(index);
              return (
                <div
                  key={user._id}
                  className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-all flex flex-col ${
                    isExpanded ? "ring-2 ring-blue-500" : "border-gray-200"
                  }`}
                >
                  <div className="p-6 pb-4 flex-grow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg truncate">
                            {user.fullname || "N/A"}
                          </h3>
                          <p className="text-sm text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleCardExpansion(user._id, index)}
                        className="ml-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>
                    </div>

                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded
                          ? "max-h-96 opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      {/* ----- PASTE THIS ENTIRE BLOCK IN ----- */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                          <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                              Father's Name
                            </p>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.father || "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                          <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                              Mobile
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {user.contact?.mobileno?.code}{" "}
                              {user.contact?.mobileno?.number || "N/A"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-md">
                          <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0 mt-1" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                              Address
                            </p>
                            <div className="text-sm text-gray-900">
                              {user.address?.street &&
                                user.address.street !== "N/A" && (
                                  <p className="truncate">
                                    {user.address.street}
                                  </p>
                                )}
                              <p className="truncate">
                                {[
                                  user.address?.city !== "N/A"
                                    ? user.address?.city
                                    : "",
                                  user.address?.state !== "N/A"
                                    ? user.address?.state
                                    : "",
                                  user.address?.pin !== "N/A"
                                    ? user.address?.pin
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(", ") || "N/A"}
                              </p>
                              {user.address?.country &&
                                user.address.country !== "N/A" && (
                                  <p className="text-gray-600">
                                    {user.address.country}
                                  </p>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 uppercase tracking-wide">
                              Registered
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              {formatDate(user.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {/* ----- END OF BLOCK TO PASTE ----- */}
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Guest User
                      </span>
                      <button
                        onClick={() => handleEditClick(user)}
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- UPDATED EDIT MODAL WITH VALIDATION ---- */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                Edit Guest Details
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={handleUpdateUser}
              className="p-6 space-y-4 overflow-y-auto"
              noValidate
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullname"
                    value={editingUser.fullname}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.fullname && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.fullname}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Father's Name
                  </label>
                  <input
                    type="text"
                    name="father"
                    value={editingUser.father}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.father && (
                    <p className="text-red-500 text-xs mt-1">
                      {formErrors.father}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number
                </label>
                <div className="flex">
                  <input
                    type="text"
                    name="contact.mobileno.code"
                    value={editingUser.contact.mobileno.code}
                    onChange={handleFormChange}
                    className="w-1/4 px-3 py-2 border border-r-0 border-gray-300 rounded-l-md bg-gray-50"
                    readOnly
                  />
                  <input
                    type="text"
                    name="contact.mobileno.number"
                    value={editingUser.contact.mobileno.number}
                    onChange={handleFormChange}
                    className="w-3/4 px-3 py-2 border border-gray-300 rounded-r-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="10-digit number"
                  />
                </div>
                {formErrors["contact.mobileno.number"] && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors["contact.mobileno.number"]}
                  </p>
                )}
              </div>

              <div className="space-y-2 p-3 bg-gray-50 rounded-md border">
                <h3 className="font-medium text-gray-800">Address</h3>
                <input
                  type="text"
                  name="address.street"
                  placeholder="Street / Area"
                  value={editingUser.address.street}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {formErrors["address.street"] && (
                  <p className="text-red-500 text-xs mt-1">
                    {formErrors["address.street"]}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="text"
                      name="address.city"
                      placeholder="City"
                      value={editingUser.address.city}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    {formErrors["address.city"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors["address.city"]}
                      </p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      name="address.state"
                      placeholder="State"
                      value={editingUser.address.state}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    {formErrors["address.state"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors["address.state"]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="address.pin"
                    placeholder="PIN Code"
                    value={editingUser.address.pin}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="text"
                    name="address.country"
                    placeholder="Country"
                    value={editingUser.address.country}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </form>

            <div className="flex justify-end items-center p-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 mr-2"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleUpdateUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center"
                disabled={
                  isUpdating || Object.values(formErrors).some((error) => error)
                }
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestList;
