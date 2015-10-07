import Sample from '../models/Sample';
import Molecule from '../models/Molecule';

export default class SampleProxy extends Sample {
  constructor(args) {
    super(args)

    let sampleMethodsWithGetAndSet = [
      'name', 'external_label', 'location', 'description', 'impurities', 'amount_unit', 'amount_value',
      'purity', 'is_top_secret'
    ]

    sampleMethodsWithGetAndSet.forEach((m) => {
      Object.defineProperty(this, m, {
        get: function() { return this.methodOrRestrictionPattern(m) },
        set: function(arg) { super[m] = arg }
      })
    })

    let sampleMethodsWithGet = [
      'amount_mg', 'amount_ml', 'amount_mmol'
    ]

    sampleMethodsWithGet.forEach((m) => {
      Object.defineProperty(this, m, {
        get: function() { return this.methodOrRestrictionPattern(m) },
      })
    })

    let moleculeMethodsWithGetAndSet = [
      'molecule_density', 'molecule_boiling_point', 'molecule_melting_point'
    ]

    moleculeMethodsWithGetAndSet.forEach((m) => {
      Object.defineProperty(this, m, {
        get: function() { return this.methodOnMoleculeOrRestrictionPattern(m) },
        set: function(arg) { super[m] = arg }
      })
    })

    let moleculeMethodsWithGet = [
      'molecule_molecular_weight', 'molecule_formula', 'molecule_inchistring'
    ]

    moleculeMethodsWithGet.forEach((m) => {
      Object.defineProperty(this, m, {
        get: function() { return this.methodOnMoleculeOrRestrictionPattern(m) },
      })
    })
  }

  get restrictionPattern() {
    return '***';
  }

  methodOrRestrictionPattern(method) {
    if(super.isRestricted && super[method] == undefined) {
      return this.restrictionPattern;
    } else {
      return super[method];
    }
  }

  methodOnMoleculeOrRestrictionPattern(method) {
    if(super.isRestricted && super.molecule == undefined) {
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
}
