import Element from './Element';
import Molecule from './Molecule';
import Analysis from './Analysis';
import _ from 'lodash';

import UserActions from '../actions/UserActions';
import UserStore from '../stores/UserStore';

export default class Sample extends Element {
  isMethodDisabled() {
    return false;
  }

  isMethodRestricted(m) {
    return false;
  }

  static copyFromSampleAndCollectionId(sample, collection_id) {
    let newSample = sample.buildCopy();
    newSample.collection_id = collection_id;

    return newSample;
  }

  buildCopy() {
    let sample = super.buildCopy();
    sample.short_label = sample.short_label + " Copy";
    return sample;
  }

  buildChild() {
    Sample.counter += 1;

    //increase subsample count per sample on client side, as we have no persisted data at this moment
    let children_count = parseInt(Sample.children_count[this.id] || this.children_count);
    children_count += 1;
    Sample.children_count[this.id] = children_count;

    let splitSample = new Sample(this);
    splitSample.parent_id = this.id;
    splitSample.id = Element.buildID();
    splitSample.name = null;
    splitSample.short_label += "-" + children_count;
    splitSample.created_at = null;
    splitSample.updated_at = null;
    splitSample.target_amount_value = 0;
    splitSample.real_amount_value = null;
    splitSample.is_split = true;
    splitSample.is_new = true;
    return splitSample;
  }

  get isSplit() {
    return this.is_split
  }

  serialize() {
    return super.serialize({
      name: this.name,
      external_label: this.external_label,
      target_amount_value: this.target_amount_value,
      target_amount_unit: this.target_amount_unit,
      real_amount_value: this.real_amount_value,
      real_amount_unit: this.real_amount_unit,
      description: this.description,
      purity: this.purity,
      solvent: this.solvent,
      impurities: this.impurities,
      location: this.location,
      molfile: this.molfile,
      molecule: this.molecule,
      is_top_secret: this.is_top_secret || false,
      parent_id: this.parent_id,
      analyses: this.analyses.map(a => a.serialize()),
      is_split: this.isSplit || false
    })
  }

  static buildEmpty(collection_id) {
    let sample = new Sample({
      collection_id: collection_id,
      type: 'sample',
      external_label: '',
      target_amount_value: 0,
      target_amount_unit: 'mg',
      description: '',
      purity: 1,
      solvent: '',
      impurities: '',
      location: '',
      molfile: '',
      molecule: { id: '_none_' },
      analyses: []
    });

    sample.short_label = Sample.buildNewSampleShortLabelForCurrentUser();
    return sample;
  }

  static buildNewSampleShortLabelForCurrentUser() {
    let {currentUser} = UserStore.getState();
    if(!currentUser) {
      return 'NEW SAMPLE';
    } else {
      return `${currentUser.initials}-${currentUser.samples_created_count + 1}`;
    }
  }

  get is_top_secret() {
    return this._is_top_secret;
  }

  set is_top_secret(is_top_secret) {
    this._is_top_secret = is_top_secret;
  }

