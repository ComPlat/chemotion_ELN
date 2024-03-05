const objTags = selectedObjs => (
  selectedObjs.map(obj => ({ id: obj.id, type: obj.type }))
);

const abstractSettings = settings => (
  settings.map(obj => (
    { text: obj.text.replace(' ', '_'), checked: obj.checked }
  ))
);

const abstractConfigs = configs => (
  configs.map((obj) => {
    switch (obj.text) {
      case 'Page Break':
        return { text: 'page_break', checked: obj.checked };
      case 'Show all chemicals in schemes (unchecked to show products only)':
        if (obj.checked) {
          return { text: 'whole_diagram', checked: obj.checked };
        }
        return { text: 'product_diagram', checked: !obj.checked };
      default:
        return obj;
    }
  })
);

const paramize = (state) => {
  const { selectedObjs, splSettings, rxnSettings, configs, selMolSerials,
    fileName, fileDescription, imgFormat, template, siRxnSettings,
    prdAtts } = state;
  const params = {
    objTags: JSON.stringify(objTags(selectedObjs)),
    splSettings: JSON.stringify(abstractSettings(splSettings)),
    rxnSettings: JSON.stringify(abstractSettings(rxnSettings)),
    siRxnSettings: JSON.stringify(siRxnSettings),
    configs: JSON.stringify(abstractConfigs(configs)),
    prdAtts: JSON.stringify(prdAtts),
    imgFormat,
    fileName,
    fileDescription,
    templateId: template.id,
    molSerials: JSON.stringify(selMolSerials),
  };

  return params;
};

export default paramize;
