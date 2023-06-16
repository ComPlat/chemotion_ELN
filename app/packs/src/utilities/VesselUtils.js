const extractApiParameter = (vessel) => {
  return {
    "collection_id":vessel.collectionId,
    "name":vessel.vesselName,
    "description":vessel.vesselDescription,
    "template_name":vessel.vesselTemplateName,
    "details":vessel.vesselDetails,
    "vessel_type":vessel.vesselType,
    "volume_amount":vessel.volumeAmount,
    "volume_unit":vessel.volumeUnit,
    "material_type":vessel.materialType,
    "material_details":vessel.materialDetails,
  };
}

export {
  extractApiParameter
};