import React from 'react'
import Element from './Element';
import Molecule from './Molecule';
import Analysis from './Analysis';
import _ from 'lodash';
import UserActions from '../actions/UserActions';
import UserStore from '../stores/UserStore';

export default class Sample extends Element {
  isMethodRestricted(m) {
    return false;
  }

  static copyFromSampleAndCollectionId(sample, collection_id, structure_only = false) {
    let newSample = sample.buildCopy()

    if(structure_only)
      newSample.filterSampleData()

    newSample.collection_id = collection_id
    if (sample.name) newSample.name = sample.name
    if (sample.external_label)
      newSample.external_label = sample.external_label
    if (sample.elemental_compositions)
      newSample.elemental_compositions = sample.elemental_compositions

    return newSample
  }

  filterSampleData() {
    let el_c = this.elemental_compositions.find(function(item) {
      if(item.composition_type == 'formula') {
        item.id = null;
        return item;
      }
    });
    this.elemental_compositions = el_c ? [el_c] : [];
    this.elemental_compositions.push({
      composition_type: 'found',
      data: {},
      description: 'Experimental'
    });

    if(this.contains_residues) { this.setDefaultResidue(); }
  }

  setDefaultResidue() {
    // set default polymer data
    this.residues = [
      {
        residue_type: 'polymer', custom_info: {
          "formula": 'CH',
          "loading": null,
          "polymer_type": "polystyrene",
          "loading_type": "external",
          "external_loading": 0.0,
          "reaction_product": (this.reaction_product ? true : null),
          "cross_linkage": null
        }
      }
    ];
  }

  buildCopy() {
    let sample = super.buildCopy()
    sample.short_label = sample.short_label + " Copy"
    return sample;
  }

  buildChild() {
    Sample.counter += 1;

    //increase subsample count per sample on client side, as we have no persisted data at this moment
    let children_count = parseInt(Sample.children_count[this.id] || this.children_count);
    children_count += 1;
    Sample.children_count[this.id] = children_count;

    let splitSample = this.clone();
    splitSample.parent_id = this.id;
    splitSample.id = Element.buildID();

    if (this.name) splitSample.name = this.name
    if (this.external_label)
      splitSample.external_label = this.external_label
    if (this.elemental_compositions)
      splitSample.elemental_compositions = this.elemental_compositions

    splitSample.short_label += "-" + children_count;
    splitSample.created_at = null;
    splitSample.updated_at = null;
    splitSample.target_amount_value = 0;
    splitSample.real_amount_value = null;
    splitSample.is_split = true;
    splitSample.is_new = true;
    return splitSample;
  }

  buildChildWithoutCounter() {
    let splitSample = this.clone();
    splitSample.parent_id = this.id;
    splitSample.id = Element.buildID();

    if (this.name) splitSample.name = this.name
    if (this.external_label)
      splitSample.external_label = this.external_label
    if (this.elemental_compositions)
      splitSample.elemental_compositions = this.elemental_compositions

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
    let serialized = super.serialize({
      name: this.name,
      external_label: this.external_label,
      target_amount_value: this.target_amount_value,
      target_amount_unit: this.target_amount_unit,
      real_amount_value: this.real_amount_value,
      real_amount_unit: this.real_amount_unit,
      description: this.description,
      purity: this.purity,
      short_label: this.short_label,
      solvent: this.solvent,
      impurities: this.impurities,
      location: this.location,
      molfile: this.molfile,
      molecule: this.molecule && this.molecule.serialize(),
      sample_svg_file: this.sample_svg_file,
      is_top_secret: this.is_top_secret || false,
      parent_id: this.parent_id,
      density: this.density,
      boiling_point: this.boiling_point,
      melting_point: this.melting_point,
      analyses: this.analyses.map(a => a.serialize()),
      residues: this.residues,
      elemental_compositions: this.elemental_compositions,
      is_split: this.is_split || false,
      is_new: this.is_new,
      imported_readout: this.imported_readout
    });

    return serialized;
  }

  static buildEmpty(collection_id) {
    let sample = new Sample({
      collection_id: collection_id,
      type: 'sample',
      external_label: '',
      target_amount_value: 0,
      target_amount_unit: 'g',
      description: '',
      purity: 1,
      density: 1,
      solvent: '',
      impurities: '',
      location: '',
      molfile: '',
      molecule: { id: '_none_' },
      analyses: [],
      residues: [],
      elemental_compositions: [{
        composition_type: 'found',
        data: {}
      }],
      imported_readout: '',
      attached_amount_mg: '' // field for polymers calculations
    });

    sample.short_label = Sample.buildNewSampleShortLabelForCurrentUser();
    return sample;
  }

