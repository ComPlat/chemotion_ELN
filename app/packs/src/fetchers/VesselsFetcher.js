import Vessel from 'src/models/Vessel';

export default class VesselsFetcher {
  static mockData = {};

  static fetchByCollectionId(id, queryParams = {}, isSync = false) {
    return new Promise((resolve,reject) =>   {
      const result={};
      result.elements=VesselsFetcher.mockData;
      result.page=1;
      result.pages=1;
      result.perPage=15;
      result.totalElements=VesselsFetcher.mockData.length;
      result;
      resolve(result);
    });
  }

  static fetchById(id) {
    return VesselsFetcher.fetchByCollectionId(0)
    .then((result) => {
      return result.elements[Number(id)-1]
    });
  }

  static update(vesselItem){
    const index = VesselsFetcher.mockData.findIndex((vessel) => vesselItem.id === vessel.id);
    if(index===-1){
      index=VesselsFetcher.mockData.length;
    }
    VesselsFetcher.mockData[index] = vesselItem;
    return VesselsFetcher.fetchById(index + 1);
  }

  static {
    var v1 = Vessel.buildEmpty(0, 'DP-V1')
    v1.vesselTemplateName = "Vessel Template 1";
    v1.vesselTemplateId = 1;
    v1.id='1';
    // Template Info
    v1.vesselDetails = 'multi-neck';
    v1.vesselType = 'round bottom flask';
    v1.volumeUnit = 'ml';
    v1.volumeAmount = '250';
    v1.materialType = 'glass';
    v1.materialDetails = 'transparent';
    // Vessel Name & Description
    v1.vesselName = VesselsFetcher.vesselName;
    v1.vesselDescription = VesselsFetcher.vesselDescription;

    var v2 = Vessel.buildEmpty(0, 'DP-V2')
    v2.vesselTemplateName = "Vessel Template 1";
    v2.vesselTemplateId = 1;
    v2.id='2';
    // Template Info
    v2.vesselDetails = 'multi-neck';
    v2.vesselType = 'round bottom flask';
    v2.volumeUnit = 'ml';
    v2.volumeAmount = '250';
    v2.materialType = 'glass';
    v2.materialDetails = 'transparent';
    // Vessel Name & Description
    v2.vesselName = '';
    v2.vesselDescription = '';

    var v3 = Vessel.buildEmpty(0, 'DP-V3')
    v3.vesselTemplateName = "Vessel Template 1";
    v3.vesselTemplateId = 1;
    v3.id='3';
    // Template Info
    v3.vesselDetails = 'multi-neck';
    v3.vesselType = 'round bottom flask';
    v3.volumeUnit = 'ml';
    v3.volumeAmount = '250';
    v3.materialType = 'glass';
    v3.materialDetails = 'transparent';
    // Vessel Name & Description
    v3.vesselName = '';
    v3.vesselDescription = '';

    var v4 = Vessel.buildEmpty(0, 'DP-V4')
    v4.vesselTemplateName = "Vessel Template 2";
    v4.vesselTemplateId = 2;
    v4.id='4';
    // Template Info
    v4.vesselDetails = 'single-neck';
    v4.vesselType = 'conical flask';
    v4.volumeUnit = 'ml';
    v4.volumeAmount = '500';
    v4.materialType = 'glass';
    v4.materialDetails = 'n/a';
    // Vessel Name & Description
    v4.vesselName = '';
    v4.vesselDescription = '';

    var v5 = Vessel.buildEmpty(0, 'DP-V5')
    v5.vesselTemplateName = "Vessel Template 2";
    v5.vesselTemplateId = 2;
    v5.id='5';
    // Template Info
    v5.vesselDetails = 'single-neck';
    v5.vesselType = 'conical flask';
    v5.volumeUnit = 'ml';
    v5.volumeAmount = '500';
    v5.materialType = 'glass';
    v5.materialDetails = 'n/a';
    // Vessel Name & Description
    v5.vesselName = '';
    v5.vesselDescription = '';

    VesselsFetcher.mockData = [v1,v2,v3,v4,v5]
  }
}