  title() {
    return this.name ? `${this.short_label} ${this.name}` : this.short_label
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get short_label() {
    return this._short_label;
  }

  set short_label(short_label) {
    this._short_label = short_label;
  }

  get external_label() {
    return this._external_label;
  }

  set external_label(label) {
    this._external_label = label;
  }

  get location() {
    return this._location;
  }

  set location(location) {
    this._location = location;
  }

  get description() {
    return this._description;
  }

  set description(description) {
    this._description = description;
  }

  get impurities() {
    return this._impurities;
  }

  set impurities(impurities) {
    this._impurities = impurities;
  }

  setAmountAndNormalizeToMilligram(amount_value, amount_unit) {
    this.amount_value = this.convertToMilligram(amount_value, amount_unit)
    this.amount_unit = 'mg'
  }


  get amountType() {
    return this._current_amount_type || this.defaultAmountType();
  }

  set amountType(amount_type) {
    this._current_amount_type = amount_type;
  }

  defaultAmountType() {
    return this.real_amount_value ? 'real' : 'target';
  }

  // amount proxy

  get amount() {
    return({
      value: this.amount_value,
      unit: this.amount_unit
    })
  }

  get amount_value() {
    return this.amountType === 'real' ? this.real_amount_value : this.target_amount_value;
  }

  set amount_value(amount_value) {
    if(this.amountType === 'real') {
      this.real_amount_value = amount_value;
    } else {
      this.target_amount_value = amount_value;
    }
  }

  get amount_unit() {
    return (this.amountType === 'real' ? this.real_amount_unit : this.target_amount_unit) || 'mg';
  }

  set amount_unit(amount_unit) {
    if(this.amountType === 'real') {
      this.real_amount_unit = amount_unit;
    } else {
      this.target_amount_unit = amount_unit;
    }
  }

  // target amount

  get target_amount_value() {
    return this._target_amount_value;
  }

  set target_amount_value(amount_value) {
    this._target_amount_value = amount_value
  }

  get target_amount_unit() {
    return this._target_amount_unit || 'mg';
  }

  set target_amount_unit(amount_unit) {
    this._target_amount_unit = amount_unit
  }

  // real amount

  get real_amount_value() {
    return this._real_amount_value;
  }

  set real_amount_value(amount_value) {
    this._real_amount_value = amount_value
  }

  get real_amount_unit() {
    return this._real_amount_unit || 'mg';
  }

  set real_amount_unit(amount_unit) {
    this._real_amount_unit = amount_unit
  }

  get amount_mg() {
    return this.convertMilligramToUnit(this.amount_value, 'mg')
  }

  get amount_ml() {
    return this.convertMilligramToUnit(this.amount_value, 'ml')
  }

  get amount_mmol() {
    return this.convertMilligramToUnit(this.amount_value, 'mmol')
  }

  //Menge in mmol = Menge (mg) * Reinheit  / Molmasse (g/mol)
	//Volumen (ml) = Menge (mg) / Dichte (g/ml)
	//Menge (mg)  = Volumen (ml) * Dichte
	//Menge (mg) = Menge (mmol)  * Molmasse / Reinheit

  convertMilligramToUnit(amount_mg, unit) {

    switch (unit) {
      case 'mg':
        return amount_mg;
        break;
      case 'ml':
        let molecule_density = this.molecule_density || 1.0;
        if(molecule_density) {
          return amount_mg / molecule_density;
          break;
        }
      case 'mmol':
        let molecule_molecular_weight = this.molecule_molecular_weight
        if (molecule_molecular_weight) {
          return amount_mg * (this.purity || 1.0) / molecule_molecular_weight;
          break;
        }
      default:
        return amount_mg
    }
  }

  convertToMilligram(amount_value, amount_unit) {
    switch (amount_unit) {
      case 'mg':
        return amount_value;
        break;
      case 'ml':
        return amount_value * (this.molecule_density || 1.0);
        break;
      case 'mmol':
        return amount_value / (this.purity || 1.0) * this.molecule_molecular_weight;
        break;
      default:
        return amount_value
    }
  }

  get molecule_iupac_name() {
    return this.molecule && this.molecule.iupac_name;
  }

  set molecule_iupac_name(iupac_name) {
    this.molecule.iupac_name = iupac_name;
  }

  get molecule_density() {
    return this.molecule && this.molecule.density;
  }

  set molecule_density(density) {
    this.molecule.density = density;
  }

  get molecule_molecular_weight() {
    return this.molecule && this.molecule.molecular_weight
  }

  get molecule_formula() {
    return this.molecule && this.molecule.sum_formular;
  }

  get molecule_inchistring() {
    return this.molecule && this.molecule.inchistring;
  }

  get molecule_boiling_point() {
    return this.molecule && this.molecule.boiling_point;
  }

  set molecule_boiling_point(bp) {
    this.molecule.boiling_point = bp;
  }

  get molecule_melting_point() {
    return this.molecule && this.molecule.melting_point;
  }

  set molecule_melting_point(mp) {
    this.molecule.melting_point = mp;
  }

  get purity() {
    return this._purity
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

  get svgPath() {
    return this.molecule && this.molecule.svgPath
  }

  //todo: have a dedicated Material Sample subclass

  set equivalent(equivalent) {
    this._equivalent = equivalent;
  }

  get equivalent() {
    return this._equivalent;
  }

  serializeMaterial() {
    let params = this.serialize();
    let extra_params = {
      equivalent: this.equivalent,
      reference: this.reference || false
    }
    _.merge(params, extra_params);
    return params;
  }

  // -- Analyses --

  get analyses() {
    return this._analyses || [];
  }

  set analyses(analyses) {
    this._analyses = analyses.map(a => new Analysis(a));
  }

  addAnalysis(analysis) {
    let analyses = this.analyses;
    analyses.push(analysis);
    this.analyses = analyses;
  }

  updateAnalysis(changedAnalysis) {
    this._analyses.find(analysis => {
      if(analysis.id == changedAnalysis.id) {
        const analysisId = this.analyses.indexOf(analysis);
        this.analyses[analysisId] = changedAnalysis;
      }
    });
  }
};

Sample.counter = 0;
Sample.children_count = {}
