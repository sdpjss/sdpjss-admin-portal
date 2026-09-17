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
  { value: "in_manpur", label: "In Manpur", courierAvailable: false },
  {
    value: "in_gaya_outside_manpur",
    label: "In Gaya outside Manpur",
    courierAvailable: false,
  },
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
  { name: "pin", label: "PIN Code", required: true },
  { name: "street", label: "Street Address", required: true },
];

const locationDefaults = {
  in_manpur: {
    country: "India",
    state: "Bihar",
    district: "Gaya",
    city: "Gaya",
    postoffice: "Buniyadganj",
    pin: "823003",
    street: "Manpur",
  },
  in_gaya_outside_manpur: {
    country: "India",
    state: "Bihar",
    district: "Gaya",
    city: "Gaya",
  },
  in_bihar_outside_gaya: { country: "India", state: "Bihar" },
  in_india_outside_bihar: { country: "India" },
  outside_india: {},
};

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

const getDeliveryAddressError = (address) => {
  const required = ["currlocation", "country", "city", "pin", "street"];
  if (address.currlocation !== "outside_india") required.push("state");
  const missing = required.filter((field) => !address[field]?.trim());
  if (missing.length) return `Complete: ${missing.join(", ")}.`;
  if (
    address.currlocation !== "outside_india" &&
    !/^\d{6}$/.test(address.pin)
  ) {
    return "PIN Code must be exactly 6 digits.";
  }
  return "";
};

const DonationFulfillmentFields = ({
  mode,
  onModeChange,
  prasadType,
  onPrasadTypeChange,
  hasGramOption,
  hasPacketOption,
  courierEligible,
  minimumCourierAmount,
  deliveryAddress,
  onDeliveryAddressChange,
  disabled = false,
}) => {
  const updateAddress = (field, value) => {
    onDeliveryAddressChange({ ...deliveryAddress, [field]: value });
  };

  const handleLocationChange = (location) => {
    onDeliveryAddressChange({
      ...emptyDeliveryAddress,
      currlocation: location,
      ...(locationDefaults[location] || {}),
    });
  };

  const preview = formatDeliveryAddress(deliveryAddress);
  const addressError = mode === "courier"
    ? getDeliveryAddressError(deliveryAddress)
    : "";

  return (
    <section className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div>
        <h3 className="font-semibold text-gray-800">Mahaprasad Fulfilment</h3>
        <p className="mt-1 text-xs text-gray-600">
          Select how the donor will receive Mahaprasad.
        </p>
      </div>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="adminFulfillmentMode"
            value="collection"
            checked={mode === "collection"}
            onChange={() => onModeChange("collection")}
            disabled={disabled}
          />
          In-person collection
        </label>
        <label
          className={`flex items-center gap-2 text-sm ${
            courierEligible ? "" : "cursor-not-allowed opacity-60"
          }`}
        >
          <input
            type="radio"
            name="adminFulfillmentMode"
            value="courier"
            checked={mode === "courier"}
            onChange={() => onModeChange("courier")}
            disabled={disabled || !courierEligible}
          />
          Courier
        </label>
      </div>
      {!courierEligible && (
        <p className="text-xs text-gray-600">
          Courier requires at least ₹
          {minimumCourierAmount.toLocaleString("en-IN")} from
          Mahaprasad-eligible categories.
        </p>
      )}

      {mode === "collection" && (
        <div className="rounded-md border border-blue-100 bg-white p-3">
          <p className="mb-2 text-sm font-medium text-gray-700">
            What will the donor collect?
          </p>
          <div className="flex flex-wrap gap-5">
            {hasGramOption && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="adminPrasadType"
                  value="halwa"
                  checked={prasadType === "halwa"}
                  onChange={() => onPrasadTypeChange("halwa")}
                  disabled={disabled}
                />
                Mahaprasad (Halwa)
              </label>
            )}
            {hasPacketOption && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="adminPrasadType"
                  value="packet"
                  checked={prasadType === "packet"}
                  onChange={() => onPrasadTypeChange("packet")}
                  disabled={disabled}
                />
                Packet
              </label>
            )}
          </div>
        </div>
      )}

      {mode === "courier" && (
        <div className="space-y-4 rounded-md border border-blue-100 bg-white p-4">
          <p className="rounded-md bg-indigo-50 p-3 text-sm text-indigo-800">
            Courier fulfilment provides one Mahaprasad packet.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Delivery Region <span className="text-red-500">*</span>
            </label>
            <select
              value={deliveryAddress.currlocation}
              onChange={(event) => handleLocationChange(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"
              disabled={disabled}
            >
              <option value="">Select delivery region</option>
              {deliveryLocationOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.courierAvailable === false}
                >
                  {option.label}
                  {option.courierAvailable === false
                    ? " — Courier unavailable"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {deliveryAddressFields.map(({ name, label, required }) => {
              const outsideIndia =
                deliveryAddress.currlocation === "outside_india";
              const fieldRequired =
                required && !(name === "state" && outsideIndia);
              const indianPin = name === "pin" && !outsideIndia;
              return (
                <div key={name}>
                  <label className="mb-1 block text-xs font-medium text-gray-600">
                    {name === "pin" && outsideIndia ? "ZIP Code" : label}
                    {fieldRequired && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress[name]}
                    onChange={(event) =>
                      updateAddress(
                        name,
                        indianPin
                          ? event.target.value.replace(/\D/g, "")
                          : event.target.value
                      )
                    }
                    maxLength={indianPin ? 6 : undefined}
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm"
                    disabled={disabled}
                  />
                </div>
              );
            })}
          </div>

          {preview && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-semibold text-green-900">
                Delivery address preview
              </p>
              <p className="mt-1 text-sm text-gray-800">{preview}</p>
            </div>
          )}
          {addressError && (
            <p className="text-xs font-medium text-red-600">{addressError}</p>
          )}
        </div>
      )}
    </section>
  );
};

export {
  emptyDeliveryAddress,
  formatDeliveryAddress,
  getDeliveryAddressError,
};
export default DonationFulfillmentFields;
