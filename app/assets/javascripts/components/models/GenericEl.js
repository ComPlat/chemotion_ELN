import { isEmpty, filter } from 'lodash';
import Element from './Element';
import Container from './Container';
import UserStore from '../stores/UserStore';

export default class GenericEl extends Element {

  static buildEmpty(collection_id, klass) {
    const template = (klass && klass.properties_template) || {};
    return new GenericEl({
      collection_id,
      type: klass.name,
      element_klass_id: this.element_klass_id || (klass && klass.id),
      short_label: GenericEl.buildNewShortLabel(klass),
      name: `New ${klass.label}`,
      container: Container.init(),
      properties: template.layers,
      element_klass: klass,
      can_copy: false,
      properties_template: []
    });
  }

  serialize() {
    return super.serialize({
      name: this.name,
      can_copy: true,
      klassType: 'GenericEl',
      element_klass: this.element_klass,
      element_klass_id: this._element_klass_id,
      properties: this.properties,
      //select_options: this.select_options,
      container: this.container,
    });
  }

  static buildNewShortLabel(klass) {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return `new_${klass.label}`; }
    return `${currentUser.initials}-${klass.klass_prefix}${parseInt(currentUser.counters[klass.name] || 0, 10) + 1}`;
  }


  buildCopy(params = {}) {
    const copy = super.buildCopy();
    console.log(copy);
    Object.assign(copy, params);
    copy.short_label = GenericEl.buildNewShortLabel(copy.element_klass);
    copy.can_update = true;
    copy.can_copy = false;
    return copy;
  }

  static copyFromCollectionId(element, collection_id) {
    const params = {
      collection_id,
      role: 'parts',
      timestamp_start: '',
      timestamp_stop: '',
      rf_value: 0.00,
      status: '',
    }
    const copy = element.buildCopy(params);
    copy.origin = { id: element.id, short_label: element.short_label };
    //copy.name = copy.nameFromRole(copy.role);
    return copy;
  }

  get klassType() {
    return 'GenericEl'
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get element_klass() {
    return this._element_klass;
  }

  set element_klass(klass) {
    this._element_klass = klass;
  }

  get klassName() {
    return this._klass_name;
    //console.log(this.element_klass);
    //return this.element_klass.name;
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

  get element_klass_id() {
    return this._element_klass_id;
  }

  set element_klass_id(element_klass_id) {
    this._element_klass_id = element_klass_id;
  }

  title() {
    return `${this.short_label}     ${this.name}` ;
  }

  get isPendingToSave() {
    return !isEmpty(this) && (this.isNew || this.changed);
  }

  isValidated() {
    const validName = !!(this.name && this.name.trim() !== '');
    const layers = filter(this.properties, l => l.parent == null || l.parent.trim().length === 0) || [];

    // required fileds, draggable only
    const fieldsDrag = layers.flatMap(l => l.fields).filter(f => f.required && f.type.includes('drag_'));
    const vaildFieldsDrag = fieldsDrag.length === fieldsDrag.filter(f => f.value && f.value.el_id).length;

    // required fileds, excludes draggable
    const fields = layers.flatMap(l => l.fields).filter(f => f.required && !f.type.includes('drag_'));
    const vaildFields = fields.length === fields.filter(f => f.value && f.value.trim() !== '').length;

    // hard-code for now, wait for new attribute
    const specific = this.properties.type_layer && this.properties.type_layer.fields.find(e => e.field === 'mof_method');
    const specificValue = (typeof specific !== 'undefined' && specific !== null) ? specific.value : null;
    if (specificValue) {
      const vaildSpecificLayer = this.properties[specificValue].fields.filter(f => f.required && (!f.value || f.value.trim() === '')).length < 1;
      console.log(`vaildSpecificLayer: ${vaildSpecificLayer}`);
      return validName && vaildFieldsDrag && vaildFields && vaildSpecificLayer;
    }
    return validName && vaildFieldsDrag && vaildFields;
  }
}
