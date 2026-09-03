import { useState, useEffect } from "react";
import {
  ChevronDown,
  Users,
  User,
  Heart,
  Phone,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";

const FamilyTree = () => {
  const [khandans, setKhandans] = useState([]);
  const [selectedKhandan, setSelectedKhandan] = useState("");
  const [familyTree, setFamilyTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  // Mock data for demonstration
  const mockKhandans = [
    { _id: "1", name: "Sharma Family", gotra: "Bharadwaj", khandanid: "KH001" },
    { _id: "2", name: "Gupta Family", gotra: "Kashyap", khandanid: "KH002" },
    {
      _id: "3",
      name: "Verma Family",
      gotra: "Vishwamitra",
      khandanid: "KH003",
    },
  ];

  const mockUsers = [
    {
      _id: "1",
      fullname: "Rajesh Sharma",
      id: "U001",
      fatherid: "",
      gender: "male",
      dob: "1950-01-15",
      khandanid: "1",
      marriage: { maritalstatus: "married", spouse: ["Sunita Sharma"] },
      contact: {
        email: "rajesh@email.com",
        mobileno: { number: "9876543210" },
      },
      address: { city: "Delhi", state: "Delhi" },
      profession: { job: "Teacher" },
      islive: true,
      isComplete: true,
    },
    {
      _id: "2",
      fullname: "Sunita Sharma",
      id: "U002",
      fatherid: "",
      gender: "female",
      dob: "1955-03-20",
      khandanid: "1",
      marriage: { maritalstatus: "married", spouse: ["Rajesh Sharma"] },
      contact: {
        email: "sunita@email.com",
        mobileno: { number: "9876543211" },
      },
      address: { city: "Delhi", state: "Delhi" },
      profession: { job: "Homemaker" },
      islive: true,
      isComplete: true,
    },
    {
      _id: "3",
      fullname: "Amit Sharma",
      id: "U003",
      fatherid: "U001",
      gender: "male",
      dob: "1980-07-10",
      khandanid: "1",
      marriage: { maritalstatus: "married", spouse: ["Priya Sharma"] },
      contact: { email: "amit@email.com", mobileno: { number: "9876543212" } },
      address: { city: "Mumbai", state: "Maharashtra" },
      profession: { job: "Engineer" },
      islive: true,
      isComplete: true,
    },
    {
      _id: "4",
      fullname: "Priya Sharma",
      id: "U004",
      fatherid: "",
      gender: "female",
      dob: "1985-12-05",
      khandanid: "1",
      marriage: { maritalstatus: "married", spouse: ["Amit Sharma"] },
      contact: { email: "priya@email.com", mobileno: { number: "9876543213" } },
      address: { city: "Mumbai", state: "Maharashtra" },
      profession: { job: "Doctor" },
      islive: true,
      isComplete: true,
    },
    {
      _id: "5",
      fullname: "Arjun Sharma",
      id: "U005",
      fatherid: "U003",
      gender: "male",
      dob: "2010-04-18",
      khandanid: "1",
      marriage: { maritalstatus: "unmarried", spouse: [] },
      contact: { email: "", mobileno: { number: "0000000000" } },
      address: { city: "Mumbai", state: "Maharashtra" },
      profession: { job: "Student" },
      islive: true,
      isComplete: true,
    },
  ];

  useEffect(() => {
    // Simulate API call to fetch khandans
    setKhandans(mockKhandans);
  }, []);

  const buildFamilyTree = (users) => {
    const userMap = new Map();
    const roots = [];

    // Create user map
    users.forEach((user) => {
      userMap.set(user.id, { ...user, children: [] });
    });

    // Build tree structure
    users.forEach((user) => {
      if (user.fatherid && userMap.has(user.fatherid)) {
        userMap.get(user.fatherid).children.push(userMap.get(user.id));
      } else if (!user.fatherid) {
        roots.push(userMap.get(user.id));
      }
    });

    return roots;
  };

  const handleKhandanSelect = async (khandanId) => {
    setSelectedKhandan(khandanId);
    setLoading(true);

    try {
      // Simulate API call to fetch users for selected khandan
      const filteredUsers = mockUsers.filter(
        (user) => user.khandanid === khandanId
      );
      const tree = buildFamilyTree(filteredUsers);
      setFamilyTree(tree);
    } catch (error) {
      console.error("Error fetching family tree:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (userId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedNodes(newExpanded);
  };

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  const UserCard = ({ user, level = 0 }) => {
    const isExpanded = expandedNodes.has(user.id);
    const hasChildren = user.children && user.children.length > 0;

    return (
      <div className="relative">
        <div
          className={`bg-white rounded-lg shadow-md border-2 p-4 mb-4 transition-all duration-300 hover:shadow-lg ${
            user.gender === "male" ? "border-blue-200" : "border-pink-200"
          }`}
          style={{ marginLeft: `${level * 40}px` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  user.gender === "male" ? "bg-blue-100" : "bg-pink-100"
                }`}
              >
                <User
                  className={`w-6 h-6 ${
                    user.gender === "male" ? "text-blue-600" : "text-pink-600"
                  }`}
                />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  {user.fullname}
                </h3>
                <p className="text-sm text-gray-600">ID: {user.id}</p>
                <p className="text-sm text-gray-600">
                  Age: {calculateAge(user.dob)}
                </p>
              </div>
            </div>

            {hasChildren && (
              <button
                onClick={() => toggleNode(user.id)}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                {isExpanded ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {user.marriage.maritalstatus === "married" && (
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-gray-700">
                  Spouse: {user.marriage.spouse.join(", ")}
                </span>
              </div>
            )}

            {user.contact.mobileno.number !== "0000000000" && (
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-green-500" />
                <span className="text-gray-700">
                  {user.contact.mobileno.number}
                </span>
              </div>
            )}

            {user.address.city && (
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700">
                  {user.address.city}, {user.address.state}
                </span>
              </div>
            )}

            {user.profession.job && (
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-gray-700">{user.profession.job}</span>
              </div>
            )}
          </div>

          <div className="mt-2 flex space-x-2">
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                user.islive
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {user.islive ? "Living" : "Deceased"}
            </span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                user.isComplete
                  ? "bg-blue-100 text-blue-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {user.isComplete ? "Complete" : "Incomplete"}
            </span>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-8 border-l-2 border-gray-200 pl-4">
            {user.children.map((child) => (
              <UserCard key={child.id} user={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const selectedKhandanData = khandans.find((k) => k._id === selectedKhandan);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-600" />
            Family Tree Admin Portal
          </h1>

          <div className="mb-6">
            <label
              htmlFor="khandan-select"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Khandan
            </label>
            <div className="relative">
              <select
                id="khandan-select"
                value={selectedKhandan}
                onChange={(e) => handleKhandanSelect(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
              >
                <option value="">Choose a khandan...</option>
                {khandans.map((khandan) => (
                  <option key={khandan._id} value={khandan._id}>
                    {khandan.name} - {khandan.gotra} ({khandan.khandanid})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {selectedKhandanData && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h2 className="text-xl font-semibold text-blue-800 mb-2">
                {selectedKhandanData.name}
              </h2>
              <p className="text-blue-700">
                <strong>Gotra:</strong> {selectedKhandanData.gotra} |
                <strong> Khandan ID:</strong> {selectedKhandanData.khandanid}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading family tree...</p>
          </div>
        ) : familyTree.length > 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Family Tree</h2>
              <p className="text-sm text-gray-600">
                Click the eye icon to expand/collapse family branches
              </p>
            </div>

            <div className="space-y-4">
              {familyTree.map((rootUser) => (
                <UserCard key={rootUser.id} user={rootUser} />
              ))}
            </div>
          </div>
        ) : selectedKhandan ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No Family Members Found
            </h3>
            <p className="text-gray-500">
              This khandan doesn't have any registered members yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Select a Khandan
            </h3>
            <p className="text-gray-500">
              Choose a khandan from the dropdown to view its family tree.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FamilyTree;
