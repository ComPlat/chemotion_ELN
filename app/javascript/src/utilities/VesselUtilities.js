import UserStore from 'src/stores/alt/stores/UserStore';

let latestVesselIds = [];

const extractCreateVesselTemplateApiParameter = (vessel) => {
  const baseParams = {
    name: vessel.vesselName,
    details: vessel.details,
    material_details: vessel.materialDetails,
    material_type: vessel.materialType,
    vessel_type: vessel.vesselType,
    volume_amount: vessel.volumeAmount,
    volume_unit: vessel.volumeUnit,
  };
  const hasAttachments = vessel.container?.children?.some((child) =>
      Array.isArray(child.attachments) && child.attachments.length > 0
    );
  if (hasAttachments) {
    baseParams.container = vessel.container;
  }

  return baseParams;
};

const extractCreateVesselInstanceApiParameter = (vessel) => {
  const instance = vessel.instances?.[0] || {};
  return {
    vessel_template_id: vessel.vesselTemplateId,
    collection_id: vessel.collectionId,
    name: instance.vesselInstanceName || '',
    description: instance.vesselInstanceDescription || '',
    short_label: vessel.short_label,
    weight_amount: parseFloat(instance.weightAmount) || 0,
    weight_unit: instance.weightUnit || '',
    bar_code: instance.barCode || '',
    qr_code: instance.qrCode || ''
  };
};

const extractBulkCreateApiParameter = ({
  vesselTemplateId,
  collectionId,
  count,
  container,
  shortLabels
}) => ({
  vessel_template_id: vesselTemplateId,
  collection_id: collectionId,
  count,
  container,
  short_labels: shortLabels
});

const extractUpdateVesselApiParameter = (vessel) => ({
  id: vessel.id,
  name: vessel.vesselInstanceName,
  description: vessel.vesselInstanceDescription,
  bar_code: vessel.barCode,
  qr_code: vessel.qrCode,
  weight_amount: vessel.weightAmount,
  weight_unit: vessel.weightUnit,
  short_label: vessel.shortLabel,
});

const extractUpdateVesselTemplateApiParameter = (vessel) => ({
  id: vessel.id,
  name: vessel.vesselName,
  details: vessel.details,
  material_details: vessel.materialDetails,
  material_type: vessel.materialType,
  vessel_type: vessel.vesselType,
  volume_amount: vessel.volumeAmount,
  volume_unit: vessel.volumeUnit,
  container: vessel.container
});

const storeLatestVesselIds = (ids) => {
  latestVesselIds = ids;
};
const clearLatestVesselIds = () => {
  latestVesselIds = [];
};

const getLatestVesselIds = () => latestVesselIds;

const getNextVesselIndex = (vessels, initials) => {
  const prefix = `${initials}-V`;
  const usedNumbers = vessels
    .map(v => v.short_label)
    .filter(label => label?.startsWith(prefix))
    .map(label => parseInt(label.replace(prefix, ''), 10))
    .filter(n => !isNaN(n));

  return usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;
};

const generateNextShortLabel = (baseIndex = null) => {
  const { currentUser } = UserStore.getState();
  if (!currentUser) return 'NEW VESSEL';

  const initials = currentUser.initials;

  if (baseIndex !== null) {
    return `${initials}-V${baseIndex}`;
  }

  const ElementStore = require('src/stores/alt/stores/ElementStore').default;
  const vesselsState = ElementStore.getState().elements?.vessels || {};
  const existingVessels = Array.isArray(vesselsState.elements) ? vesselsState.elements : [];

  const index = getNextVesselIndex(existingVessels, initials);
  return `${initials}-V${index}`;
};

export {
  extractCreateVesselTemplateApiParameter,
  extractCreateVesselInstanceApiParameter,
  extractBulkCreateApiParameter,
  extractUpdateVesselApiParameter,
  extractUpdateVesselTemplateApiParameter,
  storeLatestVesselIds,
  getLatestVesselIds,
  clearLatestVesselIds,
  getNextVesselIndex,
  generateNextShortLabel
};
