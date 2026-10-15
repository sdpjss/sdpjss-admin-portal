import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCw,
  Save,
  Scale,
  Search,
  Send,
  Truck,
} from "lucide-react";
import { toast } from "react-toastify";
import { AdminContext } from "../context/AdminContext";
import { formatPrasadWeight } from "../utils/prasadCalculation";

const typeLabels = {
  none: "None",
  halwa: "Mahaprasad (Halwa)",
  packet: "Packet",
  mixed: "Halwa and Packet",
};

const modeLabels = {
  none: "None",
  collection: "In-Person Collection",
  courier: "Courier",
};

const statusLabels = {
  pending: "Pending",
  ready: "Ready",
  dispatched: "Dispatched",
  fulfilled: "Fulfilled",
};

const statusStyles = {
  pending: "bg-amber-100 text-amber-700",
  ready: "bg-blue-100 text-blue-700",
  dispatched: "bg-purple-100 text-purple-700",
  fulfilled: "bg-emerald-100 text-emerald-700",
};

const SummaryCard = ({ label, value, icon, tone }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`rounded-lg p-3 ${tone}`}>{icon}</div>
    </div>
  </div>
);

const MahaprasadFulfillment = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("india");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    type: "all",
    mode: "all",
    location: "all",
    status: "all",
  });
  const [edits, setEdits] = useState({});
  const [savingId, setSavingId] = useState("");

  const loadRecords = useCallback(async () => {
    if (!aToken) return;
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `${backendUrl}/api/admin/mahaprasad-fulfillment`,
        { headers: { aToken }, params: { year } }
      );
      if (!response.data.success) {
        throw new Error(response.data.message || "Unable to load records.");
      }
      setData(response.data);
      setEdits(
        Object.fromEntries(
          response.data.records.map((record) => [
            `${record.donorType}:${record.donationId}`,
            {
              fulfillmentStatus: record.fulfillmentStatus,
              courierTrackingNumber: record.courierTrackingNumber || "",
            },
          ])
        )
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load Mahaprasad fulfilment records."
      );
    } finally {
      setLoading(false);
    }
  }, [aToken, backendUrl, year]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    setFilters({ type: "all", mode: "all", location: "all", status: "all" });
    setSearch("");
  }, [activeTab, year]);

  const tabRecords = useMemo(
    () =>
      (data?.records || []).filter((record) => record.region === activeTab),
    [activeTab, data]
  );

  const locations = useMemo(() => {
    const field = activeTab === "india" ? "state" : "country";
    return [...new Set(tabRecords.map((record) => record[field]).filter(Boolean))].sort(
      (first, second) => first.localeCompare(second)
    );
  }, [activeTab, tabRecords]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    const locationField = activeTab === "india" ? "state" : "country";
    return tabRecords.filter((record) => {
      if (filters.type !== "all" && record.fulfillmentType !== filters.type) {
        return false;
      }
      if (filters.mode !== "all" && record.fulfillmentMode !== filters.mode) {
        return false;
      }
      if (
        filters.location !== "all" &&
        record[locationField] !== filters.location
      ) {
        return false;
      }
      if (
        filters.status !== "all" &&
        record.fulfillmentStatus !== filters.status
      ) {
        return false;
      }
      if (!query) return true;
      return [
        record.receiptId,
        record.fullName,
        record.courierTrackingNumber,
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [activeTab, filters, search, tabRecords]);

  const updateEdit = (record, field, value) => {
    const key = `${record.donorType}:${record.donationId}`;
    setEdits((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  };

  const saveRecord = async (record) => {
    const key = `${record.donorType}:${record.donationId}`;
    const edit = edits[key];
    setSavingId(key);
    try {
      const response = await axios.put(
        `${backendUrl}/api/admin/mahaprasad-fulfillment/${record.donorType}/${record.donationId}`,
        edit,
        { headers: { aToken } }
      );
      if (!response.data.success) {
        throw new Error(response.data.message || "Unable to update fulfilment.");
      }
      toast.success(response.data.message);
      await loadRecords();
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to update fulfilment."
      );
    } finally {
      setSavingId("");
    }
  };

  const summary = data?.summary || {};
  const years = Array.from(
    { length: currentYear - 1999 },
    (_, index) => currentYear - index
  );

  return (
    <div className="flex-grow space-y-6 bg-gray-50 p-4 md:p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mahaprasad Fulfilment
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Track preparation, collection, dispatch, and delivery of Mahaprasad.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              aria-label="Donation year"
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadRecords}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <SummaryCard
          label="Total"
          value={summary.total || 0}
          icon={<Truck size={21} className="text-slate-700" />}
          tone="bg-slate-100"
        />
        <SummaryCard
          label="Pending"
          value={summary.pending || 0}
          icon={<Clock3 size={21} className="text-amber-700" />}
          tone="bg-amber-100"
        />
        <SummaryCard
          label="Ready"
          value={summary.ready || 0}
          icon={<Package size={21} className="text-blue-700" />}
          tone="bg-blue-100"
        />
        <SummaryCard
          label="Dispatched"
          value={summary.dispatched || 0}
          icon={<Send size={21} className="text-purple-700" />}
          tone="bg-purple-100"
        />
        <SummaryCard
          label="Fulfilled"
          value={summary.fulfilled || 0}
          icon={<CheckCircle2 size={21} className="text-emerald-700" />}
          tone="bg-emerald-100"
        />
        <SummaryCard
          label="Mahaprasad"
          value={formatPrasadWeight(summary.totalGrams || 0)}
          icon={<Scale size={21} className="text-orange-700" />}
          tone="bg-orange-100"
        />
        <SummaryCard
          label="Packets"
          value={Number(summary.totalPackets || 0).toLocaleString("en-IN")}
          icon={<Package size={21} className="text-pink-700" />}
          tone="bg-pink-100"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 pt-4">
          <div className="flex gap-6">
            {[
              ["india", "India", summary.india || 0],
              ["outside_india", "Outside India", summary.outside_india || 0],
            ].map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveTab(value)}
                className={`border-b-2 px-1 pb-3 text-sm font-semibold ${
                  activeTab === value
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-gray-200 p-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="relative block">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Receipt, name or tracking"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <select
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({ ...current, type: event.target.value }))
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            aria-label="Fulfilment type filter"
          >
            <option value="all">All fulfilment types</option>
            <option value="halwa">Mahaprasad (Halwa)</option>
            <option value="packet">Packet</option>
            <option value="mixed">Halwa and Packet</option>
          </select>
          <select
            value={filters.mode}
            onChange={(event) =>
              setFilters((current) => ({ ...current, mode: event.target.value }))
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            aria-label="Fulfilment mode filter"
          >
            <option value="all">All fulfilment modes</option>
            <option value="collection">In-Person Collection</option>
            <option value="courier">Courier</option>
          </select>
          <select
            value={filters.location}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                location: event.target.value,
              }))
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            aria-label={`${activeTab === "india" ? "State" : "Country"} filter`}
          >
            <option value="all">
              All {activeTab === "india" ? "states" : "countries"}
            </option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            aria-label="Fulfilment status filter"
          >
            <option value="all">All fulfilment statuses</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading records…</div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={loadRecords}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Receipt Number</th>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Mahaprasad</th>
                  <th className="px-4 py-3">Packet</th>
                  <th className="px-4 py-3">Fulfilment Type</th>
                  <th className="px-4 py-3">Fulfilment Mode</th>
                  <th className="px-4 py-3">
                    {activeTab === "india" ? "State" : "Country"}
                  </th>
                  <th className="px-4 py-3">Fulfilment Status</th>
                  <th className="px-4 py-3">Courier Tracking Number</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {visibleRecords.map((record) => {
                  const key = `${record.donorType}:${record.donationId}`;
                  const edit = edits[key] || {
                    fulfillmentStatus: record.fulfillmentStatus,
                    courierTrackingNumber: record.courierTrackingNumber || "",
                  };
                  const hasChanges =
                    edit.fulfillmentStatus !== record.fulfillmentStatus ||
                    edit.courierTrackingNumber !==
                      (record.courierTrackingNumber || "");
                  return (
                    <tr key={key} className="align-top hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-900">
                        {record.receiptId || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {record.fullName}
                        </p>
                        <p className="mt-1 text-xs capitalize text-gray-500">
                          {record.donorType}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                        {formatPrasadWeight(record.grams)}
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        {Number(record.packets || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                        {typeLabels[record.fulfillmentType] || record.fulfillmentType}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                        {modeLabels[record.fulfillmentMode] || record.fulfillmentMode}
                      </td>
                      <td className="px-4 py-4 text-gray-700">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400" />
                          {(activeTab === "india" ? record.state : record.country) ||
                            "Not provided"}
                        </span>
                      </td>
                      <td className="min-w-48 px-4 py-4">
                        <select
                          value={edit.fulfillmentStatus}
                          onChange={(event) =>
                            updateEdit(
                              record,
                              "fulfillmentStatus",
                              event.target.value
                            )
                          }
                          className={`w-full rounded-lg border-0 px-3 py-2 text-xs font-semibold ${statusStyles[edit.fulfillmentStatus]}`}
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option
                              key={value}
                              value={value}
                              disabled={
                                value === "dispatched" &&
                                record.fulfillmentMode !== "courier"
                              }
                            >
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="min-w-64 px-4 py-4">
                        <input
                          value={edit.courierTrackingNumber}
                          onChange={(event) =>
                            updateEdit(
                              record,
                              "courierTrackingNumber",
                              event.target.value
                            )
                          }
                          disabled={record.fulfillmentMode !== "courier"}
                          maxLength="100"
                          placeholder={
                            record.fulfillmentMode === "courier"
                              ? "Enter tracking number"
                              : "Not applicable"
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => saveRecord(record)}
                          disabled={!hasChanges || savingId === key}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Save size={14} />
                          {savingId === key ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!visibleRecords.length && (
                  <tr>
                    <td colSpan="10" className="px-4 py-12 text-center text-gray-500">
                      No fulfilment records match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MahaprasadFulfillment;
