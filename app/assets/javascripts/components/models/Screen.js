import Element from './Element';
import Wellplate from './Wellplate';

export default class Screen extends Element {
  static buildEmpty(collection_id) {
    return new Screen({
      collection_id: collection_id,
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

  static buildFromWellplatesAndCollectionId(clipboardWellplates, collection_id) {
    return new Screen({
      collection_id: collection_id,
      type: 'screen',
      name: 'New Screen with Wellplates',
      collaborator: '',
      requirements: '',
      conditions: '',
      result: '',
      description: '',
      wellplates: clipboardWellplates
    })
  }

  serialize() {
    return super.serialize({
      name: this.name,
      collaborator: this.collaborator,
      result: this.result,
      conditions: this.conditions,
      requirements: this.requirements,
      description: this.description,
      wellplate_ids: this.wellplate_ids
    })
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get collaborator() {
    return this._collaborator;
  }

  set collaborator(collaborator) {
    this._collaborator = collaborator;
  }

  get requirements() {
    return this._requirements;
  }

  set requirements(requirements) {
    this._requirements = requirements;
  }

  get conditions() {
    return this._conditions;
  }

  set conditions(conditions) {
    this._conditions = conditions;
  }

  get result() {
    return this._result;
  }

  set result(result) {
    this._result = result;
  }

  get description() {
    return this._description;
  }

  set description(description) {
    this._description = description;
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

  title() {
    return this.name;
  }
}
