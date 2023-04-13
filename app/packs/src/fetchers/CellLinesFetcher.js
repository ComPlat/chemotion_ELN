import CellLine from 'src/models/cellLine/CellLine';

export default class CellLinesFetcher {
    static fetchByCollectionId(id, queryParams = {}, isSync = false) {
        return new Promise((resolve,reject) =>   {
            const result={};
            var c1=CellLine.buildEmpty(0)
            c1.cellLineName = 'Cell line 123';
            c1.cellLineId = 1;
            var c2=CellLine.buildEmpty(0)
            c2.cellLineName = 'Cell line 123';
            c2.cellLineId = 1;
            var c3=CellLine.buildEmpty(0)
            c3.cellLineName = 'Cell line 123';
            c3.cellLineId = 1;
            var c4=CellLine.buildEmpty(0)
            c4.cellLineName = 'Cell line 456';
            c4.cellLineId = 2;
            var c5=CellLine.buildEmpty(0)
            c5.cellLineName = 'Cell line 456';
            c5.cellLineId = 2;
            result.elements=[c1,c2,c3,c4,c5];
            result.page=1;
            result.pages=1;
            result.perPage=15;
            result.totalElements=5;
            result;  
            resolve(result)
        });
      }
}