  static buildReactionSample(collection_id, delta, materialGroup = null, molecule = { id: '_none_'}) {
    let target_molecule = molecule.molecule == undefined ? molecule : molecule.molecule
    let sample = new Sample({
      collection_id: collection_id,
      type: 'sample',
      external_label: '',
      target_amount_value: 0,
      target_amount_unit: 'g',
      description: '',
      purity: 1,
      density: 1,
      solvent: '',
      impurities: '',
      location: '',
      molfile: molecule.molfile || '',
      molecule:  target_molecule,
      analyses: [],
      elemental_compositions: [{
        composition_type: 'found',
        data: {}
      }],
      residues: [],
      imported_readout: ''
    });
    sample.sample_svg_file = molecule.sample_svg_file;

    if(molecule.residues && molecule.residues.length > 0) {
      sample.residues = molecule.residues;
      sample.contains_residues = true;

      if(materialGroup == 'products')
        sample.loading = 0;
    }

    // allow zero loading for reaction product
    sample.reaction_product = (materialGroup == 'products');

    // Skip short_label for reactants and solvents
    if (materialGroup != "reactants" && materialGroup != "solvents")
      sample.short_label = Sample.buildNewSampleShortLabelForCurrentUser(delta)
    else
      sample.short_label = materialGroup

    return sample;
  }

  static buildNewSampleShortLabelWithCounter(counter) {
    let {currentUser} = UserStore.getState();

    return `${currentUser.initials}-${counter}`;
  }

  static buildNewSampleShortLabelForCurrentUser(delta = 0) {
    let {currentUser} = UserStore.getState();
    if(!currentUser) {
      return 'NEW SAMPLE';
    } else {
      return `${currentUser.initials}-${currentUser.samples_count + delta +  1}`;
    }
  }

  get is_top_secret() {
    return this._is_top_secret;
  }

  set is_top_secret(is_top_secret) {
    this._is_top_secret = is_top_secret;
  }

  set contains_residues(value) {
    this._contains_residues = value;

    if(value) {
      if(!this.residues.length) {

        this.setDefaultResidue();
      } else {
        this.residues[0]._destroy = undefined;
      }

      this.elemental_compositions.map(function(item) {
        if(item.composition_type == 'formula')
          item._destroy = true;
      });
    } else {
      this.sample_svg_file = '';
      if(this.residues.length)
        this.residues[0]._destroy = true; // delete residue info

      this.elemental_compositions.map(function(item) {
        if(item.composition_type == 'loading')
          item._destroy = true;
      });
    }
  }

  get contains_residues() {
    return this._contains_residues;
  }

  title(atList=false, selected=false) {
    const profile = UserStore.getState().profile
    const show_external_name = profile ? profile.show_external_name : false
    const external_label = this.external_label;
    const extLabelClass =  this.highlight_label(atList, !selected);
    const nameClass =  this.highlight_label(atList, false);
    const short_label = this.name
      ? <span>
          <span>{this.short_label}</span>
          <span className={nameClass}>{`  ${this.name}`}</span>
        </span>
      : this.short_label

    if(show_external_name) {
      return (external_label ? <span className={extLabelClass}>{external_label}</span> : short_label);
    } else {
      return short_label;
    }
  }

