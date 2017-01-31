const paramize = (state) => {
  const { selectedObjs, splSettings, rxnSettings, configs,
          fileName, fileDescription, imgFormat } = state;
  const params = {
    objTags: JSON.stringify(objTags(selectedObjs)),
    splSettings: JSON.stringify(abstractSplSettings(splSettings)),
    rxnSettings: JSON.stringify(rxnSettings),
    configs: JSON.stringify(abstractConfigs(configs)),
    imgFormat: imgFormat,
    fileName: fileName,
    fileDescription: fileDescription,
  }

  return params;
};

const objTags = (selectedObjs) => {
  return selectedObjs.map(obj => {
    return { id: obj.id, type: obj.type };
  });
};

const abstractSplSettings = (splSettings) => {
    return splSettings.map(obj => {
      return { text: obj.text.replace(" ", "_"), checked: obj.checked };
    });
  }

const abstractConfigs = (configs) => {
    return configs.map(obj => {
      switch(obj.text) {
        case 'Page Break':
          return { text: "page_break", checked: obj.checked };
        case 'Show all material in diagrams (unchecked to show Products only)':
          if(obj.checked) {
            return { text: "whole_diagram", checked: obj.checked };
          } else {
            return { text: "product_diagram", checked: !obj.checked };
          }
        default:
          return obj;
      }
    });
  }

export default paramize
