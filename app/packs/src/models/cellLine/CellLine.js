import Element from 'src/models/Element';
import Container from 'src/models/Container.js';

export default class CellLine extends Element {

 static buildEmpty(collection_id) {
  if (collection_id === undefined || !Number.isInteger(Number(collection_id))) {
    throw new Error(`collection id is not valid: ${collection_id}`);
  }
    const cellLine = new CellLine({ 
      container: Container.init(),
      collectionId:Number(collection_id),
      type: 'cell_line'});
     
    return cellLine;
  }

  title() {
    return this.itemName;
  }
}
