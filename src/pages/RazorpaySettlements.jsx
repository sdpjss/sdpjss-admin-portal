import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  RefreshCw,
  Search,
} from "lucide-react";
import { AdminContext } from "../context/AdminContext";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatPaise = (amountPaise) =>
  amountPaise == null ? "—" : formatCurrency(Number(amountPaise) / 100);

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

const statusStyle = {
  processed: "bg-emerald-100 text-emerald-700",
  created: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
};

const SummaryCard = ({ title, value, subtitle, icon, tone }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className={`rounded-lg p-3 ${tone}`}>{icon}</div>
    </div>
  </div>
);

const RazorpaySettlements = () => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const loadSettlements = useCallback(async () => {
    if (!aToken) return;
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `${backendUrl}/api/admin/razorpay-settlements`,
        {
          headers: { aToken },
          params: { year },
        }
      );
      setData(response.data);
      setExpanded(new Set());
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load Razorpay settlement reconciliation."
      );
    } finally {
      setLoading(false);
    }
  }, [aToken, backendUrl, year]);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  const synchronizeSettlements = async () => {
    setSyncing(true);
    setError("");
    try {
      await axios.post(
        `${backendUrl}/api/admin/razorpay-settlements/sync`,
        { year },
        { headers: { aToken } }
      );
      await loadSettlements();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to synchronize settlement data from Razorpay."
      );
    } finally {
      setSyncing(false);
    }
  };

  const years = useMemo(
    () => Array.from({ length: 8 }, (_, index) => currentYear - index),
    [currentYear]
  );

  const visibleSettlements = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.settlements || []).filter((settlement) => {
      const matchesStatus =
        status === "all" ||
        (status === "upcoming"
          ? settlement.isFuture || settlement.status === "created"
          : settlement.status === status);
      if (!matchesStatus) return false;
      if (!query) return true;

      return [
        settlement.id,
        settlement.utr,
        ...settlement.transactions.flatMap((transaction) => [
          transaction.paymentId,
          transaction.orderId,
          transaction.receiptId,
          transaction.donorName,
        ]),
      ].some((value) => String(value || "").toLowerCase().includes(query));
    });
  }, [data, search, status]);

  const toggleExpanded = (settlementId) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(settlementId)) next.delete(settlementId);
      else next.add(settlementId);
      return next;
    });
  };

  const summary = data?.summary || {};

  return (
    <div className="flex-grow space-y-6 bg-gray-50 p-4 md:p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Razorpay Settlement Reconciliation
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Match settled Razorpay payments with internal donation receipts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              aria-label="Settlement year"
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={synchronizeSettlements}
              disabled={loading || syncing}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={syncing ? "animate-spin" : ""}
              />
              {syncing ? "Synchronizing…" : "Sync from Razorpay"}
            </button>
          </div>
        </div>
        {data?.generatedAt && (
          <p className="mt-3 text-xs text-gray-500">
            Last database sync: {formatDate(data.generatedAt)}
          </p>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold">Settlement data could not be loaded</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {data?.sync?.failedPeriods?.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-semibold">Some settlement periods need attention</p>
            <p className="text-sm">
              {data.sync.failedPeriods
                .map((record) => record.period)
                .join(", ")} failed during the last synchronization. Use Sync
              from Razorpay to retry.
            </p>
          </div>
        </div>
      )}

      {!loading && data && !data.generatedAt && !error && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Settlement data for {year} has not been synchronized yet. Use
          <span className="font-semibold"> Sync from Razorpay </span>
          to import it into the local database.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Gross Payment Amount"
          value={formatPaise(summary.grossSettledPaymentAmountPaise)}
          subtitle={`Before Razorpay fees and tax · ${summary.processedSettlementCount || 0} processed settlements`}
          icon={<CheckCircle2 className="text-emerald-700" size={22} />}
          tone="bg-emerald-100"
        />
        <SummaryCard
          title="Upcoming Settlements"
          value={formatPaise(summary.upcomingAmountPaise)}
          subtitle={`${summary.upcomingSettlementCount || 0} created or future-dated`}
          icon={<Clock3 className="text-amber-700" size={22} />}
          tone="bg-amber-100"
        />
        <SummaryCard
          title="Awaiting Settlement"
          value={formatCurrency(summary.awaitingDonationAmount)}
          subtitle={`${data?.awaitingSettlement?.length || 0} completed portal payments`}
          icon={<Banknote className="text-blue-700" size={22} />}
          tone="bg-blue-100"
        />
        <SummaryCard
          title="Needs Review"
          value={summary.unmatchedTransactionCount || 0}
          subtitle={`${summary.failedSettlementCount || 0} failed settlements`}
          icon={<AlertCircle className="text-red-700" size={22} />}
          tone="bg-red-100"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["processed", "Processed"],
              ["upcoming", "Upcoming"],
              ["failed", "Failed"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  status === value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative block w-full lg:w-96">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search settlement, UTR, payment or receipt"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3">Settlement</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Scheduled / created</th>
                <th className="px-4 py-3">Bank Settlement Reference (UTR)</th>
                <th className="px-4 py-3 text-right">Gross amount</th>
                <th className="px-4 py-3 text-right">Receipts mapped</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-14 text-center text-gray-500">
                    <RefreshCw className="mx-auto mb-2 animate-spin" size={22} />
                    Loading settlement data…
                  </td>
                </tr>
              ) : visibleSettlements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-14 text-center text-gray-500">
                    No settlements match the selected filters.
                  </td>
                </tr>
              ) : (
                visibleSettlements.map((settlement) => {
                  const isOpen = expanded.has(settlement.id);
                  return (
                    <SettlementRows
                      key={settlement.id}
                      settlement={settlement}
                      isOpen={isOpen}
                      onToggle={() => toggleExpanded(settlement.id)}
                    />
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AwaitingSettlementTable donations={data?.awaitingSettlement || []} />
    </div>
  );
};

const SettlementRows = ({ settlement, isOpen, onToggle }) => (
  <>
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-4">
        <button
          type="button"
          onClick={onToggle}
          className="rounded p-1 text-gray-500 hover:bg-gray-200"
          aria-label={`${isOpen ? "Collapse" : "Expand"} settlement`}
        >
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
      </td>
      <td className="px-4 py-4 font-mono text-xs text-gray-800">
        {settlement.id}
      </td>
      <td className="px-4 py-4">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
            statusStyle[settlement.status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {settlement.isFuture && settlement.status !== "failed"
            ? "Upcoming"
            : settlement.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-gray-600">
        {formatDate(settlement.scheduledAt || settlement.createdAt)}
      </td>
      <td className="px-4 py-4 font-mono text-xs text-gray-600">
        {settlement.utr || "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-gray-900">
        {formatPaise(settlement.grossPaymentAmountPaise)}
      </td>
      <td className="px-4 py-4 text-right text-gray-600">
        {settlement.matchedReceiptCount}/{settlement.receiptMappableCount}
      </td>
    </tr>
    {isOpen && (
      <tr>
        <td colSpan="7" className="bg-slate-50 px-5 py-5">
          <TransactionTable transactions={settlement.transactions} />
        </td>
      </tr>
    )}
  </>
);

const TransactionTable = ({ transactions }) => {
  if (!transactions.length) {
    return (
      <p className="text-sm text-gray-500">
        Razorpay did not return transaction-level reconciliation rows for this
        settlement.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-gray-50 text-left font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-3 py-2">Payment / Type</th>
            <th className="px-3 py-2">Receipt</th>
            <th className="px-3 py-2">Donor</th>
            <th className="px-3 py-2">Local status</th>
            <th className="px-3 py-2 text-right">Gross amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="px-3 py-3">
                <p className="font-mono text-gray-800">
                  {transaction.paymentId || transaction.entityId || "—"}
                </p>
                <p className="mt-1 capitalize text-gray-500">
                  {transaction.type}
                  {transaction.onHold ? " · On hold" : ""}
                </p>
              </td>
              <td className="px-3 py-3 font-medium text-gray-800">
                {transaction.receiptId || (
                  <span className="text-amber-700">Not matched</span>
                )}
              </td>
              <td className="px-3 py-3 text-gray-600">
                {transaction.donorName || "—"}
              </td>
              <td className="px-3 py-3 capitalize text-gray-600">
                {transaction.localPaymentStatus || "—"}
              </td>
              <td className="px-3 py-3 text-right">
                {formatPaise(transaction.grossAmountPaise)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AwaitingSettlementTable = ({ donations }) => (
  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
    <div className="border-b border-gray-200 p-5">
      <h2 className="text-lg font-semibold text-gray-900">
        Completed Payments Awaiting Settlement
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Portal payments for the selected year that are not marked as settled in
        the reconciliation response.
      </p>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Payment ID</th>
            <th className="px-4 py-3">Receipt</th>
            <th className="px-4 py-3">Donor</th>
            <th className="px-4 py-3">Payment date</th>
            <th className="px-4 py-3 text-right">Donation amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {donations.length ? (
            donations.map((donation) => (
              <tr key={donation.donationId}>
                <td className="px-4 py-3 font-mono text-xs">
                  {donation.paymentId}
                </td>
                <td className="px-4 py-3 font-medium">
                  {donation.receiptId || "Not generated"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {donation.donorName || "—"}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {formatDate(donation.donatedAt)}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {formatCurrency(donation.amount)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="px-4 py-10 text-center text-gray-500">
                No completed Razorpay payments are currently awaiting settlement.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default RazorpaySettlements;
