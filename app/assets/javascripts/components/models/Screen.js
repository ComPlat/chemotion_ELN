import Element from './Element';
import Wellplate from './Wellplate';

export default class Screen extends Element {

  static buildEmpty() {
    return new Screen({
      id: '_new_',
      type: 'screen',
      name: 'New Screen',
      collaborator: '',
      requirements: '',
      conditions: '',
      result: '',
      description: '',
      wellplates: []
    })
  }

  get wellplates() {
    return this._wellplates;
  }

  set wellplates(wellplates) {
    this._wellplates = wellplates.map(w => new Wellplate(w));
  }

  get wellplate_ids() {
    return this._wellplates.map(w => w.id);
  }
}
