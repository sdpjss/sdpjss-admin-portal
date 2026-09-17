const categoryAllowsGramCollection = (item) =>
  item.prasadType === "grams" ||
  (item.prasadType === "packet" && item.allowGramAlternativeForInPerson);

const categoryUsesMinimumAmount = (category) =>
  category?.configurationVersion === "category-v2"
    ? category.amountType === "minimum"
    : Boolean(category?.dynamic?.isDynamic);

const getMinimumDonationAmount = (category, quantity = 1) => {
  if (!categoryUsesMinimumAmount(category)) return 0;
  const configuredMinimum =
    category?.configurationVersion === "category-v2"
      ? Number(category.rate) || 0
      : Number(category?.dynamic?.minvalue) || Number(category?.rate) || 0;
  const units = category.minimumAmountPerUnit
    ? Math.max(1, Number(quantity) || 1)
    : 1;
  return configuredMinimum * units;
};

const formatPrasadWeight = (value) => {
  const totalGrams = Math.max(0, Number(value) || 0);
  const formatNumber = (number) =>
    number.toLocaleString("en-IN", { maximumFractionDigits: 2 });

  if (totalGrams < 1000) return `${formatNumber(totalGrams)} g`;

  const kilograms = Math.floor(totalGrams / 1000);
  const grams = totalGrams - kilograms * 1000;
  return `${formatNumber(kilograms)} kg ${formatNumber(grams)} g`;
};

const calculateCategoryV2Prasad = (
  donations,
  prasadRate,
  fulfillmentMode,
  fulfillmentType
) => {
  const usesCategoryV2 =
    donations.length > 0 &&
    donations.every(
      (donation) => donation.configurationVersion === "category-v2"
    );
  if (!usesCategoryV2) return null;

  const gramEligibleAmount = donations.reduce(
    (sum, donation) =>
      categoryAllowsGramCollection(donation)
        ? sum + (Number(donation.amount) || 0)
        : sum,
    0
  );
  const configuredPackets = donations.reduce(
    (sum, donation) =>
      donation.prasadType === "packet"
        ? sum +
          (Number(donation.number) || 1) *
            (Number(donation.packetsPerUnit) || 1)
        : sum,
    0
  );
  const rupeesPer100Grams = Number(prasadRate?.rupeesPer100Grams) || 0;
  const gramsPerRupee = rupeesPer100Grams
    ? 100 / rupeesPer100Grams
    : Number(prasadRate?.gramsPerRupee) || 0;
  const roundingUnitGrams = Number(prasadRate?.roundingUnitGrams) || 1;
  const minimumPrasadGrams = Number(prasadRate?.minimumPrasadGrams) || 0;
  const roundedGrams =
    Math.floor(
      (gramEligibleAmount * gramsPerRupee) / roundingUnitGrams
    ) * roundingUnitGrams;
  const calculatedGrams =
    gramEligibleAmount > 0
      ? Math.max(roundedGrams, minimumPrasadGrams)
      : 0;

  if (fulfillmentMode === "courier") {
    return { grams: 0, packets: 1 };
  }
  if (fulfillmentMode !== "collection") {
    return { grams: 0, packets: 0 };
  }
  return fulfillmentType === "halwa"
    ? { grams: calculatedGrams, packets: 0 }
    : fulfillmentType === "packet"
      ? { grams: 0, packets: configuredPackets }
      : { grams: 0, packets: 0 };
};

const getSavedPrasadTotals = (donation, fallback = {}) => {
  if (
    donation?.calculationVersion === "category-v2" &&
    donation.prasadEntitlement
  ) {
    return {
      totalWeight: Number(donation.prasadEntitlement.grams) || 0,
      totalPackets: Number(donation.prasadEntitlement.packets) || 0,
      minPrasadWeight: 0,
    };
  }
  return fallback;
};

export {
  calculateCategoryV2Prasad,
  categoryUsesMinimumAmount,
  formatPrasadWeight,
  getMinimumDonationAmount,
  getSavedPrasadTotals,
};
