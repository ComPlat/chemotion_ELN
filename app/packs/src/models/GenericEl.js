import { isEmpty, filter } from 'lodash';
import { buildInitWF } from 'chem-generic-ui';
import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';
import Segment from 'src/models/Segment';

export default class GenericEl extends Element {
  // eslint-disable-next-line camelcase
  static buildEmpty(collection_id, klass) {
    const template = (klass && klass.properties_release) || {};
    return new GenericEl({
      collection_id,
      type: klass.name,
      element_klass_id: this.element_klass_id || (klass && klass.id),
      short_label: GenericEl.buildNewShortLabel(klass),
      name: `New ${klass.label}`,
      container: Container.init(),
      properties: buildInitWF(template),
      properties_release: template,
      element_klass: klass,
      can_copy: false,
      attachments: [],
      files: [],
      segments: [],
      wfLayers: template,
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
      properties_release: this.properties_release,
      container: this.container,
      attachments: this.attachments,
      files: this.files,
      segments: this.segments.map(s => s.serialize()),
    });
  }

  analysesContainers() {
    if (this.container.children.length === 0) {
      const analyses = Container.buildEmpty();
      analyses.container_type = 'analyses';
      this.container.children.push(analyses);
    }
    return this.container.children.filter(
      el => ~el.container_type.indexOf('analyses')
    );
  }

  analysisContainers() {
    let target = [];
    this.analysesContainers().forEach(aec => {
      const aics = aec.children.filter(
        el => ~el.container_type.indexOf('analysis')
      );
      target = [...target, ...aics];
    });
    return target;
  }

  datasetContainers() {
    let target = [];
    this.analysisContainers().forEach(aic => {
      const dts = aic.children.filter(
        el => ~el.container_type.indexOf('dataset')
      );
      target = [...target, ...dts];
    });
    return target;
  }

  static buildNewShortLabel(klass) {
    const { currentUser } = UserStore.getState();
    if (!currentUser) {
      return `new_${klass.label}`;
    }
    return `${currentUser.initials}-${klass.klass_prefix}${
      parseInt(currentUser.counters[klass.name] || 0, 10) + 1
    }`;
  }

  buildCopy(params = {}) {
    const copy = super.buildCopy();
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
      rf_value: 0.0,
      status: '',
    };
    const copy = element.buildCopy(params);
    copy.origin = { id: element.id, short_label: element.short_label };
    //copy.name = copy.nameFromRole(copy.role);
    return copy;
  }

  get klassType() {
    return 'GenericEl';
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get label() {
    return (this.element_klass && this.element_klass.label) || '';
  }

  get desc() {
    return (this.element_klass && this.element_klass.desc) || '';
  }

  get element_klass() {
    return this._element_klass;
  }

  set element_klass(klass) {
    this._element_klass = klass;
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

  get element_klass_id() {
    return this._element_klass_id;
  }

  set element_klass_id(element_klass_id) {
    this._element_klass_id = element_klass_id;
  }

  set segments(segments) {
    this._segments = (segments && segments.map(s => new Segment(s))) || [];
  }

  get segments() {
    return this._segments || [];
  }

  set klass_uuid(klass_uuid) {
    this._klass_uuid = klass_uuid;
  }

  get klass_uuid() {
    return this._klass_uuid;
  }

  get uuid() {
    return this._uuid;
  }

  set uuid(uuid) {
    this._uuid = uuid;
  }

  title() {
    return `${this.short_label}     ${this.name}`;
  }

  get isPendingToSave() {
    return !isEmpty(this) && (this.isNew || this.changed);
  }

  isValidated() {
    const validName = !!(this.name && this.name.trim() !== '');
    const layers =
      filter(
        this.properties && this.properties.layers,
        l => l.parent == null || l.parent.trim().length === 0
      ) || [];

    const fieldsDrag = layers
      .flatMap(l => l.fields)
      .filter(f => f.required && f.type.includes('drag_'));
    const vaildFieldsDrag =
      fieldsDrag.length ===
      fieldsDrag.filter(f => f.value && f.value.el_id).length;

    const fields = layers
      .flatMap(l => l.fields)
      .filter(f => f.required && !f.type.includes('drag_'));
    const vaildFields =
      fields.length ===
      fields.filter(f => f.value && f.value.trim() !== '').length;

    return validName && vaildFieldsDrag && vaildFields;
  }
}