  highlight_label(atList, gray) {
    let cssClass = null;
    if(atList && !gray) {
      cssClass = 'label--bold';
    } else if(atList && gray) {
      cssClass = 'label--bold c-text--grey';
    }
    return cssClass;
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

  get preferred_label() {
    return this._external_label || this.molecule.iupac_name || this.molecule.sum_formular;
  }

  iupac_name_tag(length) {
    let iupac_name = this.molecule.iupac_name || "";
    return iupac_name.length > length ?
      iupac_name.slice(0, length) + "..."
      :
      iupac_name
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

  get imported_readout() {
    return this._imported_readout;
  }

  set imported_readout(imported_readout) {
    this._imported_readout = imported_readout;
  }


  setAmountAndNormalizeToGram(amount) {
    this.amount_value = this.convertToGram(amount.value, amount.unit)
    this.amount_unit = 'g'
  }

  setAmountAndUnit(amount) {
    this.amount_value = amount.value
    this.amount_unit = amount.unit
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

  get defined_part_amount() {
    let mw = this.molecule_molecular_weight;
    return this.amount_mol * mw / 1000.0;
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
    return (this.amountType === 'real' ? this.real_amount_unit : this.target_amount_unit) || 'g';
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
    return this._target_amount_unit || 'g';
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
    return this._real_amount_unit || 'g';
  }

  set real_amount_unit(amount_unit) {
    this._real_amount_unit = amount_unit
  }


  get amount_g() {
    return this.convertToGram(this.amount_value, this.amount_unit)
  }

  get amount_l() {
    return this.convertGramToUnit(this.amount_g, 'l')
  }

  get amount_mol() {
    return this.convertGramToUnit(this.amount_g, 'mol')
  }

  //Menge in mmol = Menge (mg) * Reinheit  / Molmasse (g/mol)
	//Volumen (ml) = Menge (mg) / Dichte (g/ml) / 1000
	//Menge (mg)  = Volumen (ml) * Dichte (g/ml) * 1000
	//Menge (mg) = Menge (mmol)  * Molmasse (g/mol) / Reinheit

  convertGramToUnit(amount_g = 0, unit) {
    if(this.contains_residues) {
      let loading = this.residues[0].custom_info.loading;
      switch (unit) {
        case 'g':
          return amount_g;
          break;
        case 'mol':
            return (loading * amount_g) / 1000.0; // loading is always in mmol/g
            break;
        default:
          return amount_g;
      }
    } else {
      switch (unit) {
        case 'g':
          return amount_g;
          break;
        case 'l':
          let density = this.density || 1.0;
          if(density) {
            return amount_g / density / 1000 ;
            break;
          }
        case 'mol':
          let molecule_molecular_weight = this.molecule_molecular_weight
          if (molecule_molecular_weight) {
            return amount_g * (this.purity || 1.0) / molecule_molecular_weight;
            break;
          }
        default:
          return amount_g
      }
    }
  }

  convertToGram(amount_value, amount_unit) {
    if(this.contains_residues) {
      switch (amount_unit) {
        case 'g':
          return amount_value;
          break;
        case 'mg':
          return amount_value / 1000.0;
          break;
        case 'mol':
          let loading = this.residues[0].custom_info.loading;
          if(!loading) {
            return 0.0;
          } else {
            return amount_value / loading * 1000.0;
          }
          break;
        default:
          return amount_value
      }
    } else {
      switch (amount_unit) {
        case 'g':
          return amount_value;
          break;
        case 'mg':
          return amount_value / 1000.0;
          break;
        case 'l':
          return amount_value * (this.density || 1.0) * 1000;
          break;
        case 'mol':
          return amount_value / (this.purity || 1.0) * this.molecule_molecular_weight;
          break;
        default:
          return amount_value
      }
    }
  }

  get molecule_iupac_name() {
    return this.molecule && this.molecule.iupac_name;
  }

  set molecule_iupac_name(iupac_name) {
    this.molecule.iupac_name = iupac_name;
  }

  get molecule_molecular_weight() {
    return this.molecule && this.molecule.molecular_weight;
  }

  get molecule_exact_molecular_weight() {
    return this.molecule && this.molecule.exact_molecular_weight;
  }

  get molecule_formula() {
    return this.molecule && this.molecule.sum_formular;
  }

  get molecule_inchistring() {
    return this.molecule && this.molecule.inchistring;
  }

  get molecule_cano_smiles() {
    return this.molecule && this.molecule.cano_smiles;
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
    if(molecule.temp_svg) {
      this.sample_svg_file = molecule.temp_svg;
    }
  }

  get polymer_formula() {
    return this.contains_residues
            && this.residues[0].custom_info.formula.toString();
  }

  get concat_formula() {
    // TODO Workaround, need to check how can molecule is null
    if (!this.molecule)
      return '';

    if(this.contains_residues)
      return (this.molecule.sum_formular || '') + this.polymer_formula;
    else
      return (this.molecule.sum_formular || '');
  }

  get polymer_type() {
    return this.contains_residues
            && this.residues[0].custom_info.polymer_type.toString();
  }

  get loading() {
    if(!this.contains_residues)
      return false;

    return this.residues[0].custom_info.loading;
  }

  set loading(loading) {
    if(this.contains_residues)
      this.residues[0].custom_info.loading = loading;
  }

  get external_loading() {
    if(!this.contains_residues)
      return false;

    return this.residues[0].custom_info.external_loading;
  }

  set external_loading(loading) {
    if(this.contains_residues)
      this.residues[0].custom_info.external_loading = loading;
  }

  get error_loading() {
    // TODO: temporary disabled
    //return this.contains_residues && !this.loading && !this.reaction_product;
    return false;
  }


  get isValid(){
    return (this && this.molfile &&
            !this.error_loading && !this.error_polymer_type);
  }

  get svgPath() {
    if (this.sample_svg_file){
      if(this.sample_svg_file === '***')
        return `/images/no_image_180.svg`
      else
        return `/images/samples/${this.sample_svg_file}`;
    } else {
      return this.molecule && this.molecule.molecule_svg_file ? `/images/molecules/${this.molecule.molecule_svg_file}` : '';
    }
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
    return (this._analyses || []).map(a => new Analysis(a));
  }

  set analyses(analyses) {
    this._analyses = analyses.map(a => new Analysis(a));
  }

  addAnalysis(analysis) {
    let analyses = this.analyses;
    analyses.push(analysis);
    this.analyses = analyses;
  }

  removeAnalysis(analysis) {
    let analyses = this.analyses;
    _.remove(analyses, (a) => { return a.id == analysis.id});
    this.analyses = analyses;
  }

  updateAnalysis(changedAnalysis) {
    this.analyses.find(analysis => {
      if(analysis.id == changedAnalysis.id) {
        const analysisPosition = _.findIndex(this.analyses, (a) => { return a.id == analysis.id});
        this._analyses[analysisPosition] = changedAnalysis;
      }
    });
  }
};

Sample.counter = 0;
Sample.children_count = {}
