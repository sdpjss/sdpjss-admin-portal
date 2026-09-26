const DonationStatusBadge = ({ status }) => {
  const normalizedStatus = String(status || "").toLowerCase();
  const styles =
    normalizedStatus === "completed"
      ? "bg-green-100 text-green-800 border-green-200"
      : normalizedStatus === "pending"
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-gray-100 text-gray-700 border-gray-200";
  const label = normalizedStatus
    ? `${normalizedStatus.charAt(0).toUpperCase()}${normalizedStatus.slice(1)}`
    : "Unknown";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
};

export default DonationStatusBadge;
