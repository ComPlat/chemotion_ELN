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
      options = {schemaChanged: true}
      break;
    case 'temperatureUnit':
      reaction.temperature = reaction.convertTemperature(value);
      options = {schemaChanged: true}
      break;
    case 'temperatureData':
      reaction.temperature = value;
      options = {schemaChanged: true}
      break;
    case 'dangerousProducts':
      reaction.dangerous_products = value;
      break;
    case 'solvent':
      reaction.solvent = value;
      options = {schemaChanged: true}
      break;
    case 'role':
      reaction.role = value;
      reaction.name = reaction.nameFromRole(value);
      break;
    case 'duration':
      reaction.duration_display.userText = value;
      options = { schemaChanged: true }
      break;
    case 'durationUnit':
      reaction.duration_display = reaction.convertDuration(value);
      options = { schemaChanged: true }
      break;
  }

  return { newReaction: reaction, options: options }
}

export {setReactionByType}
