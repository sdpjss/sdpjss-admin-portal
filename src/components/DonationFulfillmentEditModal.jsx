import { useContext, useMemo, useState } from "react";
import axios from "axios";
import { Save, X } from "lucide-react";
import { toast } from "react-toastify";
import { AdminContext } from "../context/AdminContext";

const emptyDeliveryAddress = {
  currlocation: "",
  country: "",
  state: "",
  district: "",
  city: "",
  postoffice: "",
  pin: "",
  landmark: "",
  street: "",
  apartment: "",
  floor: "",
  room: "",
};

const deliveryLocationOptions = [
  { value: "in_manpur", label: "In Manpur" },
  { value: "in_gaya_outside_manpur", label: "In Gaya outside Manpur" },
  { value: "in_bihar_outside_gaya", label: "In Bihar outside Gaya" },
  { value: "in_india_outside_bihar", label: "In India outside Bihar" },
  { value: "outside_india", label: "Outside India" },
];

const deliveryAddressFields = [
  { name: "country", label: "Country", required: true },
  { name: "state", label: "State", required: true },
  { name: "district", label: "District" },
  { name: "city", label: "City", required: true },
  { name: "postoffice", label: "Post Office" },
  { name: "pin", label: "PIN / ZIP Code", required: true },
  { name: "street", label: "Street Address", required: true },
  { name: "landmark", label: "Landmark" },
  { name: "apartment", label: "Apartment / Building" },
  { name: "floor", label: "Floor" },
  { name: "room", label: "Room" },
];

const formatDeliveryAddress = (address) =>
  [
    address.room,
    address.floor,
    address.apartment,
    address.street,
    address.landmark,
    address.postoffice,
    address.city,
    address.district,
    address.state,
    address.country,
    address.pin,
  ]
    .filter(Boolean)
    .join(", ");

