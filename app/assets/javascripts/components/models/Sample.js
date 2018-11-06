import React from 'react';
import _ from 'lodash';

import Element from './Element';
import Molecule from './Molecule';
import UserActions from '../actions/UserActions';
import UserStore from '../stores/UserStore';
import Container from './Container.js';

export default class Sample extends Element {
  // isMethodRestricted(m) {
  //   return false;
  // }

  static copyFromSampleAndCollectionId(sample, collection_id, structure_only = false, keepResidueInfo = false) {
    const newSample = sample.buildCopy();
    newSample.collection_id = collection_id;
    if (sample.name) { newSample.name = sample.name; }
    if (sample.external_label) { newSample.external_label = sample.external_label; }

    if(structure_only) {
      newSample.filterSampleData();
      newSample.filterResidueData(true);
    } else {
      newSample.filterResidueData(keepResidueInfo);
    }

    if (sample.elemental_compositions) {
      newSample.elemental_compositions = sample.elemental_compositions;
    }

    newSample.filterElementalComposition();

    return newSample;
  }

  filterElementalComposition() {
    const elemComp = (this.elemental_compositions || []).find((item) => {
      if (item.composition_type == 'formula') {
        item.id = null;
        return item;
      }
    });
    this.elemental_compositions = elemComp ? [elemComp] : [];
    this.elemental_compositions.push({
      composition_type: 'found',
      data: {},
      description: 'Experimental'
    });
    return this;
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

  filterResidueData(keepResidueInfo = false) {
    if (this.contains_residues) {
      if (keepResidueInfo) {
        // only reset loading
        this.residues.map((residue) => {
          Object.assign(residue.custom_info, {
            external_loading: 0.0,
            loading: null,
            loading_type: "external"
          });
        });
      } else {
        // set default polymer data
        this.residues.map((residue) => {
          Object.assign(residue, {
            residue_type: 'polymer',
            custom_info: {
              "formula": 'CH',
              "loading": null,
              "polymer_type": "polystyrene",
              "loading_type": "external",
              "external_loading": 0.0,
              "reaction_product": (this.reaction_product ? true : null),
              "cross_linkage": null
            }
          });
        });
      }
    }
    return this;
  }

  filterSampleData() {
    // reset to default values
    this.target_amount_value = 0;
    this.real_amount_value = 0;
    this.description = '';
    this.purity = 1;
    this.imported_readout = '';

    return this;
  }

  static buildNewShortLabel() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return 'NEW SAMPLE'; }
    return `${currentUser.initials}-${currentUser.samples_count + 1}`;
  }

  static defaultStereo() {
    return { abs: 'any', rel: 'any' };
  }

  static buildEmpty(collection_id) {
    const sample = new Sample({
      collection_id,
      type: 'sample',
      external_label: '',
      target_amount_value: 0,
      target_amount_unit: 'g',
      molarity_value: 0,
      molarity_unit: 'M',
      description: '',
      purity: 1,
      density: 0,
      solvent: '',
      location: '',
      molfile: '',
      molecule: { id: '_none_' },
      residues: [],
      elemental_compositions: [{
        composition_type: 'found',
        data: {}
      }],
      imported_readout: '',
      attached_amount_mg: '', // field for polymers calculations
      container: Container.init(),
      can_update: true,
      stereo: Sample.defaultStereo()
    });

    sample.short_label = Sample.buildNewShortLabel();
    return sample;
  }

  getChildrenCount() {
    return parseInt(Sample.children_count[this.id] || this.children_count);
  }

  buildSplitShortLabel() {
    let children_count = this.getChildrenCount() + 1;
    return this.short_label + "-" + children_count;
  }

  buildCopy() {
    const sample = super.buildCopy();
    sample.short_label = Sample.buildNewShortLabel();
    sample.container = Container.init();
    sample.can_update = true;
    return sample;
  }

  static buildNew(sample, collectionId, matGroup = null) {
    const newSample = Sample.buildEmpty(collectionId);

    if (matGroup === 'reactants' || matGroup === 'solvents') {
      newSample.short_label = matGroup.slice(0, -1);
    }
    if (sample instanceof Sample) {
      newSample.molecule = sample.molecule;
      newSample.sample_svg_file = sample.sample_svg_file;
    } else {
      newSample.molecule = sample;
    }
    if (sample.stereo) {
      const { abs, rel } = sample.stereo;
      newSample.stereo = { abs, rel };
    }
    newSample.residues = sample.residues || [];
    newSample.contains_residues = sample.contains_residues;
    newSample.filterResidueData(true);
    newSample.density = sample.density;
    newSample.molfile = sample.molfile || '';
    return newSample;
  }

  buildChild() {
    Sample.counter += 1;
    const splitSample = this.buildChildWithoutCounter();
    splitSample.short_label = splitSample.split_label;
    Sample.children_count[this.id] = this.getChildrenCount() + 1;

    return splitSample;
  }

  buildChildWithoutCounter() {
    const splitSample = this.clone();
    splitSample.parent_id = this.id;
    splitSample.id = Element.buildID();

    if (this.name) { splitSample.name = this.name; }
    if (this.external_label) { splitSample.external_label = this.external_label; }
    if (this.elemental_compositions) {
      splitSample.elemental_compositions = this.elemental_compositions;
    }
    splitSample.created_at = null;
    splitSample.updated_at = null;
    splitSample.target_amount_value = 0;
    splitSample.real_amount_value = null;
    splitSample.is_split = true;
    splitSample.is_new = true;
    splitSample.split_label = splitSample.buildSplitShortLabel();
    // Todo ???
    splitSample.container = Container.init();
    return splitSample;
  }

  get isSplit() {
    return this.is_split
  }

  set isSplit(is_split) {
    this.is_split = is_split;
  }

  serialize() {
    let serialized = super.serialize({
      name: this.name,
      external_label: this.external_label,
      target_amount_value: this.target_amount_value,
      target_amount_unit: this.target_amount_unit,
      real_amount_value: this.real_amount_value,
      real_amount_unit: this.real_amount_unit,
      molarity_value: this.molarity_value,
      molarity_unit: this.molarity_unit,
      description: this.description,
      purity: this.purity,
      short_label: this.short_label,
      solvent: this.solvent,
      location: this.location,
      molfile: this.molfile,
      molecule: this.molecule && this.molecule.serialize(),
      molecule_id: this.molecule && this.molecule.id,
      molecule_name_id: this.molecule_name && this.molecule_name.value,
      sample_svg_file: this.sample_svg_file,
      is_top_secret: this.is_top_secret || false,
      parent_id: this.parent_id,
      density: this.density,
      boiling_point: this.boiling_point,
      melting_point: this.melting_point,
      residues: this.residues,
      elemental_compositions: this.elemental_compositions,
      is_split: this.is_split || false,
      is_new: this.is_new,
      imported_readout: this.imported_readout,
      container: this.container,
      xref: this.xref,
      stereo: this.stereo,
    });

    return serialized;
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
      // this.sample_svg_file = '';
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

  title(selected = false) {
    const profile = UserStore.getState().profile
    const show_external_name = profile ? profile.show_external_name : false
    const external_label = this.external_label;
    const extLabelClass =  this.highlight_label(!selected);
    const nameClass =  this.highlight_label(false);
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

  highlight_label(gray) {
    let cssClass = null;
    if(!gray) {
      cssClass = 'label--bold';
    } else {
      cssClass = 'label--bold c-text--grey';
    }
    return cssClass;
  }

  get molecule_name_label() {
    return this.molecule_name_hash && this.molecule_name_hash.label;
  }

  get molecule_name() {
    return this.molecule_name_hash;
  }

  set molecule_name(mno) {
    this.molecule_name_hash = mno;
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

  showedName() {
    return this.showed_name;
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

  get molarity_value() {
    return this._molarity_value;
  }

  set molarity_value(molarity_value) {
    this._molarity_value = molarity_value;
  }

  get molarity_unit() {
    return this._molarity_unit;
  }

  set molarity_unit(molarity_unit) {
    this._molarity_unit = molarity_unit;
  }

  get imported_readout() {
    return this._imported_readout;
  }

  set imported_readout(imported_readout) {
    this._imported_readout = imported_readout;
  }

  setAmount(amount) {
    if (amount.unit && !isNaN(amount.value)) {
      this.amount_value = amount.value;
      this.amount_unit = amount.unit;
    }
  }

  setAmountAndNormalizeToGram(amount) {
    this.amount_value = this.convertToGram(amount.value, amount.unit);
    this.amount_unit = 'g';
  }

  setDensity(density) {
    this.density = density.value;
    this.molarity_value = 0;
  }

  setMolarity(molarity) {
    this.molarity_value = molarity.value;
    this.molarity_unit = molarity.unit;
    this.density = 0;
  }

  get amountType() {
    return this._current_amount_type || this.defaultAmountType();
  }

  set amountType(amount_type) {
    this._current_amount_type = amount_type;
  }

  defaultAmountType() {
    return (this.real_amount_value ? 'real' : 'target');
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

  get has_molarity() {
    return this.molarity_value > 0 && this.density === 0;
  }

  get has_density() {
    return this.density > 0 && this.molarity_value === 0;
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
    return this.convertToGram(this.amount_value, this.amount_unit);
  }

  get amount_l() {
    if (this.amount_unit === 'l') return this.amount_value;
    return this.convertGramToUnit(this.amount_g, 'l');
  }

  get amount_mol() {
    return this.convertGramToUnit(this.amount_g, 'mol');
  }

  // Menge in mmol = Menge (mg) * Reinheit  / Molmasse (g/mol)
  // Volumen (ml) = Menge (mg) / Dichte (g/ml) / 1000
  // Menge (mg)  = Volumen (ml) * Dichte (g/ml) * 1000
  // Menge (mg) = Menge (mmol)  * Molmasse (g/mol) / Reinheit

  convertGramToUnit(amount_g = 0, unit) {
    if(this.contains_residues) {
      let loading = this.residues[0].custom_info.loading;
      switch (unit) {
        case 'g':
          return amount_g;
        case 'mol':
          return (loading * amount_g) / 1000.0; // loading is always in mmol/g
        default:
          return amount_g;
      }
    } else {
      switch (unit) {
        case 'g':
          return amount_g;
        case 'l': {
          if (this.has_molarity) {
            const molecularWeight = this.molecule_molecular_weight;
            const purity = this.purity || 1.0;
            const molarity = this.molarity_value;
            return (amount_g * purity) / (molarity * molecularWeight);
          } else if (this.has_density) {
            const density = this.density;
            return amount_g / (density * 1000);
          }

          return 0;
        }
        case 'mol': {
          if (this.has_molarity) {
            return this.amount_l * this.molarity_value;
          }

          const molecularWeight = this.molecule_molecular_weight;
          const purity = this.purity || 1.0;
          return (amount_g * purity) / molecularWeight;
        }
        default:
          return amount_g;
      }
    }
  }

  convertToGram(amount_value, amount_unit) {
    if (this.contains_residues) {
      const amountValue = amount_value;
      switch (amount_unit) {
        case 'g':
          return amountValue;
        case 'mg':
          return amountValue / 1000.0;
        case 'mol': {
          const loading = this.residues[0].custom_info.loading;
          if (!loading) return 0.0;

          return (amountValue / loading) * 1000.0;
        }
        default:
          return amountValue;
      }
    } else {
      switch (amount_unit) {
        case 'g':
          return amount_value;
        case 'mg':
          return amount_value / 1000.0;
        case 'l':
          if (this.has_molarity) {
            const molecularWeight = this.molecule_molecular_weight;
            return amount_value * this.molarity_value * molecularWeight;
          } else if (this.has_density) {
            return amount_value * (this.density || 1.0) * 1000;
          }
          return 0;
        case 'mol':
          const molecularWeight = this.molecule_molecular_weight;
          return (amount_value / (this.purity || 1.0)) * molecularWeight;
        default:
          return amount_value;
      }
    }
  }

  get molecule_iupac_name() {
    return this.molecule_name_hash && this.molecule_name_hash.label
     || this.molecule && this.molecule.iupac_name;
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

  get molecule_inchikey() {
    return this.molecule && this.molecule.inchikey;
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
    this._molecule = new Molecule(molecule);
    if (molecule.temp_svg) { this.sample_svg_file = molecule.temp_svg; }
  }

  get polymer_formula() {
    return this.contains_residues && this.residues[0].custom_info.formula.toString();
  }

  get concat_formula() {
    // TODO Workaround, need to check how can molecule is null
    if (!this.molecule) { return ''; }
    if(this.contains_residues) {
      return (this.molecule.sum_formular || '') + this.polymer_formula;
    }
    return (this.molecule.sum_formular || '');
  }

  get polymer_type() {
    if (this.contains_residues) {
      const info = this.residues[0].custom_info;
      return (info.polymer_type ? info.polymer_type : info.surface_type).toString();
    }
    return false;
  }

  get loading() {
    if(this.contains_residues) {
      return this.residues[0].custom_info.loading;
    }
    return false;
  }

  set loading(loading) {
    if(this.contains_residues) { this.residues[0].custom_info.loading = loading; }
  }

  get external_loading() {
    if(this.contains_residues) {
      return this.residues[0].custom_info.external_loading;
    }
    return false;
  }

  set external_loading(loading) {
    if(this.contains_residues) {
      this.residues[0].custom_info.external_loading = loading;
    }
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
        return `/images/wild_card/no_image_180.svg`
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

  set maxAmount(maxAmount) {
    this._maxAmount = maxAmount;
  }

  get maxAmount() {
    return this._maxAmount;
  }

  serializeMaterial() {
    const params = this.serialize();
    const extra_params = {
      equivalent: this.equivalent,
      position: this.position,
      reference: this.reference || false,
      waste: this.waste,
      coefficient: this.coefficient,
    };
    _.merge(params, extra_params);
    return params;
  }

  //Container & Analyses routines
  addAnalysis(analysis){
    this.container.children.filter(
      element => ~element.container_type.indexOf('analyses')
    )[0].children.push(analysis);
  }

  analysesContainers() {
    return this.container
      .children
      .filter(el => ~el.container_type.indexOf('analyses'));
  }
}

Sample.counter = 0;
Sample.children_count = {};
