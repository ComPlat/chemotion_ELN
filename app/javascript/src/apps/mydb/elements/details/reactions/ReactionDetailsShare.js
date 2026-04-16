// Types whose value is assigned directly to a same-or-renamed reaction field.
// Map: incoming type -> target reaction property name.
const PLAIN_ASSIGNMENTS = {
  name: 'name',
  observation: 'observation',
  status: 'status',
  description: 'description',
  purification: 'purification',
  tlc_solvents: 'tlc_solvents',
  rfValue: 'rf_value',
  timestampStart: 'timestamp_start',
  timestampStop: 'timestamp_stop',
  tlcDescription: 'tlc_description',
  dangerousProducts: 'dangerous_products',
  rxno: 'rxno',
  gaseous: 'gaseous',
  volume: 'volume',
  weight_percentage: 'weight_percentage',
};

// Same as PLAIN_ASSIGNMENTS, but these mutations also require a graphic refresh.
const GRAPHIC_AFFECTING_ASSIGNMENTS = {
  conditions: 'conditions',
  solvent: 'solvent',
};

// Handlers for types that need more than a single field assignment.
// Return `{ updateGraphic: true }` if the graphic must be refreshed; otherwise return nothing.
const CUSTOM_HANDLERS = {
  temperature: (reaction, value) => {
    reaction.temperature.userText = value;
    return { updateGraphic: true };
  },
  temperatureUnit: (reaction, value) => {
    reaction.temperature = reaction.convertTemperature(value);
    return { updateGraphic: true };
  },
  temperatureData: (reaction, value) => {
    reaction.temperature = value;
    return { updateGraphic: true };
  },
  duration: (reaction, value) => {
    reaction.durationDisplay = value;
    return { updateGraphic: true };
  },
  role: (reaction, value) => {
    reaction.role = value;
    reaction.name = reaction.nameFromRole(value);
  },
  vesselSizeAmount: (reaction, value) => {
    reaction.vessel_size.amount = value;
  },
  vesselSizeUnit: (reaction, value) => {
    reaction.vessel_size.unit = value;
    if (value === 'ml') {
      reaction.vessel_size.amount *= 1000;
    } else if (value === 'l') {
      reaction.vessel_size.amount /= 1000;
    }
  },
  useReactionVolumeForConcentration: (reaction, value) => {
    reaction.use_reaction_volume = value;
  },
};

const applyPlainAssignment = (reaction, type, value) => {
  const target = PLAIN_ASSIGNMENTS[type];
  if (!target) return null;
  reaction[target] = value;
  return {};
};

const applyGraphicAffectingAssignment = (reaction, type, value) => {
  const target = GRAPHIC_AFFECTING_ASSIGNMENTS[type];
  if (!target) return null;
  reaction[target] = value;
  return { updateGraphic: true };
};

const applyCustomHandler = (reaction, type, value) => {
  const handler = CUSTOM_HANDLERS[type];
  if (!handler) return null;
  return handler(reaction, value) || {};
};

const setReactionByType = (reaction, type, value) => {
  const options =
    applyPlainAssignment(reaction, type, value) ??
    applyGraphicAffectingAssignment(reaction, type, value) ??
    applyCustomHandler(reaction, type, value) ??
    {};

  return { newReaction: reaction, options };
};

export { setReactionByType };