const DonationFulfillmentEditModal = ({ donation, onClose, onUpdated }) => {
  const { backendUrl, aToken } = useContext(AdminContext);
  const listGrams = (donation.list || []).reduce(
    (sum, item) => sum + (item.isPacket ? 0 : Number(item.quantity) || 0),
    0
  );
  const listPackets = (donation.list || []).reduce(
    (sum, item) => sum + (item.isPacket ? Number(item.quantity) || 0 : 0),
    0
  );
  const hasStoredEntitlement =
    donation.prasadEntitlement &&
    (donation.prasadEntitlement.grams !== undefined ||
      donation.prasadEntitlement.packets !== undefined);
  const currentGrams = hasStoredEntitlement
    ? Number(donation.prasadEntitlement.grams) || 0
    : listGrams;
  const currentPackets = hasStoredEntitlement
    ? Number(donation.prasadEntitlement.packets) || 0
    : listPackets;
  const storedType = donation.mahaprasadFulfillment?.type;
  const inferredType = ["none", "halwa", "packet"].includes(storedType)
    ? storedType
    : currentPackets > 0
      ? "packet"
      : currentGrams > 0
        ? "halwa"
        : "none";
  const address = (donation.postalAddress || "").toLowerCase();
  const inferredCollection =
    address === "will collect from durga sthan" ||
    (address.includes("gaya") && address.includes("bihar"));
  const inferredMode =
    donation.mahaprasadFulfillment?.mode ||
    (inferredType === "none"
      ? "none"
      : inferredCollection
        ? "collection"
        : "courier");
  const hasStructuredAddress = Boolean(
    donation.deliveryAddress &&
      Object.values(donation.deliveryAddress).some(Boolean)
  );
  const [formData, setFormData] = useState({
    deliveryAddress: {
      ...emptyDeliveryAddress,
      ...(donation.deliveryAddress || {}),
    },
    fulfillmentMode: inferredMode,
    prasadType: inferredType,
    prasadQuantity:
      inferredType === "packet" ? currentPackets : currentGrams,
    reason: "",
  });
  const [editAddress, setEditAddress] = useState(hasStructuredAddress);
  const [submitting, setSubmitting] = useState(false);

  const effectiveType = useMemo(() => {
    if (formData.fulfillmentMode === "none") return "none";
    if (formData.fulfillmentMode === "courier") return "packet";
    return formData.prasadType;
  }, [formData.fulfillmentMode, formData.prasadType]);

  const updateField = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateAddressField = (field, value) => {
    setFormData((current) => ({
      ...current,
      deliveryAddress: {
        ...current.deliveryAddress,
        [field]: value,
      },
    }));
  };

  const handleModeChange = (mode) => {
    setFormData((current) => ({
      ...current,
      fulfillmentMode: mode,
      prasadType:
        mode === "none"
          ? "none"
          : mode === "courier"
            ? "packet"
            : current.prasadType === "none"
              ? "halwa"
              : current.prasadType,
      prasadQuantity: mode === "none" ? 0 : current.prasadQuantity,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/admin/donations/${donation._id}/fulfillment`,
        {
          fulfillmentMode: formData.fulfillmentMode,
          prasadType: effectiveType,
          prasadQuantity:
            effectiveType === "none" ? 0 : Number(formData.prasadQuantity),
          reason: formData.reason,
          ...(editAddress && { deliveryAddress: formData.deliveryAddress }),
        },
        { headers: { aToken } }
      );
      if (!data.success) {
        toast.error(data.message || "Unable to update the donation.");
        return;
      }
      toast.success(data.message);
      await onUpdated(data.donation);
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Unable to update the donation."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b bg-gray-50 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Correct donation fulfilment
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Receipt {donation.receiptId || "Not generated"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              This updates the existing donation and its re-downloaded receipt.
              The donation amount, categories, payment details and receipt number
              will not change.
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Receipt / delivery address
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Structured fields are formatted by the backend when saved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditAddress((current) => !current)}
                  className="self-start rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                >
                  {editAddress ? "Do not change address" : "Edit address"}
                </button>
              </div>

              {!editAddress ? (
                <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                  <span className="font-medium">Current formatted address:</span>{" "}
                  {donation.postalAddress || "Not available"}
                  {!hasStructuredAddress && (
                    <p className="mt-2 text-xs text-amber-700">
                      This historical donation has no structured address. Choose
                      Edit address to replace it with structured fields.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Delivery Region <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.deliveryAddress.currlocation}
                      onChange={(event) =>
                        updateAddressField("currlocation", event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select delivery region</option>
                      {deliveryLocationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {deliveryAddressFields.map(({ name, label, required }) => {
                      const stateIsRequired =
                        name !== "state" ||
                        formData.deliveryAddress.currlocation !==
                          "outside_india";
                      const isRequired = required && stateIsRequired;
                      const isIndianPin =
                        name === "pin" &&
                        formData.deliveryAddress.currlocation !==
                          "outside_india";
                      return (
                        <div key={name}>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            {label}
                            {isRequired && (
                              <span className="text-red-500"> *</span>
                            )}
                          </label>
                          <input
                            type="text"
                            required={isRequired}
                            value={formData.deliveryAddress[name]}
                            maxLength={isIndianPin ? 6 : undefined}
                            pattern={isIndianPin ? "[0-9]{6}" : undefined}
                            onChange={(event) =>
                              updateAddressField(
                                name,
                                isIndianPin
                                  ? event.target.value.replace(/\D/g, "")
                                  : event.target.value
                              )
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {formatDeliveryAddress(formData.deliveryAddress) && (
                    <div className="rounded-md border border-green-200 bg-green-50 p-3">
                      <p className="text-xs font-semibold text-green-900">
                        Formatted address preview
                      </p>
                      <p className="mt-1 text-sm text-gray-800">
                        {formatDeliveryAddress(formData.deliveryAddress)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Fulfilment mode
                </label>
                <select
                  value={formData.fulfillmentMode}
                  onChange={(event) => handleModeChange(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">No Mahaprasad</option>
                  <option value="collection">In-person collection</option>
                  <option value="courier">Courier</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Mahaprasad type
                </label>
                <select
                  value={effectiveType}
                  disabled={formData.fulfillmentMode !== "collection"}
                  onChange={(event) =>
                    updateField("prasadType", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="none">None</option>
                  <option value="halwa">Mahaprasad (Halwa)</option>
                  <option value="packet">Packet</option>
                </select>
                {formData.fulfillmentMode === "courier" && (
                  <p className="mt-1 text-xs text-gray-500">
                    Courier fulfilment always uses packets.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {effectiveType === "packet"
                  ? "Packet quantity"
                  : "Mahaprasad quantity (grams)"}
              </label>
              <input
                type="number"
                required={effectiveType !== "none"}
                min={effectiveType === "none" ? 0 : 1}
                step="1"
                disabled={effectiveType === "none"}
                value={effectiveType === "none" ? 0 : formData.prasadQuantity}
                onChange={(event) =>
                  updateField("prasadQuantity", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reason for correction
              </label>
              <textarea
                required
                rows={3}
                value={formData.reason}
                onChange={(event) => updateField("reason", event.target.value)}
                placeholder="For example: donor confirmed the correct courier address"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                This reason is retained in the donation correction history.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              <Save size={16} />
              {submitting ? "Saving..." : "Save correction"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonationFulfillmentEditModal;
