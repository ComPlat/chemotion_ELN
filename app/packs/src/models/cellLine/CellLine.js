import Element from 'src/models/Element';

export default class CellLine extends Element {

 static buildEmpty(collection_id) {
  if (collection_id === undefined || !Number.isInteger(Number(collection_id))) {
    throw new Error(`collection id is not valid: ${collection_id}`);
  }
    const cellLine = new CellLine({ 
      collectionId:Number(collection_id),
      type: 'cell_line'});
     
    return cellLine;
  }

  title() {
    return this.itemName;
  }
}
