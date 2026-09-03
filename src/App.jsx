import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useContext } from "react";
import { AdminContext } from "./context/AdminContext";
import { jwtDecode } from "jwt-decode";

import Login from "./pages/Login";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import KhandanList from "./pages/KhandanList";
import UserList from "./pages/UserList";
import StaffRequirementList from "./pages/StaffRequirementList";
import JobOpeningList from "./pages/JobOpeningList";
import AdvertisementList from "./pages/AdvertisementList";
import DonationList from "./pages/DonationList";
import NoticeBoard from "./pages/NoticeBoard";
import ManageTeam from "./pages/ManageTeam";
import ScrollToTop from "./components/ScrollToTop";
import DonationCategory from "./pages/DonationCategory";
import Receipt from "./pages/Receipt";
import FamilyTree from "./pages/FamilyTree";
import GuestReceipt from "./pages/GuestReceipt";
import ManageFeatures from "./pages/ManageFeatures";
import ManageAdmins from "./pages/ManageAdmins";
import GuestList from "./pages/GuestList";
import PrintingPortal from "./pages/PrintingPortal";
import RefundPage from "./pages/RefundPage";
import TodoApp from "./pages/TodoListManager";

const App = () => {
  const { aToken, setAToken, isLiveApproved } = useContext(AdminContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState("admin");

  const navigate = useNavigate();

  useEffect(() => {
    if (aToken) {
      try {
        const decodedToken = jwtDecode(aToken);

        setRole(decodedToken.role);
      } catch (error) {
        console.error("Failed to decode token", error);
        setAToken(null); // Clear invalid token
      }
    }
  }, [aToken, setAToken]);

  const isBlocked = role !== "superadmin" && aToken && !isLiveApproved;

  // Auto logout when blocked
  useEffect(() => {
    if (isBlocked) {
      const timer = setTimeout(() => {
        handleLogout();
      }, 10000); // Auto logout after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isBlocked]);

  const handleLogout = () => {
    localStorage.removeItem("atoken");
    setAToken(null);
    navigate("/login", { replace: true }); // Use replace to prevent back navigation
  };

  if (isBlocked) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 text-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Account Blocked
          </h2>
          <p className="text-gray-700 mb-4">
            Your admin access has been revoked. You can no longer perform any
            tasks.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Redirecting to login in 3 seconds...
          </p>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white font-semibold py-2 px-6 rounded-md hover:bg-red-600 transition-colors"
          >
            Logout Now
          </button>
        </div>
      </div>
    );
  }

  return aToken ? (
    <div className="bg-[#F8F9FD] min-h-screen">
      <ToastContainer />
      <Navbar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <div className="relative pt-16">
        <ScrollToTop />
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
        <div className="lg:ml-80 min-h-[calc(100vh-4rem)] p-4 sm:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/khandan-list" element={<KhandanList />} />
            <Route path="/user-list" element={<UserList />} />
            <Route
              path="/staff-requirement-list"
              element={<StaffRequirementList />}
            />
            <Route path="/job-opening-list" element={<JobOpeningList />} />
            <Route path="/advertisement-list" element={<AdvertisementList />} />
            <Route path="/donation-list" element={<DonationList />} />
            <Route path="/notice-board" element={<NoticeBoard />} />
            <Route path="/manage-team" element={<ManageTeam />} />
            <Route path="/donation-categories" element={<DonationCategory />} />
            <Route path="/receipt" element={<Receipt />} />
            <Route path="/family-tree" element={<FamilyTree />} />
            <Route path="/guest-donations" element={<GuestReceipt />} />
            <Route path="/manage-features" element={<ManageFeatures />} />
            <Route path="/manage-admins" element={<ManageAdmins />} />
            <Route path="/guest-list" element={<GuestList />} />
            <Route path="/printing-portal" element={<PrintingPortal />} />
            <Route path="/refund-page" element={<RefundPage />} />
            <Route path="/todo-page" element={<TodoApp />} />
          </Routes>
        </div>
      </div>
    </div>
  ) : (
    <>
      <Login />
      <ToastContainer />
    </>
  );
};

export default App;
