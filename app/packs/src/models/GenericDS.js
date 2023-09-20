import { cloneDeep } from 'lodash';
import Element from 'src/models/Element';

export default class GenericDS extends Element {
  static buildEmpty(klass, containerId) {
    const template = (klass && klass.properties_release) || {};
    return new GenericDS({
      dataset_klass_id: klass && klass.id,
      element_type: 'Container',
      element_id: containerId,
      properties: template,
      properties_release: cloneDeep(template),
      klass_ols: klass.ols_term_id,
      klass_label: klass.label,
      changed: false,
    });
  }

  serialize() {
    return super.serialize({
      dataset_klass_id: this.dataset_klass_id,
      element_type: 'Container',
      element_id: this.element_id,
      properties: this.properties,
      properties_release: this.properties_release,
    });
  }

  get datasetKlassId() {
    return this.dataset_klass_id;
  }

  /**
   * @param {any} datasetKlassId
   */
  set datasetKlassId(datasetKlassId) {
    this.dataset_klass_id = datasetKlassId;
  }

  get getProperties() {
    return this.properties;
  }

  /**
   * @param {any} properties
   */
  set setProperties(properties) {
    this.properties = properties;
  }

  get klassOls() {
    return this.klass_ols;
  }

  set klassOls(klassOls) {
    this.klass_ols = klassOls;
  }

  get klassLabel() {
    return this.klass_label;
  }

  set klassLabel(klassLabel) {
    this.klass_label = klassLabel;
  }
}
