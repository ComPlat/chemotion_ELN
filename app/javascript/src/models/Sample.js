/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import React from 'react';
import _ from 'lodash';

import Element from 'src/models/Element';
import Molecule from 'src/models/Molecule';
import UserStore from 'src/stores/alt/stores/UserStore';
import Container from 'src/models/Container';
import Segment from 'src/models/Segment';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import {
  convertTemperatureToKelvin,
  calculateVolumeForFeedstockOrGas,
  calculateGasMoles,
  updateFeedstockMoles,
  calculateTON,
  calculateTONPerTimeValue,
  determineTONFrequencyValue,
} from 'src/utilities/UnitsConversion';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

const SAMPLE_TYPE_MIXTURE = 'Mixture';
const SAMPLE_TYPE_MICROMOLECULE = 'Micromolecule';

const prepareRangeBound = (args = {}, field) => {
  const argsNew = args;
  if (args[field] && typeof args[field] === 'string') {
    const bounds = args[field].split(/\.{2,3}/);
    if (!args[`${field}_upperbound`]) {
      argsNew[`${field}_upperbound`] = Number.POSITIVE_INFINITY === Number(bounds[1]) ? null : Number(bounds[1]);
    }
    if (!args[`${field}_lowerbound`]) {
      argsNew[`${field}_lowerbound`] = Number.NEGATIVE_INFINITY === Number(bounds[0]) ? null : Number(bounds[0]);
    }
    if (argsNew[`${field}_upperbound`] == null || argsNew[`${field}_upperbound`] == null) {
      argsNew[`${field}_display`] = (argsNew[`${field}_lowerbound`] || '').toString().trim();
    } else {
      argsNew[`${field}_display`] = ((argsNew[`${field}_lowerbound`] || '')
        .toString().concat(' – ', argsNew[`${field}_upperbound`])).trim();
    }
  }
  return argsNew;
};

export default class Sample extends Element {
  // isMethodRestricted(m) {
  //   return false;
  // }

  constructor(args) {
    let argsNew = args;
    argsNew = prepareRangeBound(argsNew, 'boiling_point');
    argsNew = prepareRangeBound(argsNew, 'melting_point');
    super(argsNew);
  }

  cleanBoilingMelting() {
    this.boiling_point = null;
    this.melting_point = null;
  }

