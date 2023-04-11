import Element from 'src/models/Element';

export default class CellLine extends Element {

    static buildEmpty(collectionId) {
        if(collectionId==undefined||!Number.isInteger(collectionId)){
            throw new Error('collection id is not valid: '+collectionId);
        }
        const cellLine=new CellLine({collectionId});
        return cellLine;
    }
}