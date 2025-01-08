const extractApiParameter = (cellLine) => ({
  cell_line_sample_id: cellLine.id,
  organism: cellLine.organism,
  tissue: cellLine.tissue,
  amount: cellLine.amount,
  passage: cellLine.passage,
  disease: cellLine.disease,
  growth_medium: cellLine.growthMedium,
  material_names: cellLine.cellLineName,
  collection_id: cellLine.collectionId,
  cell_type: cellLine.cellType,
  mutation: cellLine.mutation,
  unit: cellLine.unit,
  biosafety_level: cellLine.bioSafetyLevel,
  variant: cellLine.variant,
  optimal_growth_temp: cellLine.optimal_growth_temp,
  cryo_pres_medium: cellLine.cryopreservationMedium,
  gender: cellLine.gender,
  material_description: cellLine.materialDescription,
  contamination: cellLine.contamination,
  source: cellLine.source,
  name: cellLine.itemName,
  description: cellLine.itemDescription,
  short_label: cellLine.short_label,
  container: cellLine.container
});

const successfullyCreatedParameter = {
  title: 'Element created',
  message: 'Cell line sample successfully added',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const successfullyCopiedParameter = {
  title: 'Element copied',
  message: 'Cell line sample successfully copied',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const successfullyUpdatedParameter = {
  title: 'Element updated',
  message: 'Cell line sample successfully updated',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};
const successfullySplittedParameter = {
  title: 'Element splitted',
  message: 'Cell line sample successfully splitted',
  level: 'info',
  dismissible: 'button',
  autoDismiss: 10,
  position: 'tr'
};

const errorMessageParameter = {
  title: 'Error',
  message: 'Unfortunately, the last action failed. Please try again or contact your admin.',
  level: 'error',
  dismissible: 'button',
  autoDismiss: 30,
  position: 'tr'
};

export {
  extractApiParameter,
  successfullyCreatedParameter,
  successfullyCopiedParameter,
  successfullyUpdatedParameter,
  errorMessageParameter,
  successfullySplittedParameter
};
