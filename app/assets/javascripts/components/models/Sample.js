import Molecule from './molecule';

export default class Sample {

  constructor(args) {
    Object.assign(this, args);
  }

  get name() {
    console.log(`Sample(${this.id}).name`)
    return this._name
  }

  set name(name) {
    console.log(`Sample(${this.id}).name=${name}`)
    this._name = name
  }

  get molecule() {
    return this._molecule
  }

  set molecule(molecule) {
    this._molecule = new Molecule(molecule)
  }

};
