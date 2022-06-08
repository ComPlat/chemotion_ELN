/* eslint-disable no-underscore-dangle,  camelcase, semi,  no-unused-vars */
import Element from './Element';

export default class Inventory extends Element {
  static buildEmpty() {
    return new Inventory({
      inventory_parameters: [{ cas: null, internal_label: null, purity: null, details: null }]
    });
  }

  get inventory_parameters() {
    // try {
    //   const jsonInventory = JSON.parse(this._inventory_parameters)
    //   const Inven = []
    //   if (jsonInventory) {
    //     Inven.push(jsonInventory)
    //   }
    //   // console.log(Inven);
    //   // console.log('Inven passover');
    //   return Inven
    // }
    // catch (e) {}
    // console.log(jsonInventory);
    return this._inventory_parameters;
  }

  set inventory_parameters(inventory_parameters) {
    console.log(this._inventory_parameters);
    if (inventory_parameters) {
      this._inventory_parameters = inventory_parameters;
    } 
    // else {
    //   this._inventory_parameters = null;
    // }
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
    // console.log(object);
    console.log(nexOb);
    // const object = {
    //   parameter: value
    // };
    // console.log(parameter);
    console.log(this._inventory_parameters);
    if (!this._inventory_parameters) {
      this._inventory_parameters = [];
      this._inventory_parameters.push(object);
    } else if (this._inventory_parameters) {
      console.log(this._inventory_parameters);
      this._inventory_parameters[0][parameter] = value;

      // if (parameter === 'cas') {
      //   this._inventory_parameters[0].cas = value;
      // } else if (parameter === 'internal_label') {
      //   this._inventory_parameters[0].internal_label = value;
      // }
    }
  }

  // addCas(value) {
  //   // consoe.log(value);
  //   const inventoryParameters = Inventory._inventory_parameters;
  //   console.log(Inventory);
  //   console.log(inventoryParameters);
  //   const object = {
  //     cas: value
  //   };
  //   inventoryParameters.push(object);
  //   if (inventoryParameters) {
  //     inventoryParameters = [];
  //     inventoryParameters.push(object);
  //   } else if (inventoryParameters) {
  //     inventoryParameters.push(object);
  //   }
  // }
}
