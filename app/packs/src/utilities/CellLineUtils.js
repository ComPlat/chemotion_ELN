const extractApiParameter = (cellLine) => {
    return {
        "cell_line_sample_id":cellLine.id,
        "organism":cellLine.organism,
        "tissue":cellLine.tissue,
        "amount":cellLine.amount,
        "passage":cellLine.passage,
        "disease":cellLine.disease,
        "growth_medium":cellLine.growthMedium,
        "material_names":cellLine.cellLineName,
        "collection_id":cellLine.collectionId,
        "cell_type":cellLine.cellType,
        "mutation":cellLine.mutation,
        "unit":cellLine.unit,
        "biosafety_level":cellLine.bioSafetyLevel,
        "variant":cellLine.variant,
        "optimal_growth_temp":cellLine.optimal_growth_temp,
        "cryo_pres_medium":cellLine.cryopreservationMedium,
        "gender":cellLine.gender,
        "material_description":cellLine.materialDescription, 
        "contamination":cellLine.contamination,
        "source":cellLine.source,
        "name":cellLine.itemName,
        "description":cellLine.itemDescription,
        "short_label":cellLine.short_label,
        "container":cellLine.container
};
}

export {
    extractApiParameter
};