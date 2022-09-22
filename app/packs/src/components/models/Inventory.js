/* eslint-disable no-underscore-dangle,  camelcase, semi,  no-unused-vars */
import Element from 'src/models/Element';

export default class Inventory extends Element {
  static buildEmpty() {
    return new Inventory({
      inventory_parameters: [{ cas: null, internal_label: null, purity: null, details: null }]
    });
  }

  get inventory_parameters() {
    return this._inventory_parameters;
  }

  set inventory_parameters(inventory_parameters) {
    if (inventory_parameters) {
      this._inventory_parameters = inventory_parameters;
    }
  }

  serialize() {
    return super.serialize({
      inventory_parameters: this.inventory_parameters
    })
  }


  invenParameters(parameter, value) {
    const object = Inventory.buildEmpty().inventory_parameters[0];
    const nexOb = Inventory.buildEmpty().inventory_parameters[0];
    object[parameter] = value;
    if (!this._inventory_parameters) {
      this._inventory_parameters = [];
      this._inventory_parameters.push(object);
    } else if (this._inventory_parameters) {
      this._inventory_parameters[0][parameter] = value;
    }
  }
}
