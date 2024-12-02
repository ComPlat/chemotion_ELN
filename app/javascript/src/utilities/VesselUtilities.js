const extractVesselApiParameter = (vessel) => {
    return {
        "vessel_id":vessel.id,
        "vessel_template_id":vessel.vesselTemplateId,
        "collection_id":vessel.collectionId,
        "vessel_name":vessel.vesselInstanceName,
        "description":vessel.vesselInstanceDescription,
        "bar_code":vessel.barCode,
        "qr_code":vessel.qrCode,
        "template_name":vessel.vesselName,
        "material_details":vessel.materialDetails,
        "material_type":vessel.materialType,
        "vessel_type":vessel.vesselType,
        "volume_amount":vessel.volumeAmount,
        "volume_unit":vessel.volumeUnit,
        "weight_amount":vessel.weight,
        "weight_unit":vessel.weightUnit,
        "details":vessel.details,
        "short_label":vessel.short_label,
        "container":vessel.container
};
}

export {
    extractVesselApiParameter
};