  static copyFromSampleAndCollectionId(
    sample,
    collection_id,
    structure_only = false,
    keepResidueInfo = false,
    keepExternalLabel = true
  ) {
    const newSample = sample.buildCopy();
    newSample.collection_id = collection_id;
    if (sample.name) { newSample.name = sample.name; }
    if (sample.external_label) { newSample.external_label = sample.external_label; }
    if (structure_only) {
      newSample.filterSampleData();
      newSample.filterResidueData(true);
      // reset boiling/melting points for products on reaction copy
      newSample.updateRange('boiling_point', '', '');
      newSample.updateRange('melting_point', '', '');
    } else {
      newSample.filterResidueData(keepResidueInfo);
    }

    if (keepExternalLabel == false) {
      newSample.external_label = '';
    }

    if (sample.elemental_compositions) {
      newSample.elemental_compositions = sample.elemental_compositions;
    }

    if (sample.gas_type) {
      newSample.gas_type = sample.gas_type;
    }

    if (sample.gas_phase_data) {
      newSample.gas_phase_data = sample.gas_phase_data;
    }

    newSample.filterElementalComposition();
    newSample.segments = Segment.buildCopy(sample.segments);

    if (sample.isMixture()) {
      newSample.amount_value = sample.amount_value;
    }

    if (sample.weight_percentage) {
      newSample.weight_percentage = sample.weight_percentage;
    }

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
        residue_type: 'polymer',
        custom_info: {
          formula: 'CH',
          loading: null,
          polymer_type: (this.decoupled ? 'self_defined' : 'polystyrene'),
          loading_type: 'external',
          external_loading: 0.0,
          reaction_product: (this.reaction_product ? true : null),
          cross_linkage: null
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
            loading_type: 'external'
          });
        });
      } else {
        // set default polymer data
        this.residues.map((residue) => {
          Object.assign(residue, {
            residue_type: 'polymer',
            custom_info: {
              formula: 'CH',
              loading: (residue.custom_info ? residue.custom_info.loading : null),
              polymer_type: (this.decoupled ? 'self_defined' : 'polystyrene'),
              loading_type: 'external',
              external_loading: 0.0,
              reaction_product: (this.reaction_product ? true : null),
              cross_linkage: null
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
    this.equivalent = 0;
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
      name: '',
      type: 'sample',
      external_label: '',
      target_amount_value: 0,
      target_amount_unit: 'g',
      molarity_value: 0,
      molarity_unit: 'M',
      metrics: 'mmmm',
      description: '',
      purity: 1,
      density: 0,
      solvent: [],
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
      can_copy: false,
      stereo: Sample.defaultStereo(),
      decoupled: false,
      inventory_sample: false,
      molecular_mass: 0,
      sum_formula: '',
      gas_type: 'off',
      weight_percentage: null,
      xref: {},
      sample_type: SAMPLE_TYPE_MICROMOLECULE,
      components: [],
      ancestor_ids: []
    });

    sample.short_label = Sample.buildNewShortLabel();
    return sample;
  }

  getMoleculeId() {
    if (this.decoupled && this.molfile) {
      return `M${this.id}`;
    } else if (this.stereo == null) {
      return `M${this.molecule.id}_any_any`;
    } else {
      return `M${this.molecule.id}_${this.stereo.abs || 'any'}_${this.stereo.rel || 'any'}`;
    }
  }

  isNoStructureSample() {
    return this.molecule?.inchikey === 'DUMMY' && this.molfile == null;
  }

  /**
   * Checks whether the sample is of type "mixture".
   *
   * @returns {boolean} True if the sample type is "mixture", otherwise false.
   */
  isMixture() {
    return this.sample_type?.toString() === SAMPLE_TYPE_MIXTURE;
  }

  /**
   * Checks whether a mixture sample is liquid based on the following criteria:
   * - solvents are present
   * - total volume of mixture is present
   * - any component is liquid
   *
   * @returns {boolean} True if the mixture sample is liquid, otherwise false.
   */
  isMixtureLiquid() {
    if (!this.isMixture()) return false;

    const hasSolvent = Array.isArray(this.solvent) && this.solvent.length > 0; // Check if solvents are present
    const hasVolume = this.amount_l > 0; // Check if the total volume of mixture is present
    const hasLiquidComponent = Array.isArray(this.components)
      && this.components.some((c) => c.material_group === 'liquid'); // Check if any component is liquid

    return hasSolvent || hasVolume || hasLiquidComponent;
  }

  hasComponents() {
    return this.components && this.components.length > 0;
  }

  getChildrenCount() {
    return parseInt(Sample.children_count[this.id] || this.children_count, 10);
  }

  buildSplitShortLabel() {
    const children_count = this.getChildrenCount() + 1;
    return `${this.short_label}-${children_count}`;
  }

  buildCopy() {
    const sample = super.buildCopy();
    sample.short_label = Sample.buildNewShortLabel();
    sample.container = Container.init();
    sample.can_update = true;
    sample.can_copy = false;
    sample.gas_type = 'off';
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
    newSample.starting_molarity_value = sample.molarity_value;
    newSample.molarity_value = 0;
    newSample.metrics = sample.metrics;
    newSample.molfile = sample.molfile || '';
    newSample.gas_type = 'off';
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
    splitSample.starting_molarity_value = this.molarity_value;
    splitSample.molarity_value = 0;

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

    // Map mixture properties from sample_details for mixture samples
    // Calculate total mixture mass first if this is a mixture and mass is not already calculated
    if (this.isMixture() && this.hasComponents() && !this.sample_details?.total_mixture_mass_g) {
      this.calculateTotalMixtureMass();
    }

    this.applyMixturePropertiesToSample(splitSample);

    // Todo ???
    splitSample.container = Container.init();
    splitSample.gas_type = 'off';
    return splitSample;
  }

  get isSplit() {
    return this.is_split;
  }

  set isSplit(is_split) {
    this.is_split = is_split;
  }

  serialize() {
    const serialized = super.serialize({
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
      molecule_id: this.molecule && (this.molecule.id === '_none_' ? null : this.molecule.id),
      molecule_name_id: this.molecule_name && this.molecule_name.value,
      sample_svg_file: this.sample_svg_file,
      is_top_secret: this.is_top_secret || false,
      dry_solvent: this.dry_solvent,
      parent_id: this.parent_id,
      density: this.density,
      metrics: this.metrics,
      boiling_point_upperbound: this.boiling_point_upperbound,
      boiling_point_lowerbound: this.boiling_point_lowerbound,
      melting_point_upperbound: this.melting_point_upperbound,
      melting_point_lowerbound: this.melting_point_lowerbound,
      residues: this.residues,
      elemental_compositions: this.elemental_compositions,
      is_split: this.is_split || false,
      is_new: this.is_new,
      imported_readout: this.imported_readout,
      container: this.container,
      xref: this.xref,
      stereo: this.stereo,
      user_labels: this.user_labels || [],
      decoupled: this.decoupled,
      molecular_mass: this.molecular_mass,
      sum_formula: this.sum_formula,
      inventory_sample: this.inventory_sample,
      segments: this.segments.map((s) => s.serialize()),
      sample_type: this.sample_type,
      sample_details: this.sample_details,
    });

    return serialized;
  }

  get is_top_secret() {
    return this._is_top_secret;
  }

  set is_top_secret(is_top_secret) {
    this._is_top_secret = is_top_secret;
  }

  get dry_solvent() {
    return this._dry_solvent;
  }

  set dry_solvent(dry_solvent) {
    this._dry_solvent = dry_solvent;
  }

  set contains_residues(value) {
    this._contains_residues = value;
    if (value) {
      if (!this.residues.length) {
        this.setDefaultResidue();
      } else {
        this.residues[0]._destroy = undefined;
      }

      this.elemental_compositions.map((item) => {
        if (item.composition_type == 'formula') { item._destroy = true; }
      });
    } else {
      // this.sample_svg_file = '';
      if (this.residues.length) { this.residues[0]._destroy = true; } // delete residue info

      this.elemental_compositions.map((item) => {
        if (item.composition_type == 'loading') { item._destroy = true; }
      });
    }
  }

  get contains_residues() {
    return this._contains_residues;
  }

  title() {
    const { profile } = UserStore.getState();
    const show_external_name = profile ? profile.show_external_name : false;
    const show_sample_name = profile ? profile.show_sample_name : false;
    const { external_label } = this;
    const extLabelClass = 'label--bold';
    const { name } = this;
    const { short_label } = this;

    if (show_external_name) {
      return (external_label ? <span className={extLabelClass}>{external_label}</span> : short_label);
    } if (show_sample_name) {
      return (name ? <span className={extLabelClass}>{name}</span> : short_label);
    }
    return short_label;
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
    return this._external_label || (this.molecule && this.molecule.iupac_name) || this.molecule_formula;
  }

  set preferred_label(label) {
    this._preferred_label = label;
  }

  set segments(segments) {
    this._segments = (segments && segments.map((s) => new Segment(s))) || [];
  }

  get segments() {
    return this._segments || [];
  }

  showedName() {
    return this.showed_name;
  }

  userLabels() {
    return this.user_labels;
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

  get metrics() {
    return this._metrics || 'mmmm';
  }

  set metrics(metrics) {
    this._metrics = metrics;
  }

  get molarity_value() {
    return this._molarity_value;
  }

  set molarity_value(molarity_value) {
    this._molarity_value = molarity_value;
    this.concn = molarity_value;
  }

  get molarity_unit() {
    if (this.isMixture() && this.reference_component) {
      return this.reference_molarity_unit;
    }
    return this._molarity_unit;
  }

  set molarity_unit(molarity_unit) {
    this._molarity_unit = molarity_unit;
  }

  get starting_molarity_value() {
    return this._starting_molarity_value;
  }

  set starting_molarity_value(starting_molarity_value) {
    this._starting_molarity_value = starting_molarity_value;
  }

  get starting_molarity_unit() {
    return this._starting_molarity_unit;
  }

  set starting_molarity_unit(starting_molarity_unit) {
    this._starting_molarity_unit = starting_molarity_unit;
  }

  get imported_readout() {
    return this._imported_readout;
  }

  set imported_readout(imported_readout) {
    this._imported_readout = imported_readout;
  }

  updateRange(field, lower, upper) {
    this[`${field}_lowerbound`] = lower;
    this[`${field}_upperbound`] = upper;
    if (lower === '' && upper === '') {
      this[`${field}_display`] = lower.toString();
      this[field] = lower.toString();
    } else if (lower === upper) {
      this[`${field}_upperbound`] = '';
      this[`${field}_display`] = lower.toString();
      this[field] = lower.toString().concat('...', Number.POSITIVE_INFINITY);
    } else {
      this[`${field}_display`] = (lower.toString().concat(' – ', upper)).trim();
      this[field] = lower.toString().concat('..', upper);
    }
  }

  /**
   * Checks whether the entered mass exceeds the available mixture mass.
   *
   * @returns {boolean} Returns `true` if the entered mass exceeds the available mixture mass, otherwise `false`.
   * @param mass
   */
  validateMixtureMass(mass) {
    const currentMassG = Number(mass);
    const totalMixtureMass = Number(this.sample_details?.total_mixture_mass_g);

    if (
      !this.isMixture()
      || !Number.isFinite(currentMassG)
      || !Number.isFinite(totalMixtureMass)
      || totalMixtureMass <= 0
    ) {
      return false;
    }

    return currentMassG > totalMixtureMass;
  }

  /**
   * Updates component and solvent data for a mixture.
   * @returns {void}
   */
  updateMixtureComponentAmounts() {
    if (!(this.isMixture && this.hasComponents)) return;

    this.updateComponentAmounts();
    this.updateSolventVolumes();
  }

  /**
   * Updates each component's amount (in mol) based on total mixture mass.
   * Uses the component's relative molecular weight (relMw) and equivalent (eq) values.
   * @returns {void}
   */
  updateComponentAmounts() {
    const totalMassG = Number(this.amount_g);
    if (!Number.isFinite(totalMassG) || totalMassG < 0) return;

    (this.components || []).forEach((component) => {
      const relMw = Number(component.relative_molecular_weight);
      if (!Number.isFinite(relMw) || relMw <= 0) return;

      const isRef = !!component.reference;
      const eq = Number.isFinite(component.equivalent)
        ? component.equivalent
        : (isRef ? 1 : 0);

      const totalMoles = totalMassG / relMw;
      component.amount_mol = isRef ? totalMoles : totalMoles * eq;
    });
  }

  /**
   * Scales solvent volumes (L) relative to change in total mass.
   * @returns {void}
   */
  updateSolventVolumes() {
    // Scale solvent volumes based on change in total mass (amount_g)
    // Uses factor = current amount_g / previous_amount_g, if previous is provided
    const prevAmountG = this.sample_details && Number(this.sample_details.previous_amount_g);

    if (
      Array.isArray(this.solvent)
      && Number.isFinite(prevAmountG)
      && prevAmountG > 0
      && Number.isFinite(this.amount_g) && this.amount_g >= 0
    ) {
      const scaleFactor = this.amount_g / prevAmountG;
      this.solvent.forEach((solvent) => {
        const baseVolumeL = Number(solvent && solvent.amount_l);
        if (Number.isFinite(baseVolumeL)) {
          solvent.amount_l = baseVolumeL * scaleFactor;
        }
      });
    }
  }

  /**
   * Updates the sample's concentration (`concn`) based on its total amount in moles
   * and the combined volume of all reaction materials.
   *
   * - For mixtures: calculates concentration as `amount_mol / combinedVolume`.
   * - For non-mixtures: calculates concentration as `amount_mol / combinedVolume`.
   * - If any required data is missing or invalid, `concn` is set to `null`.
   *
   * Formula:
   *   concn = amount_mol / (reaction.solventVolume + volumes of all materials)
   *
   * @method updateConcentrationFromSolvent
   * @memberof Sample
   * @param {Object} reaction - The reaction object containing the solvent volume.
   * @returns {void}
   */
  updateConcentrationFromSolvent(reaction) {
    if (!reaction) {
      this.concn = null;
      return;
    }

    // Determine which volume to use based on checkbox state
    let volumeToUse = null;
    if (reaction.use_reaction_volume && reaction.volume != null && reaction.volume > 0) {
      // Use reaction volume input when checkbox is checked
      volumeToUse = reaction.volume;
    } else {
      // Use sum of materials volume when checkbox is unchecked or default
      volumeToUse = reaction.calculateCombinedReactionVolume();
    }

    if (!volumeToUse || volumeToUse <= 0) {
      this.concn = null;
      return;
    }

    // Calculate concentration for all samples (mixtures and non-mixtures)
    if (Number.isFinite(this.amount_mol) && this.amount_mol >= 0) {
      this.concn = this.amount_mol / volumeToUse;
    } else {
      this.concn = null;
    }
  }

  /**
   * Handles mixture-specific logic when amount changes.
   * Captures previous state, clears reference_component_changed flag, and updates component amounts.
   * @returns {void}
   */
  handleMixtureAmountChange() {
    // When amount_g or amount_l is manually changed by user, clear the reference_component_changed flag
    // so that amount_mol will be calculated from amount_g instead of using reference component's amount_mol
    // Only do this for user-initiated changes, not programmatic changes (like during reference component switch)
    // For mixture samples, always capture the previous state before changing amount
    this.storePreviousAmountState();
    this.sample_details.reference_component_changed = false;

    // Update mixture components' amount_mol based on new total mass and reference component
    this.updateMixtureComponentAmounts();
  }

  /**
   * Sets the amount and unit for the sample.
   * For mixture samples with components, automatically triggers recalculation of:
   * - Component volumes (when setting liters)
   * - Mixture density (when setting liters)
   * - Component relative molecular weights (when setting grams)
   *
   * @param {Object} amount - The amount object containing value and unit
   * @param {number} amount.value - The numeric value of the amount
   * @param {string} amount.unit - The unit of measurement ('g', 'l', 'mol', etc.)
   * @returns {void} Returns early if amount is invalid
   */
  setAmount(amount) {
    // Validate input parameters - early return if invalid
    if (!amount.unit || Number.isNaN(amount.value)) return;

    // For mixture samples, handle mixture-specific logic before setting amount
    if (this.isMixture()) {
      this.handleMixtureAmountChange();
    }

    // Set the basic amount properties
    this.amount_value = amount.value;
    this.amount_unit = amount.unit;
  }

  /**
   * Captures the previous molar and mass values before updating the amount,
   * to support ratio-based recalculations in mixture mass conversions.
   *
   * @private
   * @returns {void}
   */
  storePreviousAmountState() {
    // Initialize the sample_details container if missing
    this.initializeSampleDetails?.();

    // Store previous moles and grams for later ratio-based calculations
    this.sample_details.previous_amount_mol = this.amount_mol;
    this.sample_details.previous_amount_g = this.amount_g;
  }

  /**
   * Updates the total volume for the sample based on amount and concentration.
   * Used for mixtures to recalculate the total volume.
   * @param {number} amount - The amount (e.g., moles)
   * @param {number} totalConcentration - The total concentration (e.g., molarity)
   */
  updateTotalVolume(amount, totalConcentration) {
    if (!amount || totalConcentration === 0 || Number.isNaN(totalConcentration)) {
      return;
    }
    // totalVolume = amount_mol / final concentration of the component
    const totalVolume = (amount ?? 0) / totalConcentration;

    this.setTotalMixtureVolume(totalVolume);
  }

  /**
   * Calculates the required total volume for the mixture based on the reference component.
   * Considers purity, stock concentration, density, and material group.
   * @returns {number} The required total volume (liters)
   */
  calculateRequiredTotalVolume() {
    const referenceComponent = this.reference_component;
    if (!referenceComponent) return 0;

    const {
      purity = 1.0,
      starting_molarity_value,
      amount_l,
      amount_mol,
      concn,
      density,
      molecule_molecular_weight,
      material_group,
    } = referenceComponent;

    if (!concn || concn <= 0) {
      return 0;
    }

    let requiredTotalVolume = 0;

    if (material_group === 'liquid') {
      if (starting_molarity_value && starting_molarity_value > 0) {
        // Case 1: If stock concentration is given
        requiredTotalVolume = (starting_molarity_value * (amount_l ?? 0) * purity) / concn;
      } else if (density && density > 0) {
        // Case 2: If density is given
        requiredTotalVolume = (density * (amount_l ?? 0) * purity) / (molecule_molecular_weight * concn) * 1000;
      }
    } else if (material_group === 'solid') {
      requiredTotalVolume = (amount_mol ?? 0) / concn;
    }

    return requiredTotalVolume;
  }

  setUnitMetrics(unit, metricPrefix) {
    const mp = metricPrefix || 'm';
    if (unit === 'l') {
      this.metrics = (this.metrics && this.metrics.replace(/(.{1}).{1}/, `$1${mp}`)) || 'mmmm';
    } else if (unit === 'mol') {
      this.metrics = (this.metrics && this.metrics.replace(/(.{2}).{1}/, `$1${mp}`)) || 'mmmm';
    } else if (unit === 'mol/l') {
      if (this.metrics && this.metrics.length === 3) {
        this.metrics += mp;
      } else {
        this.metrics = (this.metrics && this.metrics.replace(/(.{3}).{1}/, `$1${mp}`)) || 'mmmm';
      }
    } else {
      this.metrics = (this.metrics && this.metrics.replace(/(.{0}).{1}/, `$1${mp}`)) || 'mmmm';
    }
  }

  setAmountAndNormalizeToGram(amount) {
    this.amount_value = this.convertToGram(amount.value, amount.unit);
    this.amount_unit = 'g';
  }

  setMetrics(metrics) {
    this.metrics = metrics.value;
  }

  setDensity(density) {
    this.density = density.value;
    this.molarity_value = 0;
  }

  setMolecularMass(mass) {
    this.molecular_mass = mass.value;
  }

  setUserLabels(userLabels) {
    this.user_labels = userLabels;
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
    const mw = this.molecule_molecular_weight;
    return this.amount_mol * mw / 1000.0;
  }

  // amount proxy

  get amount() {
    return ({
      value: this.amount_value,
      unit: this.amount_unit
    });
  }

  get amount_value() {
    return this.amountType === 'real' ? this.real_amount_value : this.target_amount_value;
  }

  set amount_value(amount_value) {
    if (this.amountType === 'real') {
      this.real_amount_value = amount_value;
    } else {
      this.target_amount_value = amount_value;
    }
  }

  get amount_unit() {
    return (this.amountType === 'real' ? this.real_amount_unit : this.target_amount_unit) || 'g';
  }

  set amount_unit(amount_unit) {
    if (this.amountType === 'real') {
      this.real_amount_unit = amount_unit;
    } else {
      this.target_amount_unit = amount_unit;
    }
  }

  get has_molarity() {
    return this.molarity_value > 0 && (this.density === 0 || !this.density);
  }

  get has_density() {
    return this.density > 0 && this.molarity_value === 0;
  }

  // target amount

  get target_amount_value() {
    return this._target_amount_value;
  }

  set target_amount_value(amount_value) {
    this._target_amount_value = amount_value;
  }

  get target_amount_unit() {
    return this._target_amount_unit || 'g';
  }

  set target_amount_unit(amount_unit) {
    this._target_amount_unit = amount_unit;
  }

  // real amount

  get real_amount_value() {
    return this._real_amount_value;
  }

  set real_amount_value(amount_value) {
    this._real_amount_value = amount_value;
  }

  get real_amount_unit() {
    return this._real_amount_unit || 'g';
  }

  set real_amount_unit(amount_unit) {
    this._real_amount_unit = amount_unit;
  }

  get amount_g() {
    return this.convertToGram(this.amount_value, this.amount_unit);
  }

  get amount_l() {
    if (this.amount_unit === 'l') return this.amount_value;
    return this.convertGramToUnit(this.amount_g, 'l');
  }

  get amount_mol() {
    // For mixtures, always use calculateMixtureAmountMol() to respect reference_component_changed flag
    // This ensures that when reference component is switched, amount_mol updates correctly
    // even if amount_unit is 'mol'
    if (this.isMixture()) {
      return this.calculateMixtureAmountMol();
    }

    if (this.amount_unit === 'mol' && (this.isGas()
    || this.isFeedstock())) return this.amount_value;

    return this.convertGramToUnit(this.amount_g, 'mol');
  }

  calculateFeedstockOrGasMoles(purity, gasType, amountLiter = null) {
    // number of moles for feedstock = Purity*1*Volume/(0.0821*294) & pressure = 1
    // number of moles for gas =  ppm*1*V/(0.0821*temp_in_K*1000000) & pressure = 1
    if (gasType === 'gas') {
      const vesselSize = this.fetchReactionVesselSizeFromStore();
      return this.updateGasMoles(vesselSize);
    }
    return updateFeedstockMoles(purity, amountLiter, this.amount_l);
  }

  // eslint-disable-next-line class-methods-use-this
  fetchReactionVesselSizeFromStore() {
    const gasPhaseStore = GasPhaseReactionStore.getState();
    return gasPhaseStore.reactionVesselSizeValue;
  }

  updateGasMoles(volume) {
    const { part_per_million, temperature } = this.gas_phase_data;
    const temperatureInKelvin = convertTemperatureToKelvin(temperature);

    if (!temperatureInKelvin || temperatureInKelvin === 0 || !part_per_million || part_per_million === 0
      || !volume || volume === 0) {
      this.updateTONValue(null);
      return null;
    }

    const moles = calculateGasMoles(volume, part_per_million, temperatureInKelvin);
    this.updateTONValue(moles);
    return moles;
  }

  updateTONPerTimeValue(tonValue, gasPhaseTime) {
    const { value, unit } = gasPhaseTime;
    const tonFrequencyUnit = this.gas_phase_data.turnover_frequency.unit;

    const timeValues = calculateTONPerTimeValue(value, unit);

    this.gas_phase_data.turnover_frequency.value = determineTONFrequencyValue(
      tonValue,
      tonFrequencyUnit,
      timeValues,
      null
    );
  }

  // eslint-disable-next-line class-methods-use-this
  fetchCatalystMoleFromStore() {
    const gasPhaseStore = GasPhaseReactionStore.getState();
    return gasPhaseStore.catalystReferenceMolValue;
  }

  updateTONValue(moles) {
    if (this.gas_phase_data) {
      const moleOfCatalystReference = this.fetchCatalystMoleFromStore();
      const value = calculateTON(moles, moleOfCatalystReference);
      this.gas_phase_data.turnover_number = value;
      const gasPhaseTime = this.gas_phase_data.time;
      this.updateTONPerTimeValue(value, gasPhaseTime);
    }
  }

  /**
   * Calculates the total volume (in liters) of a mixture sample
   * based on its total mass and either density or molarity.
   *
   * Priority of calculation:
   * 1. Use density if available.
   * 2. Otherwise, use molarity and molecular weight if both are provided.
   *
   * @param {number} amount_g - The total mass of the mixture in grams.
   * @param {number} [purity=1.0] - The purity factor of the mixture (default is 1.0).
   * @param {number|null} [molecularWeight=null] - The molecular weight in g/mol (required for molarity-based calculation).
   * @returns {number} The calculated volume in liters, or 0 if the calculation cannot be performed.
   */
  calculateMixtureVolume(amount_g, purity = 1.0, molecularWeight = null) {
    const { density, molarity_value } = this;

    if (!this.isMixture() || !amount_g || amount_g <= 0) {
      return 0;
    }

    // Priority 1: Use density if available
    if (density > 0) {
      // Formula: volume (L) = total mass (g) / density (g/ml) / 1000 (ml to L conversion)
      return amount_g / (density * 1000);
    }

    // Priority 2: Use molarity if available and molecular weight is provided
    if (molarity_value > 0 && molecularWeight && molecularWeight > 0) {
      // Formula: volume (L) = (total mass (g) * purity) / (molarity (mol/L) * molecular weight (g/mol))
      return (amount_g * purity) / (molarity_value * molecularWeight);
    }

    // No calculation method available
    return 0;
  }

  // Menge in mmol = Menge (mg) * Reinheit  / Molmasse (g/mol)
  // Volumen (ml) = Menge (mg) / Dichte (g/ml) / 1000
  // Menge (mg)  = Volumen (ml) * Dichte (g/ml) * 1000
  // Menge (mg) = Menge (mmol)  * Molmasse (g/mol) / Reinheit

  convertGramToUnit(amount_g = 0, unit) {
    const gasPhaseCondition = (this.isGas() || this.isFeedstock());
    const purity = this.purity || 1.0;
    const molecularWeight = this.molecule_molecular_weight;
    if (this.contains_residues) {
      const { loading } = this.residues[0].custom_info;
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
          if (this.gas_type && gasPhaseCondition) {
            const vesselVolume = this.fetchReactionVesselSizeFromStore();
            let moles;
            if (this.decoupled && this.amount_unit === 'mol') {
              moles = this.amount_value;
            } else if (!molecularWeight || molecularWeight <= 0) {
              moles = 0;
            } else {
              moles = (amount_g * purity) / molecularWeight;
            }
            return calculateVolumeForFeedstockOrGas(
              vesselVolume,
              purity,
              this.gas_type,
              this.gas_phase_data,
              moles
            );
          }

          if (this.isMixture()) {
            return this.calculateMixtureVolume(amount_g, purity, molecularWeight);
          }

          if (this.has_molarity && !gasPhaseCondition) {
            const molarity = this.molarity_value;
            return (amount_g * purity) / (molarity * molecularWeight);
          } if (this.has_density && !gasPhaseCondition) {
            const { density } = this;
            return amount_g / (density * 1000);
          }
          return 0;
        }
        case 'mol': {
          if (this.gas_type && gasPhaseCondition) {
            return this.calculateFeedstockOrGasMoles(purity, this.gas_type);
          }

          if (this.isMixture()) {
            return this.calculateMixtureAmountMol();
          }

          if (this.has_molarity) {
            return this.amount_l * this.molarity_value;
          }
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
          const { loading } = this.residues[0].custom_info;
          if (!loading) return 0.0;

          return (amountValue / loading) * 1000.0;
        }
        default:
          return amountValue;
      }
    } else {
      const gasPhaseCondition = (this.isGas() || this.isFeedstock());
      switch (amount_unit) {
        case 'g':
          if (this.gas_type && this.isGas()) {
            const { part_per_million, temperature } = this.gas_phase_data;
            const vesselSize = this.fetchReactionVesselSizeFromStore();
            const temperatureInKelvin = convertTemperatureToKelvin(temperature);
            const moles = calculateGasMoles(vesselSize, part_per_million, temperatureInKelvin);
            return this.molecule_molecular_weight * moles;
          }
          return amount_value;
        case 'mg':
          return amount_value / 1000.0;
        case 'l': {
          // amount in  gram for feedstock gas material is calculated according to equation of molecular weight x moles
          if (this.gas_type && gasPhaseCondition) {
            const molecularWeight = this.molecule_molecular_weight;
            const purity = this.purity || 1.0;
            const moles = this.calculateFeedstockOrGasMoles(purity, this.gas_type, amount_value);
            return moles * molecularWeight;
          }
          if (this.has_molarity && !gasPhaseCondition) {
            const molecularWeight = this.molecule_molecular_weight;
            return amount_value * this.molarity_value * molecularWeight;
          } if (this.has_density && !gasPhaseCondition) {
            return amount_value * (this.density || 1.0) * 1000;
          }
          return 0;
        }
        case 'mol': {
          if (this.isMixture()) {
            return this.convertMixtureMolToGram(amount_value);
          }
          const molecularWeight = this.molecule_molecular_weight;
          const purity = this.purity || 1.0;

          return (amount_value / purity) * molecularWeight;
        }
        default:
          return amount_value;
      }
    }
  }

  /**
   * Gets the lockReactionEquivColumn state from ComponentStore for a specific reaction.
   * @param {string|number} [reactionId] - Optional reaction ID. If not provided, tries to get from sample's belongTo property.
   * @returns {boolean} The lock state for reaction equivalent column, or false if not available.
   */
  // eslint-disable-next-line class-methods-use-this
  getLockReactionEquivColumn(reactionId) {
    // If reactionId is provided, use it; otherwise try to get from sample's belongTo property
    const id = reactionId || (this.belongTo && this.belongTo.id);
    if (!id) return false;

    try {
      const componentState = ComponentStore.getState();
      return ComponentStore.getLockStateForReaction(componentState, id) ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Converts a mixture's molar amount to grams using the reference component context.
   *
   * Calculation rules (evaluated in order):
   * 1. If no reference component exists, return 0.
   * 2. If `amount_value` is empty, null, or NaN, return the current `amount_g` (no change).
   * 3. If `amount_value` is 0, return 0.
   * 4. If the reference component has NOT changed AND `relative_molecular_weight > 0`:
   *    - Use direct calculation: grams = amount_value × relative_molecular_weight
   * 5. If both `previous_amount_mol` and `previous_amount_g` are valid (> 0):
   *    - Use ratio-based calculation: grams = previous_amount_g × (amount_value / previous_amount_mol)
   * 6. Otherwise, return 'n.d' (not determinable).
   *
   * @param {number|string} amount_value - The molar amount to convert (number or numeric string).
   * @returns {number|string} The computed mass in grams, or 'n.d' if it cannot be determined, or 0 if invalid input.
   */
  convertMixtureMolToGram(amount_value) {
    const referenceComponent = this.reference_component;
    if (!referenceComponent) return 0;

    // Parse the current molar amount
    const currentMol = parseFloat(amount_value);

    // Skip recalculation for invalid/empty values
    if (!Number.isFinite(currentMol) || amount_value === '' || amount_value === null) {
      return this.amount_g || 0;
    }

    // If amount_mol is 0, mass should be 0
    if (currentMol === 0) {
      return 0;
    }

    const hasReferenceChanged = this.sample_details?.reference_component_changed || false;
    const lockReactionEquivColumn = this.getLockReactionEquivColumn();
    const relMolWeight = referenceComponent.relative_molecular_weight;
    const prevMol = this.sample_details?.previous_amount_mol;
    const prevG = this.sample_details?.previous_amount_g;

    // Case 1: When reference component has changed
    if (hasReferenceChanged) {
      // If equivalent is locked, recalculate amount_g using new reference component's relMolWeight
      // Otherwise, preserve the previous amount_g (amount_g remains fixed)
      if (lockReactionEquivColumn && relMolWeight && relMolWeight > 0 && Number.isFinite(currentMol)) {
        // Recalculate amount_g from amount_mol using new reference component's relative molecular weight
        return currentMol * relMolWeight;
      }
      // Equivalent not locked: preserve amount_g (only if prevG is valid)
      if (Number.isFinite(prevG) && prevG > 0) {
        return prevG;
      }
    }

    // Case 2: Direct calculation using relative molecular weight (most reliable)
    if (relMolWeight && relMolWeight > 0) {
      return currentMol * relMolWeight;
    }

    // Case 3: Ratio-based recalculation (fallback when relMolWeight not available)
    // Only use ratio if BOTH previous values are valid and > 0
    if (Number.isFinite(prevMol) && prevMol > 0 && Number.isFinite(prevG) && prevG > 0) {
      return prevG * (currentMol / prevMol);
    }

    // Case 4: Cannot determine - return 'n.d'
    return 'n.d';
  }

  /**
   * Calculates the amount in moles for mixture samples.
   * Handles two cases:
   * 1. Initial case: When the reference component has been changed, uses amount_mol of reference component
   * 2. Based on amount_g/amount_l changes: Uses formula amount_mol = total mass (g) / reference_component.rel_mol_weight (g/mol)
   *
   * @returns {number} The calculated amount in moles or fallback value
   */
  calculateMixtureAmountMol() {
    const referenceComponent = this.reference_component;
    if (!referenceComponent) {
      return 'n.d';
    }

    // Check if the reference component has been changed (flag set during reference change)
    // Default to false when the flag is not set, so we only treat it as "changed"
    // when some other logic explicitly marks it as true.
    const hasReferenceChanged = this.sample_details?.reference_component_changed || false;
    const lockReactionEquivColumn = this.getLockReactionEquivColumn();

    // Get the reference component's relative molecular weight
    const relMolWeight = referenceComponent.relative_molecular_weight;

    let result;

    // Case 1: Initial case - when the reference has been changed
    if (hasReferenceChanged) {
      // If equivalent is locked, preserve the current amount_mol from sample_details
      // Otherwise, use amount_mol of reference component
      if (lockReactionEquivColumn) {
        // Return the amount_mol stored in sample_details
        result = this.sample_details?.previous_amount_mol || 0;
      } else {
        // Equivalent not locked, use amount_mol of reference component
        result = referenceComponent.amount_mol || 0;
      }

      // Don't reset the flag immediately - let it persist for the calculation chain
      // The flag will be reset externally after all calculations are complete
    } else if (relMolWeight && relMolWeight > 0) {
      // Case 2: Based on amount_g/amount_l changes - use total mass / relative molecular weight
      result = this.amount_g / relMolWeight;
    } else {
      // Case 3: Fallback to using amount_mol of the reference component
      result = referenceComponent.amount_mol || 'n.d';
    }

    return result;
  }

  /**
   * Gets the relative molecular weight from the reference component.
   * Only uses the component_properties.relative_molecular_weight value.
   *
   * @param {Object} referenceComponent - The reference component to get molecular weight from
   * @returns {number|null} The relative molecular weight or null if not found
   */
  getReferenceRelativeMolecularWeight(referenceComponent) {
    return referenceComponent.relative_molecular_weight;
  }

  get molecule_iupac_name() {
    return this.molecule_name_hash && this.molecule_name_hash.label
        || this.molecule && this.molecule.iupac_name;
  }

  set molecule_iupac_name(iupac_name) {
    if (this.molecule) {
      this.molecule.iupac_name = iupac_name;
    }
  }

  get molecule_molecular_weight() {
    if (this.isMixture()) {
      return this.reference_molecular_weight;
    }
    if (this.decoupled) {
      return this.molecular_mass;
    }

    return this.molecule && this.molecule.molecular_weight;
  }

  get molecule_exact_molecular_weight() {
    return !this.decoupled && this.molecule && this.molecule.exact_molecular_weight;
  }

  get molecule_formula() {
    if (this.decoupled) {
      return (this.sum_formula && this.sum_formula.length) ? this.sum_formula : '';
    }

    if (this.isMixture()) {
      return 'mixture structure';
    }

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
    return this._purity;
  }

  set purity(purity) {
    this._purity = purity;
  }

  get molecule() {
    return this._molecule;
  }

  set molecule(molecule) {
    this._molecule = molecule ? new Molecule(molecule) : null;
    if (molecule && molecule.temp_svg) { this.sample_svg_file = molecule.temp_svg; }
  }

  get polymer_formula() {
    return this.contains_residues && this.residues[0].custom_info.formula.toString();
  }

  get concat_formula() {
    if (!this.molecule_formula) {
      return '';
    }

    if (this.contains_residues) {
      return this.molecule_formula + this.polymer_formula;
    }

    return this.molecule_formula;
  }

  get polymer_type() {
    if (this.contains_residues) {
      const info = this.residues[0].custom_info;
      return (info.polymer_type ? info.polymer_type : info.surface_type).toString();
    }
    return false;
  }

  get loading() {
    if (this.contains_residues) {
      return this.residues[0].custom_info.loading;
    }
    return false;
  }

  set loading(loading) {
    if (this.contains_residues) { this.residues[0].custom_info.loading = loading; }
  }

  get external_loading() {
    if (this.contains_residues) {
      return this.residues[0].custom_info.external_loading;
    }
    return false;
  }

  set external_loading(loading) {
    if (this.contains_residues) {
      this.residues[0].custom_info.external_loading = loading;
    }
  }

  get error_loading() {
    // TODO: temporary disabled
    // return this.contains_residues && !this.loading && !this.reaction_product;
    return false;
  }

  get isValid() {
    const isValidMixture = this.isMixture() && this.components?.length > 0;
    return (this && ((this.molfile && !this.decoupled) || this.decoupled || isValidMixture)
      && !this.error_loading && !this.error_polymer_type);
  }

  get svgPath() {
    if (this.show_label) {
      return `svg_text/${this.labelText}`;
    }

    if (this.sample_svg_file) {
      if (this.sample_svg_file === '***') {
        return '/images/wild_card/no_image_180.svg';
      }
      return `/images/samples/${this.sample_svg_file}`;
    }
    return this.molecule && this.molecule.molecule_svg_file
      ? `/images/molecules/${this.molecule.molecule_svg_file}` : '';
  }
  // todo: have a dedicated Material Sample subclass

  get labelText() {
    return this.name || this.molecule_formula || (this.molecule && this.molecule.iupac_name);
  }

  set equivalent(equivalent) {
    this._equivalent = equivalent;
  }

  get equivalent() {
    if (this.isMixture() && this.reference) {
      return 1;
    }
    return this._equivalent;
  }

  set conc(conc) {
    this._conc = conc;
  }

  get conc() {
    return this._conc;
  }

  set maxAmount(maxAmount) {
    this._maxAmount = maxAmount;
  }

  get maxAmount() {
    return this._maxAmount;
  }

  set sample_details(sample_details) {
    this._sample_details = sample_details;
  }

  get sample_details() {
    return this._sample_details;
  }

  /**
   * Returns the total mixture mass in grams if present and valid.
   *
   * @returns {?number} the mass in grams, or `null` if not set or invalid
   */
  get total_mixture_mass_g() {
    const mass = this.sample_details?.total_mixture_mass_g;
    return (typeof mass === 'number' && Number.isFinite(mass)) ? mass : null;
  }

  /**
   * Sets the total mixture mass in sample_details.
   * @param {number} total_mixture_mass_g - The total mixture mass
   */
  set total_mixture_mass_g(total_mixture_mass_g) {
    if (!this.sample_details) {
      this.sample_details = {};
    }
    this.sample_details.total_mixture_mass_g = total_mixture_mass_g;
  }

  /**
   * Gets the total mixture volume in liters from `sample_details`.
   *
   * @returns {number} The total mixture volume (L). Returns 0 if not set or invalid.
   */
  get total_mixture_volume_l() {
    const volume = this.sample_details?.total_mixture_volume_l;
    return Number.isFinite(volume) ? volume : 0;
  }

  /**
   * Sets the total mixture volume (L) into sample_details.
   * It will update the density also
   * @param totalVolume
   */
  setTotalMixtureVolume(totalVolume) {
    this.initializeSampleDetails();

    this.amount_value = totalVolume;
    this.sample_details.total_mixture_volume_l = totalVolume;

    // updates the mass and density
    this.calculateTotalMixtureMass();
    this.updateMixtureComponentVolume(totalVolume);
  }

  /**
   * Gets the reference component (the one marked as reference) from the components array.
   * @returns {Object|null} The reference component or null if not found
   */
  get reference_component() {
    if (!this.components || this.components.length < 1) { return null; }
    return this.components.find(
      (component) => component.reference === true
    );
  }

  /**
   * Gets the reference molecular weight from the reference component.
   * @returns {number|null} The reference molecular weight or null if not set
   */
  get reference_molecular_weight() {
    if (!this.reference_component || !this.reference_component.molecule) { return null; }

    return this.reference_component.molecule.molecular_weight;
  }

  /**
   * Sets the reference molecular weight in the sample details.
   * @param {number} reference_molecular_weight - The reference molecular weight
   */
  set reference_molecular_weight(reference_molecular_weight) {
    this.sample_details.reference_molecular_weight = reference_molecular_weight;
  }

  /**
   * Gets the relative molecular weight from the reference component.
   * This represents the effective molecular weight of the reference component
   * considering its contribution to the total mixture mass.
   *
   * @returns {number|null} The relative molecular weight of the reference component,
   *                        or null if no reference component exists
   */
  get reference_relative_molecular_weight() {
    if (!this.reference_component) { return null; }

    return this.reference_component.relative_molecular_weight;
  }

  /**
   * Sets the reference relative molecular weight in the sample details.
   * This value represents the calculated relative molecular weight of the reference
   * component based on the mixture composition.
   *
   * @param {number} reference_molecular_weight - The relative molecular weight to store
   */
  set reference_relative_molecular_weight(reference_relative_molecular_weight) {
    this.sample_details.reference_relative_molecular_weight = reference_relative_molecular_weight;
  }

  /**
   * Gets the reference molarity value from the reference component.
   * @returns {number|null} The reference molarity value or null if not set
   */
  get reference_molarity_value() {
    if (!this.reference_component) { return null; }

    return this.reference_component.molarity_value;
  }

  /**
   * Gets the number in moles from the reference component.
   * @returns {number|null} The reference component's amount in moles or null if no reference component
   */
  get reference_amount_mol() {
    const referenceComponent = this.reference_component;
    if (!referenceComponent) { return null; }

    return referenceComponent.amount_mol;
  }

  get reference_equivalent() {
    const referenceComponent = this.reference_component;
    if (!referenceComponent) { return null; }

    return referenceComponent.equivalent;
  }

  /**
   * Gets the reference molarity unit from the reference component.
   * @returns {string|null} The reference molarity unit or null if not set
   */
  get reference_molarity_unit() {
    if (!this.reference_component) { return null; }

    return this.reference_component.molarity_unit;
  }

  serializeMaterial() {
    const params = this.serialize();
    const extra_params = {
      equivalent: this.equivalent,
      position: this.position,
      reference: this.reference || false,
      show_label: (this.decoupled && !this.molfile) ? true : (this.show_label || false),
      waste: this.waste,
      coefficient: this.coefficient,
      gas_type: this.gas_type || false,
      gas_phase_data: this.gas_phase_data,
      conversion_rate: this.conversion_rate,
      components: this.components && this.components.length > 0
        ? this.components.map((s) => s.serializeComponent())
        : [],
      weight_percentage_reference: this.weight_percentage_reference || false,
      weight_percentage: this.weight_percentage
    };
    _.merge(params, extra_params);
    return params;
  }

  // Container & Analyses routines
  addAnalysis(analysis) {
    this.container.children.filter(
      (element) => ~element.container_type.indexOf('analyses')
    )[0].children.push(analysis);
  }

  attachments() {
    let target = [];
    this.datasetContainers().forEach((dt) => {
      const atts = dt.attachments;
      target = [...target, ...atts];
    });
    return target;
  }

  calculateMaxAmount(referenceSample) {
    const refAmount = referenceSample.amount_mol;
    const sampleCoeff = this.coefficient || 1.0;
    const refCoeff = (referenceSample.coefficient || 1.0);
    const coeffQuotient = sampleCoeff / refCoeff;

    this.maxAmount = refAmount * coeffQuotient * this.molecule_molecular_weight;
  }

  get solvent() {
    try {
      // handle the old solvent data
      const jsonSolvent = JSON.parse(this._solvent);
      const solv = [];
      if (jsonSolvent) {
        solv.push(jsonSolvent);
      }
      return solv;
    } catch (e) {
      return this._solvent;
    }
  }

  set solvent(solvent) {
    this._solvent = solvent;
  }

  set gas_phase_data(gas_phase_data) {
    let initializeGasPhaseData;
    if (gas_phase_data === null || gas_phase_data === undefined) {
      initializeGasPhaseData = {
        time: { unit: 'h', value: null },
        temperature: { unit: 'K', value: null },
        turnover_number: null,
        part_per_million: null,
        turnover_frequency: { unit: 'TON/h', value: null }
      };
    }
    this._gas_phase_data = gas_phase_data || initializeGasPhaseData;
  }

  get gas_phase_data() {
    return this._gas_phase_data;
  }

  get inventory_label() {
    return this.xref.inventory_label;
  }

  set inventory_label(inventory_label) {
    this.xref.inventory_label = inventory_label;
  }

  addSolvent(newSolvent) {
    const { molecule } = newSolvent;
    if (molecule) {
      const tmpSolvents = [];
      if (this.solvent) {
        Object.assign(tmpSolvents, this.solvent);
      }
      const solventData = {
        label: molecule.iupac_name, smiles: molecule.cano_smiles, inchikey: molecule.inchikey, ratio: 1
      };
      const filtered = tmpSolvents.find((solv) => (solv && solv.label === solventData.label
            && solv.smiles === solventData.smiles
            && solv.inchikey && solventData.inchikey));
      if (!filtered) {
        tmpSolvents.push(solventData);
      }
      this.solvent = tmpSolvents;
    }
  }

  deleteSolvent(solventToDelete) {
    const tmpSolvents = [];
    if (this.solvent) {
      Object.assign(tmpSolvents, this.solvent);
    }

    const filteredIndex = tmpSolvents.findIndex((solv) => (solv.label === solventToDelete.label
            && solv.smiles === solventToDelete.smiles
            && solv.inchikey === solventToDelete.inchikey));
    if (filteredIndex >= 0) {
      tmpSolvents.splice(filteredIndex, 1);
    }
    this.solvent = tmpSolvents;

    // Recalculate the total mixture mass after deleting solvent
    this.calculateTotalMixtureMass();
  }

  updateSolvent(solventToUpdate) {
    const tmpSolvents = [];
    if (this.solvent) {
      Object.assign(tmpSolvents, this.solvent);
    }

    const filteredIndex = tmpSolvents.findIndex((solv) => (solv.smiles === solventToUpdate.smiles
              && solv.inchikey && solventToUpdate.inchikey));
    if (filteredIndex >= 0) {
      tmpSolvents[filteredIndex] = solventToUpdate;

      if (tmpSolvents.length > 1 && tmpSolvents.every((solv) => solv.amount_l)) {
        const totalVolume = tmpSolvents.reduce((acc, solv) => acc + solv.amount_l, 0);
        const minRatio = Math.min(...tmpSolvents.map((solv) => solv.amount_l / totalVolume));
        const scale = 1 / minRatio;

        tmpSolvents.forEach((solv) => {
          solv.ratio = Number((solv.amount_l / totalVolume) * scale).toFixed(1);
        });
      }
    }
    this.solvent = tmpSolvents;

    // Recalculate the total mixture mass after updating solvent list
    this.calculateTotalMixtureMass();
  }

  /**
   * Updates the sample type.
   * @param {string} newSampleType - The new sample type
   */
  updateSampleType(newSampleType) {
    this.sample_type = newSampleType;
  }

  /**
   * Initializes the components array and sorts them by position.
   * Also updates the checksum after all initialization is complete.
   * @param {Array<Object>} components - The components to initialize.
   */
  initialComponents(components) {
    this.components = components.sort((a, b) => a.position - b.position);

    // Calculate relative molecular weights for all components when initializing
    if (this.isMixture() && this.hasComponents()) {
      this.calculateRelativeMolecularWeightsForComponents();
      // Ensure a default reference is set (first by position) and ratios updated
      this.updateMixtureComponentEquivalent();
    }

    // Update checksum AFTER all initialization calculations are complete
    // This ensures isEdited is false when the sample is first opened
    this._checksum = this.checksum();
  }

  /**
   * Adds a new component to the mixture if it is not already present.
   * Updates the molecule and molfile if needed.
   * @async
   * @param {Object} newComponent - The new component to add.
   */
  async addMixtureComponent(newComponent) {
    const tmpComponents = [...(this.components || [])];
    const isNew = !tmpComponents.some((component) => component.molecule.iupac_name === newComponent.molecule.iupac_name
                                || component.molecule.inchikey === newComponent.molecule.inchikey
                                || component.molecule_cano_smiles.split('.').includes(newComponent.molecule_cano_smiles)); // check if this component is already part of a merged component (e.g. ionic compound)

    if (!newComponent.material_group) {
      newComponent.material_group = 'liquid';
    }

    if (!newComponent.purity) {
      newComponent.purity = 1;
    }

    if (isNew) {
      tmpComponents.push(newComponent);
      this.components = tmpComponents;
      this.setComponentPositions();

      if (!this.molecule_cano_smiles
        || !this.molecule_cano_smiles.split('.').some((smiles) => smiles === newComponent.molecule_cano_smiles)) {
        const newSmiles = this.molecule_cano_smiles
          ? `${this.molecule_cano_smiles}.${newComponent.molecule_cano_smiles}`
          : newComponent.molecule_cano_smiles;

        const result = await MoleculesFetcher.fetchBySmi(newSmiles, null, this.molfile, 'ketcher');
        this.molecule = result;
        this.molfile = result.molfile;
      }

      this.calculateTotalMixtureMass();

      // Ensure reference and equivalents are consistent after add
      this.updateMixtureComponentEquivalent();
    }
  }

  /**
   * Deletes a component from the mixture and updates the molecule and molfile if needed.
   * @async
   * @param {Object} componentToDelete - The component to delete.
   */
  async deleteMixtureComponent(componentToDelete) {
    const tmpComponents = [...(this.components || [])];
    const filteredComponents = tmpComponents.filter(
      (comp) => comp !== componentToDelete
    );
    this.components = filteredComponents;

    // Clear sample_svg_file for mixture samples to ensure combined molecule SVG is used
    if (this.isMixture()) {
      this.sample_svg_file = null;
    }

    if (!this.molecule_cano_smiles || this.molecule_cano_smiles === '') {
      this.molecule = null;
      this.molfile = '';
      return;
    }

    const smilesToRemove = componentToDelete.molecule_cano_smiles;
    const newSmiles = this.molecule_cano_smiles
      .split('.')
      .filter((smiles) => smiles !== smilesToRemove && !smilesToRemove.split('.').includes(smiles))
      .join('.');

    if (newSmiles !== this.molecule_cano_smiles) {
      const result = await MoleculesFetcher.fetchBySmi(newSmiles, null, this.molfile, 'ketcher');
      this.molecule = result;
      this.molfile = result.molfile;
    }
    this.setComponentPositions();

    // Recalculate total mixture mass after component deletion
    this.calculateTotalMixtureMass();
  }

  // callback function for handleTotalVolumeChangeforMixtures
  // Case 2: Total volume updated; Total Conc. is locked
  // Case 3: Total volume updated; Total Conc. is not locked
  /**
   * Updates the volume for all mixture components when the total volume changes.
   * @param {number} totalVolume - The new total volume for the mixture.
   */
  updateMixtureComponentVolume(totalVolume) {
    if (this.components.length < 1) {
      return;
    }

    if (totalVolume < 0) {
      NotificationActions.add({
        title: 'Invalid Total Volume',
        message: 'Total volume cannot be negative. Please enter a valid volume value.',
        level: 'error',
        position: 'tr',
        autoDismiss: 5,
      });
      return;
    }

    const referenceComponent = this.reference_component;

    this.components.forEach((component) => {
      component.handleTotalVolumeChanges(totalVolume, referenceComponent);
    });

    this.updateMixtureComponentEquivalent();
  }

  /**
   * Sets the reference component in the mixture by index and updates equivalents.
   *
   * The selected component is marked as the reference (reference = true, equivalent = 1),
   * and all other components are marked as non-reference.
   * If the provided index is invalid or the components array is missing,
   * the function exits without making any changes.
   *
   * @param {number} componentIndex - The index of the component to set as reference.
   */
  setReferenceComponent(componentIndex) {
    this.components[componentIndex].equivalent = 1;
    this.components[componentIndex].reference = true;

    this.components.forEach((component, index) => {
      if (index !== componentIndex) {
        component.reference = false;
      }
    });

    // Update equivalents for all components
    this.updateMixtureComponentEquivalent();
  }

  /**
   * Updates the 'equivalent' value (Ratio) of each component in the mixture
   * based on amount_mol of a designated reference component.
   *
   * The reference component is either:
   * - the one explicitly marked as `reference: true`, or
   * - the one at position 0 (fallback), if no reference is marked.
   *
   * After updating equivalents, the function also triggers a recalculation
   * of the mixture's molecular weight.
   *
   * @method updateMixtureComponentEquivalent
   * @returns {void}
   */
  updateMixtureComponentEquivalent() {
    if (!this.hasComponents()) return;

    // Find the index of the component marked as reference
    let referenceIndex = this.components.findIndex((component) => component.reference);

    // If no component is marked as the reference, use the component at position 0 as fallback
    if (referenceIndex === -1) {
      referenceIndex = this.components.findIndex((component) => component.position === 0);
      if (referenceIndex !== -1) {
        this.setReferenceComponent(referenceIndex);
      } else {
        return;
      }
    }

    const referenceComponent = this.components[referenceIndex];
    const referenceMol = referenceComponent.amount_mol ?? 0;

    // Set equivalent for each component
    this.components.forEach((component, index) => {
      if (!referenceMol || Number.isNaN(referenceMol)) {
        component.equivalent = index === referenceIndex ? 1 : 'n.d';
      } else if (index === referenceIndex) {
        component.equivalent = 1;
      } else {
        const currentMol = component.amount_mol ?? 0;
        component.equivalent = currentMol && !Number.isNaN(currentMol)
          ? currentMol / referenceMol
          : 0;
      }
    });
  }

  /**
   * Moves a material/component within the component array and updates positions.
   * @param {Object} srcMat - The source material/component to move.
   * @param {string} srcGroup - The source group name.
   * @param {Object} tagMat - The target material/component to move before/after.
   * @param {string} tagGroup - The target group name.
   */
  moveMaterial(srcMat, srcGroup, tagMat, tagGroup) {
    const srcIndex = this.components.findIndex((mat) => mat === srcMat);
    const tagIndex = this.components.findIndex((mat) => mat === tagMat);

    if (srcIndex === tagIndex) {
      return;
    }

    this.components[srcIndex].material_group = tagGroup;

    if (!tagMat && srcMat !== tagGroup) {
      return this.setComponentPositions();
    }

    const movedMat = this.components.splice(srcIndex, 1)[0];
    this.components.splice(tagIndex, 0, movedMat);
    this.setComponentPositions();
  }

  /**
   * Merges two components into a new one by combining their SMILES and updating the mixture.
   * @async
   * @param {Object} srcMat - The source material/component to merge.
   * @param {string} srcGroup - The source group name.
   * @param {Object} tagMat - The target material/component to merge with.
   * @param {string} tagGroup - The target group name.
   */
  async mergeComponents(srcMat, srcGroup, tagMat, tagGroup) {
    const srcIndex = this.components.findIndex((mat) => mat === srcMat);
    const tagIndex = this.components.findIndex((mat) => mat === tagMat);

    if (srcIndex === -1 || tagIndex === -1) {
      console.error('Source or target material not found in components.');
      return;
    }
    const newSmiles = `${srcMat.molecule_cano_smiles}.${tagMat.molecule_cano_smiles}`;

    try {
      const newMolecule = await MoleculesFetcher.fetchBySmi(newSmiles, null, this.molfile, 'ketcher');
      const newComponent = Sample.buildNew(newMolecule, this.collection_id);
      newComponent.material_group = tagGroup;

      await this.deleteMixtureComponent(tagMat);
      await this.deleteMixtureComponent(srcMat);
      await this.addMixtureComponent(newComponent);
    } catch (error) {
      console.error('Error merging components:', error);
    }
  }

  /**
   * Updates the position property of each component in the component array.
   */
  setComponentPositions() {
    this.components.forEach((mat, index) => {
      mat.position = index;
    });
  }

  /**
   * Splits a list of SMILES strings into molecules and adds them as subsamples/components.
   * @param {Array<string>} mixtureSmiles - Array of SMILES strings to split.
   * @param {string} editor - The editor to use for fetching molecules.
   * @returns {Promise<Array>} A promise that resolves when all molecules are processed.
   */
  splitSmilesToMolecule(mixtureSmiles, editor) {
    const promises = mixtureSmiles.map((smiles) => MoleculesFetcher.fetchBySmi(smiles, null, null, editor));

    return Promise.all(promises)
      .then((mixtureMolecules) => this.mixtureMoleculeToSubsample(mixtureMolecules))
      .catch((errorMessage) => {
        console.log(errorMessage);
        return [];
      });
  }

  /**
   * Creates components from the current sample when switching to Mixture type.
   * Uses the same logic as SampleDetails.splitSmiles but as a reusable method.
   * @param {string} editor - The editor to use for fetching molecules.
   * @returns {Promise<boolean>} A promise that resolves to true if components were created.
   */
  async createComponentsFromCurrentSample(editor = 'ketcher') {
    if (!this.isMixture() || !this.molecule_cano_smiles?.trim()) {
      return false;
    }

    try {
      const mixtureSmiles = this.molecule_cano_smiles.split('.');
      await this.splitSmilesToMolecule(mixtureSmiles, editor);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Converts an array of mixture molecules into subsamples/components and adds them to the mixture.
   * @param {Array<Object>} mixtureMolecules - The molecules to convert and add.
   */
  mixtureMoleculeToSubsample(mixtureMolecules) {
    mixtureMolecules.map(async (molecule) => {
      const newSample = Sample.buildNew(molecule, this.collection_id);
      await this.addMixtureComponent(newSample);
    });
  }

  initializeSampleDetails() {
    this.sample_details = this.sample_details || {};
  }

  /**
   * Prepares mixture samples for saving by setting reference molecular weights
   * and calculating relative molecular weights for components.
   *
   * This method should be called before saving mixture samples to ensure
   * all mixture-specific properties are properly calculated and stored.
   */
  prepareMixtureForSave() {
    // Only process mixture samples with components
    if (!this.isMixture() || !this.hasComponents()) {
      return;
    }

    this.initializeSampleDetails();

    const referenceComponent = this.reference_component;

    if (referenceComponent) {
      const { molecule, component_properties: componentProperties } = referenceComponent;

      // Assign values to sample_details
      Object.assign(this.sample_details, {
        reference_molecular_weight: molecule?.molecular_weight || null,
        reference_relative_molecular_weight: componentProperties?.relative_molecular_weight || null
      });

      // Reset the reference component changed flag to default (true) after saving calculations
      this.sample_details.reference_component_changed = true;

      // Log warnings if values are missing
      if (!molecule?.molecular_weight) {
        console.warn('Reference component has no molecular weight');
      }
      if (!componentProperties?.relative_molecular_weight) {
        console.warn('Reference component has no relative molecular weight');
      }
    }
  }

  /**
   * Calculates the total mass (g) of a mixture sample.
   * - Sums all masses of included solid materials (amount_g).
   * - For each liquid, mass = density [g/ml] * volume [ml] (if density is given),
   *   or 1 [g/ml] * volume [ml] if density is not given.
   * - Stores the total mass in sample_details.total_mixture_mass_g and returns it.
   * - If at least one component is liquid, also calculates and stores mixture density (g/ml) as
   *   total_mixture_mass_g/total_volume in the sample.
   */
  calculateTotalMixtureMass() {
    this.initializeSampleDetails();

    if (!this.isMixture() || !this.hasComponents()) {
      this.sample_details.total_mixture_mass_g = 0;
      this.setDensity({ value: 0 });

      return;
    }

    let totalMass = 0;
    let totalLiquidComponentsMassG = 0;

    // --- Step 1: Calculate component masses and sum liquid component masses (with densities) ---
    this.components.forEach((component) => {
      if (component.material_group === 'solid') {
        // For solids, use amount_g (already in grams)
        totalMass += parseFloat(component.amount_g) || 0;
      } else if (component.material_group === 'liquid') {
        // For liquids, use density * volume (ml)
        const density = (component.density && component.density > 0) ? component.density : 1; // g/ml
        const componentVolumeML = (parseFloat(component.amount_l) || 0) * 1000;
        const componentMassG = density * componentVolumeML;
        totalMass += componentMassG;
        totalLiquidComponentsMassG += componentMassG;
      }
    });

    // --- Step 2: Determine total/solvent volume info ---
    const totalVolumeL = this.sample_details.total_mixture_volume_l || this.amount_l || 0;
    const totalVolumeML = (parseFloat(totalVolumeL) || 0) * 1000;
    const hasTotalVolume = totalVolumeML > 0;
    const hasSolvents = Array.isArray(this.solvent) && this.solvent.length > 0;

    // --- Step 3: If total volume is present, subtract liquid components mass (converted from volume*density) and add remaining volume mass
    if (hasTotalVolume) {
      // Calculate the mass equivalent of the total volume (assuming 1 g/mL for the total volume)
      const totalVolumeMassG = totalVolumeML;
      // Subtract the mass of liquid components (which already accounts for their densities)
      const remainingVolumeMassG = totalVolumeMassG - totalLiquidComponentsMassG;
      // Add remaining volume mass
      if (remainingVolumeMassG > 0) {
        totalMass += remainingVolumeMassG;
      }
    } else if (hasSolvents) {
      // --- Step 4: Sum solvents only when total volume is NOT present
      this.solvent.forEach((solv) => {
        if (!solv) { return; }

        const density = (solv.density && solv.density > 0) ? solv.density : 1; // g/mL
        const volumeL = parseFloat(solv.amount_l ?? 0) || 0; // L
        const volumeML = volumeL * 1000; // mL
        totalMass += density * volumeML; // g
      });
    }
    this.sample_details.total_mixture_mass_g = totalMass;
    // Set amount directly without triggering updateMixtureComponentAmounts()
    // to preserve user's amount_mol inputs when calculating total mass
    this.amount_value = totalMass;
    this.amount_unit = 'g';

    // Calculation of the density in g/ml = total mass/total volume. So density is recalculated here.
    this.updateMixtureDensity();

    // Update relative molecular weights after total mass calculation
    this.calculateRelativeMolecularWeightsForComponents();
  }

  /**
   * Updates the mixture density (g/mL) based on total mass and total volume.
   *
   * @description
   * This method calculates the overall mixture density as:
   *    density = total_mass_g / total_volume_mL
   *
   * Steps:
   * 1. Returns early if the sample is not a mixture or has no components.
   * 2. Initializes `sample_details` if missing.
   * 3. Retrieves total mixture mass (g) and total volume (L → converted to mL).
   * 4. If the mixture is liquid and volume > 0, computes and sets the density.
   *    Otherwise, resets density to 0.
   *
   * @returns {void}
   */
  updateMixtureDensity() {
    if (!this.isMixture() || !this.hasComponents()) return;

    this.initializeSampleDetails();

    const totalMassG = Number(this.sample_details.total_mixture_mass_g) || 0;
    const totalVolumeL = this.sample_details.total_mixture_volume_l || this.amount_l || 0;
    const totalVolumeML = parseFloat(totalVolumeL) * 1000;

    // Calculate and set density if valid
    if (this.isMixtureLiquid() && totalVolumeML > 0) {
      const density = totalMassG / totalVolumeML;
      this.setDensity({ value: density });
    } else {
      this.setDensity({ value: 0 });
    }
  }

  /**
   * Calculates relative molecular weight for each component in the mixture.
   * This method iterates through all components and calls each component's
   * calculateRelativeMolecularWeight method, passing this sample as a parameter.
   */
  calculateRelativeMolecularWeightsForComponents() {
    if (!this.isMixture() || !this.hasComponents()) return;

    this.components.forEach((component, index) => {
      if (component && typeof component.calculateRelativeMolecularWeight === 'function') {
        try {
          component.calculateRelativeMolecularWeight(this);

          // If this is the reference component, also update the sample's reference_relative_molecular_weight
          if (component.reference) {
            this.sample_details = this.sample_details || {};
            this.sample_details.reference_relative_molecular_weight = component.relative_molecular_weight;
          }
        } catch (error) {
          console.error(`Error calculating relative MW for component ${index}:`, error);
        }
      }
    });
  }

  /**
   * Calculates and updates the equivalent from reaction reference material.
   * Equivalent = sample.amount_mol / reference_sample.amount_mol
   * @param {Object} referenceMaterial - The reaction's reference material
   * @returns {boolean} - Whether the calculation was performed and equivalent updated
   */
  calculateEquivalentFromReferenceMaterial(referenceMaterial) {
    if (!referenceMaterial) {
      console.warn('Missing reference material for equivalent calculation');
      return false;
    }

    const parentAmountMol = this.amount_mol;
    if (!referenceMaterial.amount_mol || referenceMaterial.amount_mol <= 0) {
      console.warn('Invalid reference material amount_mol for equivalent calculation');
      return false;
    }

    this.equivalent = parentAmountMol / referenceMaterial.amount_mol;
    return true;
  }

  /**
   * Applies mixture properties from sample_details to a target sample.
   * Maps total_mixture_mass_g to amount_g.
   * and calculates amount_l based on mass and density.
   * @param {Sample} targetSample - The sample to apply mixture properties to
   */
  applyMixturePropertiesToSample(targetSample) {
    if (this.isMixture() && this.sample_details) {
      if (this.sample_details.total_mixture_mass_g !== undefined) {
        // Set the amount in grams using the proper amount_value and amount_unit properties
        targetSample.setAmount({ value: this.sample_details.total_mixture_mass_g, unit: 'g' });
      }
    }
  }

  isGas() {
    return this.gas_type === 'gas';
  }

  isFeedstock() {
    return this.gas_type === 'feedstock';
  }

  isCatalyst() {
    return this.gas_type === 'catalyst';
  }
}

Sample.counter = 0;
Sample.children_count = {};
