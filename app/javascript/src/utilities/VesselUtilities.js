let latestVesselIds = [];

const extractCreateVesselApiParameter = (vessel) => {
  const baseParams = {
    collection_id: vessel.collectionId,
    template_name: vessel.vesselName,
    material_details: vessel.materialDetails,
    material_type: vessel.materialType,
    vessel_type: vessel.vesselType,
    volume_amount: vessel.volumeAmount,
    volume_unit: vessel.volumeUnit,
    details: vessel.details,
    short_label: vessel.short_label,
    container: vessel.container,
    weight_amount: vessel.weightAmount,
    weight_unit: vessel.weightUnit,
    instances: vessel.instances.map((instance) => ({
      vessel_name: instance.vesselInstanceName,
      description: instance.vesselInstanceDescription,
      bar_code: instance.barCode,
      qr_code: instance.qrCode,
      weight_amount: instance.weightAmount || vessel.weightAmount,
      weight_unit: instance.weightUnit || vessel.weightUnit,
    })),
  };

  return baseParams;
};

const extractUpdateVesselApiParameter = (vessel) => {
  const baseParams = {
    vessel_id: vessel.id,
    vessel_template_id: vessel.vesselTemplateId,
    collection_id: vessel.collectionId,
    template_name: vessel.vesselName,
    material_details: vessel.materialDetails,
    material_type: vessel.materialType,
    vessel_type: vessel.vesselType,
    volume_amount: vessel.volumeAmount,
    volume_unit: vessel.volumeUnit,
    weight_amount: vessel.weightAmount,
    weight_unit: vessel.weightUnit,
    bar_code: vessel.barCode,
    qr_code: vessel.qrCode,
    details: vessel.details,
    short_label: vessel.short_label,
    container: vessel.container,
    // instances: vessel.instances.map((instance) => ({
    //   vessel_name: instance.vesselInstanceName,
    //   description: instance.vesselInstanceDescription,
    //   bar_code: instance.barCode,
    //   qr_code: instance.qrCode,
    //   weight_amount: vessel.weightAmount,
    //   weight_unit: vessel.weightUnit,
    // })),
  };

  return baseParams;
};

const storeLatestVesselIds = (ids) => {
  latestVesselIds = ids;
};
const clearLatestVesselIds = () => {
  latestVesselIds = [];
};

const getLatestVesselIds = () => latestVesselIds;

export {
  extractCreateVesselApiParameter,
  extractUpdateVesselApiParameter,
  storeLatestVesselIds,
  getLatestVesselIds,
  clearLatestVesselIds
};
