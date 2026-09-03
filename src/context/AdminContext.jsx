import axios from "axios";
import { useCallback, useEffect } from "react";
import { useState } from "react";
import { createContext } from "react";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

export const AdminContext = createContext();

const AdminContextProvider = (props) => {
  const [aToken, setAToken] = useState(
    localStorage.getItem("aToken") ? localStorage.getItem("aToken") : ""
  );
  const [adminRole, setAdminRole] = useState(null);
  const [allowedFeatures, setAllowedFeatures] = useState([]);
  const [adminName, setAdminName] = useState(null); // <-- Add new state for name

  const [guestUserList, setGuestUserList] = useState([]);
  const [guestUserCount, setGuestUserCount] = useState(0);
  // New state variables for lists and counts
  const [familyCount, setFamilyCount] = useState(0);
  const [userList, setUserList] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [staffRequirementList, setStaffRequirementList] = useState([]);
  const [staffRequirementCount, setStaffRequirementCount] = useState(0);
  const [jobOpeningList, setJobOpeningList] = useState([]);
  const [jobOpeningCount, setJobOpeningCount] = useState(0);
  const [advertisementList, setAdvertisementList] = useState([]);
  const [advertisementCount, setAdvertisementCount] = useState(0);
  const [totalDonation, setTotalDonation] = useState(0);
  const [adminStats, setAdminStats] = useState({});

  const [noticeList, setNoticeList] = useState([]);
  const [noticeCount, setNoticeCount] = useState(0);

  const [usersList, setUsersList] = useState([]);
  const [childUserList, setChildUserList] = useState([]);

  const [isLiveApproved, setIsLiveApproved] = useState(true);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [rToken, setRToken] = useState(localStorage.getItem("rtoken"));
  // New function to handle token refresh
  const refreshAccessToken = useCallback(async () => {
    if (!rToken) {
      console.error("No refresh token available, forcing logout.");
      return logout();
    }

    try {
      const response = await axios.post(
        `${backendUrl}/api/admin/refresh-token`,
        { refreshToken: rToken }
      );
      const data = response.data;

      if (data.success) {
        localStorage.setItem("aToken", data.accessToken);
        setAToken(data.accessToken);
        return data.accessToken;
      } else {
        console.error("Refresh token failed:", data.message);
        return logout();
      }
    } catch (error) {
      console.error("Token refresh API call failed:", error);
      return logout();
    }
  }, [rToken, backendUrl]);

  const checkLiveApprovalStatus = async () => {
    // Decode the token to get the admin's ID
    if (!aToken) {
      setIsLiveApproved(false);
      return;
    }
    const decodedToken = jwtDecode(aToken);
    const adminId = decodedToken.id;

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/check-status`, // Use your new API endpoint
        { id: adminId },
        { headers: { aToken } }
      );

      if (data.success && !data.isApproved) {
        // If the database says they are not approved, update state
        setIsLiveApproved(false);
      } else {
        setIsLiveApproved(true);
      }
    } catch (error) {
      console.error("Failed to check live approval status:", error);
      setIsLiveApproved(false); // Assume unapproved on error
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (aToken) {
        checkLiveApprovalStatus();
      }
    }, 30000); // Check every 30 seconds

    // Clean up the interval on component unmount
    return () => clearInterval(interval);
  }, [aToken]);

  // New function to handle logout
  const logout = () => {
    localStorage.removeItem("aToken");
    localStorage.removeItem("rtoken");
    setAToken("");
    setRToken("");
    setAdminRole(null);
    setAllowedFeatures([]);
    setAdminName(null);
    // Any other state clearing
  };
  useEffect(() => {
    const decodeToken = async () => {
      if (aToken) {
        localStorage.setItem("aToken", aToken);
        try {
          const decodedToken = jwtDecode(aToken);
          setAdminRole(decodedToken.role);
          setAllowedFeatures(decodedToken.allowedFeatures || []);
          setAdminName(decodedToken.name || "SDPJSS Office");

          const currentTime = Date.now() / 1000;
          // Check if token is expired or will expire in 60 seconds
          if (decodedToken.exp < currentTime + 60) {
            console.log("Access token expiring soon. Attempting refresh...");
            await refreshAccessToken();
          }
        } catch (error) {
          // If jwtDecode throws an error, it's likely expired or invalid
          if (error.name === "TokenExpiredError") {
            console.log("Access token expired. Attempting refresh...");
            await refreshAccessToken();
          } else {
            console.error("Invalid token:", error);
            logout();
          }
        }
      } else {
        // Clear all auth-related state on logout
        setAdminRole(null);
        setAllowedFeatures([]);
        setAdminName(null);
        localStorage.removeItem("aToken");
      }
    };

    decodeToken();
  }, [aToken, refreshAccessToken]);

  // New function to wrap all Axios calls
  const axiosWithAuth = useCallback(
    async (method, url, data = null, headers = {}) => {
      try {
        const tokenToUse = aToken;
        const response = await axios({
          method,
          url: `${backendUrl}${url}`,
          data,
          headers: {
            ...headers,
            aToken: tokenToUse,
          },
        });
        return response.data;
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // Handle 401 Unauthorized for expired token
          const newToken = await refreshAccessToken();
          if (newToken) {
            // Retry the original request with the new token
            const retryResponse = await axios({
              method,
              url: `${backendUrl}${url}`,
              data,
              headers: {
                ...headers,
                aToken: newToken,
              },
            });
            return retryResponse.data;
          }
        }
        // Handle other errors
        throw error;
      }
    },
    [aToken, backendUrl, refreshAccessToken]
  );

  // NEW: Function to get all guest users
  const getGuestUserList = async () => {
    if (!aToken) return;
    try {
      const { data } = await axios.get(
        backendUrl + "/api/additional/all-guest-users",
        {
          headers: { aToken },
        }
      );

      if (data.success) {
        setGuestUserList(data.guestUsers);
        setGuestUserCount(data.count);
        return data;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getChildUserList = useCallback(async () => {
    if (!aToken) return;
    try {
      const response = await fetch(`${backendUrl}/api/admin/child/all`, {
        headers: {
          aToken,
        },
      });
      const data = await response.json();

      if (data.success) {
        setChildUserList(data.data || []);
      } else {
        console.error("Failed to fetch child users:", data.message);
        setChildUserList([]);
      }
    } catch (error) {
      console.error("Error fetching child user list:", error);
    }
  }, [aToken, backendUrl]);

  // Get family list with count
  const getFamilyList = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/family-list", {
        headers: { aToken },
      });
      if (data.success) {
        return data;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };
  useEffect(() => {
    if (aToken) {
      getUserList();
      getGuestUserList();
      // Fetch guest users on load
      // ... any other initial fetches
    }
  }, [aToken]);
  // Load users by khandan ID for father selection
  const loadUsersByKhandan = async (khandanId) => {
    try {
      const { data } = await axios.get(
        backendUrl + `/api/user/get-by-khandan/${khandanId}`
      );

      if (data.success) {
        // Filter male users for father selection
        const maleUsers = data.users.filter((user) => user.gender === "male");
        setUsersList(maleUsers);
      } else {
        toast.error(data.message);
        setUsersList([]);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
      setUsersList([]);
    }
  };

  // Get user list with count
  const getUserList = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/user-list", {
        headers: { aToken },
      });
      if (data.success) {
        setUserList(data.users);
        setUserCount(data.count);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Get staff requirement list with count
  const getStaffRequirementList = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/admin/staff-requirement",
        { headers: { aToken } }
      );
      if (data.success) {
        setStaffRequirementList(data.staffRequirements);
        setStaffRequirementCount(data.count);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Get job opening list with count
  const getJobOpeningList = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/job-opening", {
        headers: { aToken },
      });
      if (data.success) {
        setJobOpeningList(data.jobOpenings);
        setJobOpeningCount(data.count);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Get advertisement list with count
  const getAdvertisementList = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/admin/advertisement",
        { headers: { aToken } }
      );
      if (data.success) {
        setAdvertisementList(data.advertisements);
        setAdvertisementCount(data.count);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Get family count only
  const getFamilyCountOnly = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/family-count", {
        headers: { aToken },
      });
      if (data.success) {
        setFamilyCount(data.count);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Get user count with details
  const getUserCountDetails = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/user-count", {
        headers: { aToken },
      });
      if (data.success) {
        setUserCount(data.totalUsers);

        return data; // Return for additional details if needed
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Get total donation amount
  const getTotalDonationData = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/admin/donation-stats",
        { headers: { aToken } }
      );
      if (data.success) {
        setTotalDonation(data.totalAmount);

        return data; // Return for additional donation details
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const [donationList, setDonationList] = useState([]);

  const getDonationList = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/admin/donation-list",
        {
          headers: { aToken },
        }
      );

      if (data.success) {
        setDonationList(data.donations);
        console.log(data.donations);
        return data;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Get comprehensive admin statistics
  const getAdminStats = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/stats", {
        headers: { aToken },
      });
      if (data.success) {
        setAdminStats(data.stats);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Update user approval status
  const updateUserApproval = async (userId, status) => {
    try {
      const { data } = await axios.put(
        backendUrl + "/api/admin/update-user-status",
        { userId, isApproved: status },
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success(data.message);

        // Refresh user list after update
        await getUserList();
        return data;
      } else {
        toast.error(data.message);
        return { success: false };
      }
    } catch (error) {
      toast.error(error.message);
      return { success: false };
    }
  };

  // Get notice list with count
  const getNoticeList = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/notice-list", {
        headers: { aToken },
      });
      if (data.success) {
        setNoticeList(data.notices);
        setNoticeCount(data.count);

        return data;
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // Add a new notice
  const addNotice = async (noticeData) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/admin/add-notice",
        noticeData,
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        // Refresh notice list after adding
        await getNoticeList();
        return data;
      } else {
        toast.error(data.message);
        return { success: false };
      }
    } catch (error) {
      toast.error(error.message);
      return { success: false };
    }
  };

  // Update a notice
  const updateNotice = async (noticeId, noticeData) => {
    try {
      const { data } = await axios.put(
        backendUrl + `/api/admin/update-notice/${noticeId}`,
        noticeData,
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        // Refresh notice list after updating
        await getNoticeList();
        return data;
      } else {
        toast.error(data.message);
        return { success: false };
      }
    } catch (error) {
      toast.error(error.message);
      return { success: false };
    }
  };

  // Delete a notice
  const deleteNotice = async (noticeId) => {
    try {
      const { data } = await axios.delete(
        backendUrl + `/api/admin/delete-notice/${noticeId}`,
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        // Refresh notice list after deleting
        await getNoticeList();
        return data;
      } else {
        toast.error(data.message);
        return { success: false };
      }
    } catch (error) {
      toast.error(error.message);
      return { success: false };
    }
  };

  // Function to format numbers in Indian Rupee standard
  const formatIndianCommas = (num) => {
    if (num === null || num === undefined) {
      return "";
    }
    const parts = num.toString().split(".");
    let integerPart = parts[0];
    let lastThree = integerPart.substring(integerPart.length - 3);
    let otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== "") {
      lastThree = "," + lastThree;
    }
    let formattedNumber =
      otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
    if (parts.length > 1) {
      formattedNumber += "." + parts[1];
    }
    return formattedNumber;
  };
  const capitalizeEachWord = (str) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Khandan and users data for registration
  const [khandanList, setKhandanList] = useState([]);
  // const [usersList, setUsersList] = useState([]);

  // Load all khandans for registration dropdown
  const loadKhandans = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/khandan/allKhandan");

      if (data.success) {
        setKhandanList(data.khandans);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  // Get khandan by ID
  const getKhandanById = async (khandanId) => {
    try {
      const { data } = await axios.get(
        backendUrl + `/api/khandan/get-khandan/${khandanId}`
      );
      if (data.success) {
        return data.khandan;
      } else {
        toast.error(data.message);
        return null;
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
      return null;
    }
  };

  const value = {
    aToken,
    setAToken,
    rToken,
    setRToken,
    // Make sure you provide the logout function to your components
    logout,
    // Provide the new authenticated axios wrapper
    axiosWithAuth,
    backendUrl,
    formatIndianCommas,
    capitalizeEachWord,

    // Family related
    familyCount,
    getFamilyList,
    getFamilyCountOnly,

    // User related
    userList,
    userCount,
    getUserList,
    getUserCountDetails,

    // Staff requirement related
    staffRequirementList,
    staffRequirementCount,
    getStaffRequirementList,

    // Job opening related
    jobOpeningList,
    jobOpeningCount,
    getJobOpeningList,

    // Advertisement related
    advertisementList,
    advertisementCount,
    getAdvertisementList,

    // Donation related
    totalDonation,
    getTotalDonationData,

    // Admin statistics
    adminStats,
    getAdminStats,
    updateUserApproval,
    getGuestUserList,

    // Notice related
    noticeList,
    noticeCount,
    getNoticeList,
    addNotice,
    updateNotice,
    deleteNotice,

    donationList,
    getDonationList,
    loadUsersByKhandan,
    usersList,
    khandanList,
    loadKhandans,
    getKhandanById,
    guestUserList,
    guestUserCount,
    adminRole,
    allowedFeatures,
    adminName,
    isLiveApproved,

    childUserList,
    getChildUserList,
  };

  return (
    <AdminContext.Provider value={value}>
      {props.children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;
