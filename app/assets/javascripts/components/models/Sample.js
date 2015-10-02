import Molecule from './Molecule';

export default class Sample {

  constructor(args) {
    Object.assign(this, args);
  }

  get name() {
    //console.log(`Sample(${this.id}).name`)
    return this._name
  }

  set name(name) {
    //console.log(`Sample(${this.id}).name=${name}`)
    this._name = name
  }

  get amount() {
    return({
      value: amount_value,
      unit: amount_unit
    })
  }

  get amount_value() {
    return this._amount_value || 0;
  }

  set amount_value(amount_value) {
    this._amount_value = amount_value
  }


  get amount_unit() {
    return this._amount_unit || 'mg';
  }

  set amount_unit(amount_unit) {
    this._amount_unit = amount_unit
  }

  get amount_mg() {
    return this.convertAmount('mg')
  }

  get amount_ml() {
    return this.convertAmount('ml')
  }

  get amount_mmol() {
    return this.convertAmount('mmol')
  }

  // set density(density) {
  //   if(this.molecule) {
  //     this.molecule.density = density;
  //   }
  // }
  //
  get molecule_density() {
    return this.molecule && this.molecule.density || 1.0
  }
  //
  // set density(density) {
  //   if(this.molecule) {
  //     this.molecule.density = density;
  //   }
  // }
  //

  get molecule_molecular_weight() {
    return this.molecule && this.molecule.molecular_weight
  }

  get purity() {
    return this._purity || 1.0
  }

  set purity(purity) {
    this._purity = purity
  }

  get molecule() {
    return this._molecule
  }

  set molecule(molecule) {
    this._molecule = new Molecule(molecule)
  }

  //Menge in mmol = Menge (mg) * Reinheit  / Molmasse (g/mol)
	//Volumen (ml) = Menge (mg) / Dichte (g/ml)
	//Menge (mg)  = Volumen (ml) * Dichte
	//Menge (mg) = Menge (mmol)  * Molmasse / Reinheit

  convertAmount(targetUnit) {

    switch (targetUnit) {
      case 'mg':
        return this.amount_value * 1.0;
        break;
      case 'ml':
        return this.amount_value / this.molecule_density;
        break;
      case 'mmol':
        return this.amount_value * this.purity / this.molecule_molecular_weight;
        break;
      default:
        return this.amount_value
    }
  }

};
