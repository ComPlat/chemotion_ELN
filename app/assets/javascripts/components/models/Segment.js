import Element from './Element';

export default class Segment extends Element {
  static buildEmpty(klass) {
    const template = (klass && klass.properties_template) || {};
    return new Segment({
      segment_klass_id: this.segment_klass_id || (klass && klass.id),
      properties: template.layers,
      select_options: template.select_options || {},
      segment_klass: klass,
      properties_template: []
    });
  }

  serialize() {
    return super.serialize({
      klassType: 'Segment',
      segment_klass: this.segment_klass,
      segment_klass_id: this.segment_klass_id,
      properties: this.properties,
    });
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get segment_klass() {
    return this._segment_klass;
  }

  set segment_klass(klass) {
    this._segment_klass = klass;
  }

  get klassName() {
    return this._klass_name;
  }
  set klassName(klassName) {
    this._klass_name = klassName;
  }


  get properties() {
    return this._properties;
  }

  set properties(properties) {
    this._properties = properties;
  }

  get select_options() {
    return this._select_options;
  }

  set select_options(select_options) {
    this._select_options = select_options;
  }

  get segment_klass_id() {
    return this._segment_klass_id;
  }

  set segment_klass_id(segment_klass_id) {
    this._segment_klass_id = segment_klass_id;
  }
}
