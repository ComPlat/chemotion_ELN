import CellLine from 'src/models/CellLine';

export default class CellLinesFetcher {
    static fetchByCollectionId(id, queryParams = {}, isSync = false) {
        return new Promise((resolve,reject) =>   {
            const result={};
            result.elements=[CellLine.buildEmpty(0)];
            result.page=1;
            result.pages=1;
            result.perPage=15;
            result.totalElements=1;
            result;  
            resolve(result)
        });
      }
}