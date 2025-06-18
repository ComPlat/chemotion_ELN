const setReactionByType = (reaction, type, value) => {
  let options = {};

  switch (type) {
    case 'name':
      reaction.name = value;
      break;
    case 'observation':
      reaction.observation = value;
      break;
    case 'status':
      reaction.status = value;
      break;
    case 'description':
      reaction.description = value;
      break;
    case 'purification':
      reaction.purification = value;
      break;
    case 'tlc_solvents':
      reaction.tlc_solvents = value;
      break;
    case 'rfValue':
      reaction.rf_value = value;
      break;
    case 'timestampStart':
      reaction.timestamp_start = value;
      break;
    case 'timestampStop':
      reaction.timestamp_stop = value;
      break;
    case 'tlcDescription':
      reaction.tlc_description = value;
      break;
    case 'temperature':
      reaction.temperature.userText = value;
      options = {updateGraphic: true}
      break;
    case 'temperatureUnit':
      reaction.temperature = reaction.convertTemperature(value);
      options = {updateGraphic: true}
      break;
    case 'temperatureData':
      reaction.temperature = value;
      options = {updateGraphic: true}
      break;
    case 'dangerousProducts':
      reaction.dangerous_products = value;
      break;
    case 'conditions':
      reaction.conditions = value;
      options = {updateGraphic: true}
      break;
    case 'solvent':
      reaction.solvent = value;
      options = {updateGraphic: true}
      break;
    case 'role':
      reaction.role = value;
      reaction.name = reaction.nameFromRole(value);
      break;
    case 'duration':
      reaction.durationDisplay = value;
      options = { updateGraphic: true }
      break;
    case 'rxno':
      reaction.rxno = value;
      break;
    case 'vesselSizeAmount':
      reaction.vessel_size.amount = value;
      break;
    case 'vesselSizeUnit':
      reaction.vessel_size.unit = value;
      if (value === 'ml') {
        reaction.vessel_size.amount = reaction.vessel_size.amount * 1000;
      } else if (value === 'l') {
        reaction.vessel_size.amount = reaction.vessel_size.amount / 1000;
      }
      break;
    case 'gaseous':
      reaction.gaseous = value;
      break;
  }

  return { newReaction: reaction, options: options }
}

export {setReactionByType}
