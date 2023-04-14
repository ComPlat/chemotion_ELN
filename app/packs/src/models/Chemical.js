/* eslint-disable no-underscore-dangle,  camelcase, semi,  no-unused-vars */
import Element from 'src/models/Element';

export default class Chemical extends Element {
  static buildEmpty() {
    return new Chemical({
      chemical_data: [{ }],
      cas: null,
      changed: false
    });
  }

  get chemical_data() {
    return this._chemical_data;
  }

  set chemical_data(chemical_data) {
    if (chemical_data) {
      this._chemical_data = chemical_data;
    }
  }

  get cas() {
    return this._cas;
  }

  set cas(cas) {
    if (cas) {
      this._cas = cas;
    }
  }

  serialize() {
    return super.serialize({
      chemical_data: this.chemical_data,
      cas: this.cas
    })
  }

  buildChemical(parameter, value) {
    const chemicalData = Chemical.buildEmpty().chemical_data[0];
    chemicalData[parameter] = value;
    if (parameter !== 'cas' && !this._chemical_data) {
      this._chemical_data = [];
      this._chemical_data.push(chemicalData);
    } else if (parameter !== 'cas' && this._chemical_data) {
      this._chemical_data[0][parameter] = value;
    } else if (parameter === 'cas') {
      this._cas = value;
    }
    this.changed = true;
  }
}
