import Sample from '../models/Sample';
import Molecule from '../models/Molecule';

export default class SampleProxy extends Sample {
  constructor(args) {
    super(args)

    let sampleMethodsWithGetAndSet = [
      'name', 'external_label', 'location', 'description', 'impurities', 'amount_unit', 'amount_value',
      'purity', 'is_top_secret', 'molecule_density', 'molecule_boiling_point', 'molecule_melting_point',
      'molecule_iupac_name'
    ]

    sampleMethodsWithGetAndSet.forEach((m) => {
      Object.defineProperty(this, m, {
        get: function() { return this.methodOrRestrictionPattern(m) },
        set: function(arg) { super[m] = arg }
      })
    })

    let sampleMethodsWithGet = [
      'amount_mg', 'amount_ml', 'amount_mmol', 'amount', 'molecule_molecular_weight', 'molecule_formula', 'molecule_inchistring'
    ]

    sampleMethodsWithGet.forEach((m) => {
      Object.defineProperty(this, m, {
        get: function() { return this.methodOrRestrictionPattern(m) },
      })
    })
  }

  serialize() {
    let sampleSerialization = super.serialize();

    Object.keys(sampleSerialization).forEach((method) => {
      if(sampleSerialization[method] == this.restrictionPattern) {
        delete sampleSerialization[method];
      }
    })

    return sampleSerialization;
  }

  get restrictionPattern() {
    return '***';
  }

  methodOrRestrictionPattern(method) {
    if(super.isRestricted() == true && (super.molecule == undefined || super[method] === undefined)) {
      return this.restrictionPattern;
    } else {
      return super[method];
    }
  }

  get amount() {
    return({
      value: this.amount_value,
      unit: this.amount_unit
    })
  }

  get molecule() {
    return this.methodOrRestrictionPattern('molecule');
  }

  set molecule(molecule) {
    super.molecule = new Molecule(molecule)
  }

  isMethodRestricted(method) {
    return this.isRestricted() == true && this.methodOrRestrictionPattern(method) == this.restrictionPattern;
  }

  isMethodDisabled(method) {
    return this.isMethodRestricted(method) == true && this.isNew
  }
}
