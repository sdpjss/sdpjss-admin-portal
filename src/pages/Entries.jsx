import { useEffect, useContext, useState } from "react";
import { AdminContext } from "../context/AdminContext";
import { ChevronDown, ChevronUp } from "lucide-react";
import * as XLSX from "xlsx";

const Entries = () => {
  const { aToken, entries, getAllEntries } = useContext(AdminContext);
  const [expandedRows, setExpandedRows] = useState({});
  const [filter, setFilter] = useState("all"); // State for selected filter

  useEffect(() => {
    if (aToken) {
      getAllEntries();
    }
  }, [aToken]);

  const toggleRow = (index) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Filter the entries based on the selected filter
  const filteredEntries = entries.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  // Export filtered data to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredEntries);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entries");
    XLSX.writeFile(workbook, "entries_data.xlsx");
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-3 space-y-3 md:space-y-0">
        <p className="text-lg font-medium">All Entries</p>
        <div className="flex flex-col md:flex-row gap-2">
          {/* Filter Buttons */}
          <button
            className={`px-4 py-2 text-sm font-medium rounded ${
              filter === "all" ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded ${
              filter === "delivery" ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setFilter("delivery")}
          >
            Delivery
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded ${
              filter === "takeaway" ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setFilter("takeaway")}
          >
            Takeaway
          </button>

          {/* Export Button */}
          <button
            className="px-4 py-2 text-sm font-medium bg-green-500 text-white rounded"
            onClick={exportToExcel}
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-auto bg-white border rounded text-sm max-h-[80vh] min-h-[60vh]">
        <div className="grid grid-cols-[0.5fr_1fr_1fr_2fr_1fr_1fr_2fr_2fr_1fr] py-3 px-6 border-b gap-4">
          <p>#</p>
          <p>Name</p>
          <p>Parent</p>
          <p>Email</p>
          <p>Mobile</p>
          <p>Identity</p>
          <p>Id Number</p>
          <p>Address</p>
          <p>Amount</p>
        </div>
        {filteredEntries.map((item, index) => (
          <div
            className="grid grid-cols-[0.5fr_1fr_1fr_2fr_1fr_1fr_2fr_2fr_1fr] gap-4 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50"
            key={index}
          >
            <p>{index + 1}</p>
            <p>{item.fullname}</p>
            <p>{item.parent}</p>
            <p className="overflow-auto whitespace-nowrap">{item.email}</p>
            <p>{item.mobile}</p>
            <p>{item.identity}</p>
            <p>{item.idnumber}</p>
            <p className="overflow-auto whitespace-nowrap">
              {item.streetname}, {item.district}, {item.state}, {item.country} -{" "}
              {item.pin}
            </p>
            <p>{item.amount}</p>
          </div>
        ))}
      </div>

      {/* Mobile View */}
      <div className="md:hidden bg-white border rounded text-sm max-h-[80vh] min-h-[60vh] overflow-auto">
        {filteredEntries.map((item, index) => (
          <div key={index} className="border-b">
            <div
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleRow(index)}
            >
              <div className="flex-1">
                <p className="font-medium">{item.fullname}</p>
                <p className="text-gray-500 text-xs">
                  {item.category + " | Rs. " + item.amount}
                </p>
              </div>
              {expandedRows[index] ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </div>

            {expandedRows[index] && (
              <div className="px-4 pb-4 space-y-2 text-gray-500">
                <div className="grid grid-cols-2 gap-2">
                  <p className="text-xs font-medium">Parent:</p>
                  <p className="text-xs">{item.parent}</p>

                  <p className="text-xs font-medium">Mobile:</p>
                  <p className="text-xs">{item.mobile}</p>

                  <p className="text-xs font-medium">Identity:</p>
                  <p className="text-xs">{item.identity}</p>

                  <p className="text-xs font-medium">ID Number:</p>
                  <p className="text-xs">{item.idnumber}</p>

                  <p className="text-xs font-medium">Amount:</p>
                  <p className="text-xs">{item.amount}</p>
                </div>

                <div>
                  <p className="text-xs font-medium">Address:</p>
                  <p className="text-xs mt-1">
                    {item.streetname}, {item.district}, {item.state},{" "}
                    {item.country} - {item.pin}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Entries;
