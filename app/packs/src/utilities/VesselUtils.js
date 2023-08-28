const extractApiParameter = (vessel) => {
  return {
    "collection_id":vessel.collectionId,
    "vessel_id":vessel.id,
    "name":vessel.vesselName,
    "description":vessel.vesselDescription,
    "template_name":vessel.vesselTemplateName,
    "details":vessel.vesselDetails,
    "vessel_type":vessel.vesselType,
    "volume_amount":vessel.volumeAmount,
    "volume_unit":vessel.volumeUnit,
    "material_type":vessel.materialType,
    "material_details":vessel.materialDetails,
    "short_label":vessel.short_label,
  };
}

export {
  extractApiParameter
};