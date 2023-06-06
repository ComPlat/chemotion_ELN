import Element from 'src/models/Element';

export default class Vessel extends Element {
  static buildEmpty(collection_id){
    if(collection_id==undefined||!Number.isInteger(collection_id)){
        throw new Error('collection id is not valid: '+collection_id);
    }
    const vessel = new Vessel({
      collection_id,
      type: 'vessel',
      vessel_template_name: undefined,
      vessel_template_id: undefined
    });
    return vessel;
  }

  title() {
    return 'Vessel'
  }
}