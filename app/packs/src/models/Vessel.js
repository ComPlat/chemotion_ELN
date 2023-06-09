import Element from 'src/models/Element';

export default class Vessel extends Element {
  static buildEmpty(collection_id){
    if (collection_id === undefined || !Number.isInteger(Number(collection_id))) {
        throw new Error(`collection id is not valid: ${collection_id}`);
    }
    const vessel = new Vessel({
      collectionId:Number(collection_id),
      type: 'vessel'
    });
    return vessel;
  }

  title() {
    return this.vesselName;
  }
}