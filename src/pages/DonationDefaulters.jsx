import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  BadgeIndianRupee,
  CheckCircle2,
  Search,
  ShieldCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AdminContext } from "../context/AdminContext";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const statusStyles = {
  paid: "bg-emerald-100 text-emerald-700",
  defaulter: "bg-red-100 text-red-700",
  exempt: "bg-amber-100 text-amber-700",
};

const SummaryCard = ({ label, value, icon, tone }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      </div>
      <div className={`rounded-lg p-3 ${tone}`}>{icon}</div>
    </div>
  </div>
);

const DonationDefaulters = () => {
  const navigate = useNavigate();
  const { backendUrl, aToken } = useContext(AdminContext);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [status, setStatus] = useState("defaulter");
  const [search, setSearch] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState(false);

  const loadReport = useCallback(async () => {
    if (!aToken) return;
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `${backendUrl}/api/admin/donation-defaulters`,
        { headers: { aToken }, params: { year } }
      );
      if (!response.data.success) {
        throw new Error(response.data.message || "Unable to load the report.");
      }
      setData(response.data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to load the report."
      );
    } finally {
      setLoading(false);
    }
  }, [aToken, backendUrl, year]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const years = useMemo(
    () =>
      Array.from(
        { length: currentYear - 1999 },
        (_, index) => currentYear - index
      ),
    [currentYear]
  );

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.rows || []).filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!query) return true;
      return [
        row.name,
        row.memberId,
        row.fatherName,
        ...(row.spouseNames || []),
        row.contact?.mobileNumber,
        row.contact?.email,
        ...(row.donation?.categories || []),
        row.exemption?.reason,
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [data, search, status]);

  const approveExemption = async () => {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 3) {
      toast.error("Please provide a meaningful exemption reason.");
      return;
    }

    setApproving(true);
    try {
      const response = await axios.put(
        `${backendUrl}/api/admin/donation-defaulters/${selectedMember.userId}/exemption`,
        { year, reason: normalizedReason },
        { headers: { aToken } }
      );
      if (!response.data.success) {
        throw new Error(response.data.message || "Unable to approve exemption.");
      }
      toast.success(response.data.message);
      setSelectedMember(null);
      setReason("");
      await loadReport();
    } catch (requestError) {
      toast.error(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to approve exemption."
      );
    } finally {
      setApproving(false);
    }
  };

  const summary = data?.summary || {};

  return (
    <div className="flex-grow space-y-6 bg-gray-50 p-4 md:p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/donation-list")}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={16} /> Back to Donation Management
            </button>
            <h1 className="text-2xl font-bold text-gray-900">
              Yearly Donation Compliance
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Identify members without a completed yearly donation and manage annual exemptions.
            </p>
          </div>
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            aria-label="Donation year"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label="Eligible Members"
          value={summary.totalMembers || 0}
          icon={<Users className="text-blue-700" size={22} />}
          tone="bg-blue-100"
        />
        <SummaryCard
          label="Paid"
          value={summary.paid || 0}
          icon={<CheckCircle2 className="text-emerald-700" size={22} />}
          tone="bg-emerald-100"
        />
        <SummaryCard
          label="Defaulters"
          value={summary.defaulter || 0}
          icon={<UserRoundX className="text-red-700" size={22} />}
          tone="bg-red-100"
        />
        <SummaryCard
          label="Exempt"
          value={summary.exempt || 0}
          icon={<ShieldCheck className="text-amber-700" size={22} />}
          tone="bg-amber-100"
        />
        <SummaryCard
          label="Yearly Donations"
          value={formatCurrency(summary.donatedAmount)}
          icon={<BadgeIndianRupee className="text-purple-700" size={22} />}
          tone="bg-purple-100"
        />
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        A completed, non-refunded self-donation in any regular category counts
        for the selected year. Pratima-only contributions, courier charges, and
        donations made for a child are excluded.
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["defaulter", "Defaulters"],
              ["exempt", "Exempt"],
              ["paid", "Paid"],
              ["all", "All Members"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  status === value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative block md:w-80">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search member, contact or category"
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading report…</div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={loadReport}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Father / Spouse</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Donation</th>
                  <th className="px-4 py-3">Exemption History</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {visibleRows.map((row) => (
                  <tr key={row.userId} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900">{row.name}</p>
                      <p className="mt-1 text-xs text-gray-500">{row.memberId}</p>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {row.spouseNames?.length > 0 && (
                        <p>Spouse: {row.spouseNames.join(", ")}</p>
                      )}
                      {row.fatherName && <p>Father: {row.fatherName}</p>}
                      {!row.fatherName && !row.spouseNames?.length && "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      <p>
                        {[row.contact?.mobileCode, row.contact?.mobileNumber]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {row.contact?.email || "No email"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[row.status]}`}
                      >
                        {row.status}
                      </span>
                      {row.exemption?.reason && (
                        <p className="mt-2 max-w-xs text-xs text-gray-600">
                          {row.exemption.reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {row.donation ? (
                        <>
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(row.donation.amount)}
                          </p>
                          <p className="mt-1 max-w-xs text-xs text-gray-500">
                            {row.donation.categories.join(", ")}
                          </p>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {row.previousExemptions?.length ? (
                        <div className="max-w-sm space-y-2">
                          {row.previousExemptions.map((item) => (
                            <p key={item.year} className="text-xs">
                              <span className="font-semibold">{item.year}:</span>{" "}
                              {item.reason}
                            </p>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {row.status === "defaulter" && year === currentYear ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMember(row);
                            setReason("");
                          }}
                          className="whitespace-nowrap rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                        >
                          Approve Exemption
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {!visibleRows.length && (
                  <tr>
                    <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                      No members match the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Approve {year} Exemption
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {selectedMember.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <label className="mt-5 block text-sm font-semibold text-gray-700">
              Reason for exemption
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows="4"
                maxLength="1000"
                autoFocus
                className="mt-2 w-full rounded-lg border border-gray-300 p-3 font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="Enter the member's exemption reason"
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                disabled={approving}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={approveExemption}
                disabled={approving}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {approving ? "Approving…" : "Approve Exemption"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonationDefaulters;
