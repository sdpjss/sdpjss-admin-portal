import { useContext } from "react";
import { assets } from "../assets/assets";
import { AdminContext } from "../context/AdminContext";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";

const Navbar = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const { aToken, setAToken } = useContext(AdminContext);
  const navigate = useNavigate();

  const logout = () => {
    navigate("/");
    aToken && setAToken("");
    aToken && localStorage.removeItem("aToken");
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-4 sm:px-6 lg:px-10 py-3 border-b bg-white shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile menu button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors duration-200"
        >
          {isSidebarOpen ? (
            <X className="w-5 h-5 text-gray-600" />
          ) : (
            <Menu className="w-5 h-5 text-gray-600" />
          )}
        </button>

        <div className="flex items-center gap-2 text-xs">
          {/* Show logo image on larger devices */}
          <img
            className="w-28 sm:w-36 lg:w-40 cursor-pointer hidden sm:block"
            src={assets.logo}
            alt="Logo"
          />
          {/* Show devi image on smaller devices */}
          <img
            className="w-8 cursor-pointer sm:hidden"
            src={assets.devi}
            alt="Devi"
          />
          <p className="border px-2 sm:px-2.5 py-0.5 rounded-full border-gray-500 text-gray-600 text-xs">
            Admin
          </p>
        </div>
      </div>

      <button
        onClick={logout}
        className="bg-primary text-white text-xs sm:text-sm px-4 sm:px-6 lg:px-10 py-2 rounded-full hover:bg-primary/90 transition-colors duration-200"
      >
        Logout
      </button>
    </div>
  );
};

export default Navbar;
