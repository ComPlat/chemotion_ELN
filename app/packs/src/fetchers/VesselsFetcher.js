import Vessel from 'src/models/Vessel';

export default class VesselsFetcher {
    static fetchByCollectionId(id, queryParams = {}, isSync = false) {
        return new Promise((resolve,reject) =>   {
            const result={};
            result.elements=[Vessel.buildEmpty(0)];
            result.page=1;
            result.pages=1;
            result.perPage=15;
            result.totalElements=1;
            result;  
            resolve(result)
        });
      }
}
