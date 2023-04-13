import Vessel from 'src/models/Vessel';

export default class VesselsFetcher {
    static fetchByCollectionId(id, queryParams = {}, isSync = false) {
        return new Promise((resolve,reject) =>   {
            const result={};
            var v1 = Vessel.buildEmpty(0)
            v1.vessel_name = "Vessel 1";
            v1.vessel_id = 1;
            var v2 = Vessel.buildEmpty(0)
            v2.vessel_name = "Vessel 1";
            v2.vessel_id = 1;
            var v3 = Vessel.buildEmpty(0)
            v3.vessel_name = "Vessel 1";
            v3.vessel_id = 1;
            var v4 = Vessel.buildEmpty(0)
            v4.vessel_name = "Vessel 2";
            v4.vessel_id = 2;
            var v5 = Vessel.buildEmpty(0)
            v5.vessel_name = "Vessel 2";
            v5.vessel_id = 2;
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
