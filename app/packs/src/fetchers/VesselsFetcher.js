import Vessel from 'src/models/Vessel';

export default class VesselsFetcher {
    static fetchByCollectionId(id, queryParams = {}, isSync = false) {
        return new Promise((resolve,reject) =>   {
            const result={};
            var v1 = Vessel.buildEmpty(0)
            v1.vessel_template_name = "Vessel Template 1";
            v1.vessel_template_id = 1;
            v1.id=1;
            var v2 = Vessel.buildEmpty(0)
            v2.vessel_template_name = "Vessel Template 1";
            v2.vessel_template_id = 1;
            v2.id=2;
            var v3 = Vessel.buildEmpty(0)
            v3.vessel_template_name = "Vessel Template 1";
            v3.vessel_template_id = 1;
            v3.id=3;
            var v4 = Vessel.buildEmpty(0)
            v4.vessel_template_name = "Vessel Template 2";
            v4.vessel_template_id = 2;
            v4.id=4;
            var v5 = Vessel.buildEmpty(0)
            v5.vessel_template_name = "Vessel Template 2";
            v5.vessel_template_id = 2;
            v5.id=5;
            result.elements=[v1,v2,v3,v4,v5];
            result.page=1;
            result.pages=1;
            result.perPage=15;
            result.totalElements=5;
            result;  
            resolve(result)
        });
      }
}
