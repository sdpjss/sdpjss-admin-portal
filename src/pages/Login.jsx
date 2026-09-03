import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { AdminContext } from "../context/AdminContext.jsx";
import { useState } from "react";
import { useContext } from "react";
import { toast } from "react-toastify";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { setAToken, backendUrl, setRToken } = useContext(AdminContext);
  const onSubmitHandler = async (event) => {
    event.preventDefault();
    try {
      const { data } = await axios.post(backendUrl + "/api/admin/login", {
        email,
        password,
      });

      if (data.success) {
        data.role === "admin"
          ? localStorage.setItem("aToken", data.accesstoken)
          : localStorage.setItem("aToken", data.token);
        data.role === "admin" &&
          localStorage.setItem("rtoken", data.refreshToken);
        data.role === "admin"
          ? setAToken(data.accessToken)
          : setAToken(data.token);
        Date.role === "admin" && setRToken(data.refreshToken);
        // setAToken(data.token);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  return (
    <form onSubmit={onSubmitHandler} className="min-h-[80vh] flex items-center">
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border rounded-xl text-[#5E5E5E] text-sm shadow-lg">
        <p className="text-2xl font-semibold m-auto">
          <span className="text-primary">Admin</span> Login
        </p>
        <div className="w-full">
          <p>Email</p>
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            className="border border-[#DADADA] rounded w-full p-2 mt-1"
            type="email"
            required
          />
        </div>
        <div className="w-full relative">
          <p>Password</p>
          <input
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            className="border border-[#DADADA] rounded w-full p-2 mt-1 pr-10"
            type={showPassword ? "text" : "password"}
            required
          />
          <div
            className="absolute top-9 right-3 cursor-pointer"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </div>
        </div>
        <button className="bg-primary text-white w-full py-2 rounded-md text-base">
          Login
        </button>
      </div>
    </form>
  );
};

export default Login;
