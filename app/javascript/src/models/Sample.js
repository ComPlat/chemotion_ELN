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
  calculateGasConcentrationFromPpm,
  updateFeedstockMoles,
  calculateTON,
  calculateTONPerTimeValue,
  determineTONFrequencyValue,
} from 'src/utilities/UnitsConversion';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import alt from 'src/stores/alt/alt';
import { rootStore } from 'src/stores/mobx/RootStore';

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

    const xrefLabel = args.xref && args.xref[`${field}_label`];
    const lower = argsNew[`${field}_lowerbound`];
    const upper = argsNew[`${field}_upperbound`];

    if (xrefLabel) {
      argsNew[`${field}_display`] = xrefLabel;
    } else if (lower == null && upper == null) {
      argsNew[`${field}_display`] = '';
    } else if (lower == null) {
      argsNew[`${field}_display`] = `<${upper}`;
    } else if (upper == null) {
      argsNew[`${field}_display`] = lower.toString().trim();
    } else {
      argsNew[`${field}_display`] = `${lower} – ${upper}`.trim();
    }
  }
  return argsNew;
};

const parseHstoreNumber = (val) => {
  if (val === null || val === undefined) return val;

  const num = parseFloat(val);

  return Number.isNaN(num) ? val : num;
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
    if (this.isMixture() && this.sample_details?.reference_component_changed) {
      // Old mol-stored mixtures used this snapshot to preserve their physical mass.
      const previousMass = this.sample_details.previous_amount_g;
      if (this.amount_unit === 'mol' && Number.isFinite(previousMass) && previousMass >= 0) {
        this.amount_value = previousMass;
        this.amount_unit = 'g';
      }
      this.sample_details = { ...this.sample_details, reference_component_changed: false };
      this.updateChecksum();
    }
  }

  get belongTo() {
    return this._belongTo;
  }

  set belongTo(element) {
    // Editor context is not part of sample data and must never make reaction serialization cyclic.
    Object.defineProperty(this, '_belongTo', { value: element, writable: true, configurable: true });
  }

  set mixtureReactionContext(reaction) {
    Object.defineProperty(this, '_mixtureReactionContext', { value: reaction, writable: true, configurable: true });
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
      ancestor_ids: [],
      literatures: {},
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

  /** Whether this saved sample is currently a reaction material. A historical tag is not a link. */
  isReactionLinked() {
    if (this.isNew) return false;
    if (this.belongTo?.type === 'reaction' && Array.isArray(this.belongTo.samples)) {
      return this.belongTo.samples.some((sample) => sample.id === this.id && !sample.isNew);
    }
    return (this.tag?.taggable_data?.resources || []).some(
      (resource) => resource.resource_context_type === 'Reaction'
    );
  }

  /** Capture the reaction-owned quantity and reference independently of editor composition edits. */
  mixtureReactionState() {
    const referenceComponent = this.reference_component
      || this.components?.find((component) => component.component_properties?.reference);
    return JSON.stringify({
      amountType: this.amountType,
      massG: this.amount_g,
      density: this.density,
      referenceComponentId: referenceComponent?.id,
      componentIds: this.components?.map((component) => component.id).sort(),
    });
  }

  /** Overlay reaction quantities while retaining the editor's freshly fetched sample details. */
  applyReactionMixtureQuantities(material) {
    const sourceComponents = material.components || [];
    if (sourceComponents.length > 0
      && !_.isEqual(sourceComponents.map((component) => component.id).sort(),
        (this.components || []).map((component) => component.id).sort())) {
      throw new Error('The mixture composition changed. Reload the reaction before opening this mixture.');
    }

    Object.assign(this, _.cloneDeep(_.pick(material, [
      'amountType', 'target_amount_value', 'target_amount_unit', 'real_amount_value', 'real_amount_unit',
      'density', 'concn', 'preserveConcentration',
    ])));
    this.sample_details = {
      ...this.sample_details,
      ..._.cloneDeep(_.pick(material.sample_details, [
        'total_mixture_volume_l', 'total_mixture_mass_g', 'previous_amount_g', 'previous_amount_mol',
        'solvent_scaling_mass_g', 'reference_molecular_weight', 'reference_relative_molecular_weight',
        'reference_component_changed',
        'reaction_amount_input_units',
      ])),
    };
    (this.components || []).forEach((component) => {
      const source = sourceComponents.find((entry) => entry.id === component.id);
      if (!source) return;
      Object.assign(component, _.cloneDeep(_.pick(source.component_properties || source, [
        'amount_mol', 'amount_g', 'amount_l', 'relative_molecular_weight', 'reference',
      ])));
    });
    if (Array.isArray(this.solvent) && Array.isArray(material.solvent)) {
      this.solvent.forEach((solvent, index) => {
        const source = material.solvent[index];
        if (source && _.isEqual(_.omit(solvent, ['amount_l']), _.omit(source, ['amount_l']))) {
          solvent.amount_l = source.amount_l;
        }
      });
    }
    this.syncMixtureComponentAmounts();
    this.updateMixtureComponentEquivalent();
  }

  /** A toolbar save replaces the open reaction; editor context may still hold its previous instance. */
  resolveReactionContext(reaction = this.belongTo) {
    // Resolve lazily through the store registry to avoid a Sample/ElementStore import cycle.
    const selecteds = alt.getStore('ElementStore')?.getState()?.selecteds || [];
    if (reaction) {
      if (reaction.type !== 'reaction' || reaction.id == null) return reaction;
      return selecteds.find((element) => element.type === 'reaction' && element.id === reaction.id) || reaction;
    }
    const resourceIds = (this.tag?.taggable_data?.resources || [])
      .filter((resource) => resource.resource_context_type === 'Reaction')
      .map((resource) => resource.resource_context_id);
    const linked = selecteds.filter((element) => element.type === 'reaction' && resourceIds.includes(element.id)
      && element.samples?.some((sample) => sample.id === this.id));
    return linked.find((element) => element.products?.some((sample) => sample.id === this.id))
      || linked[0] || selecteds.find((element) => element.type === 'reaction'
        && element.id === this._mixtureReactionContext?.id) || this._mixtureReactionContext;
  }

  /** Only a product entered as a mass uses mass-preserving composition edits. */
  hasFixedProductMass() {
    if (!this.isMixture() || this.amount_unit !== 'g') return false;

    const reaction = this.resolveReactionContext();
    const product = reaction?.products?.find((sample) => sample.id === this.id);
    // Legacy samples have no input-unit metadata; retain their stored-unit behavior.
    const inputUnit = this.sample_details?.reaction_amount_input_units?.[this.amountType]
      ?? product?.sample_details?.reaction_amount_input_units?.[this.amountType] ?? this.amount_unit;
    return !!product && inputUnit === 'g';
  }

  hasReactionMixtureConflict(reaction = this.belongTo) {
    if (!this.isMixture() || !this.isDetachedMixtureDraft || !this._mixtureDraftSourceState) return false;

    const material = this.resolveReactionContext(reaction)?.sampleById?.(this.id);
    return !material
      || !Sample.sameMixtureReactionState(material.mixtureReactionState(), this._mixtureDraftSourceState);
  }

  /** Keep open drafts attached after persistence, or detach when their reaction row was removed. */
  rebindReactionMixtureDraft(reaction = this.resolveReactionContext()) {
    if (!this.isMixture() || !this.isDetachedMixtureDraft || !reaction) return;
    if (this.belongTo?.id != null && this.belongTo.id !== reaction.id) return;
    const mapping = reaction._mixtureMaterialIdMap?.[this.id];
    if (!reaction.sampleById(this.id) && mapping && reaction.sampleById(mapping.id)) {
      const pending = this.changed || this.isEdited;
      this.id = mapping.id;
      this.isNew = false;
      (this.components || []).forEach((component) => {
        component.id = mapping.component_ids[component.id] || component.id;
      });
      const baseline = JSON.parse(this._mixtureDraftSourceState);
      baseline.referenceComponentId = mapping.component_ids[baseline.referenceComponentId]
        || baseline.referenceComponentId;
      baseline.componentIds = baseline.componentIds?.map((id) => mapping.component_ids[id] || id).sort();
      this._mixtureDraftSourceState = JSON.stringify(baseline);
      if (!pending) this.updateChecksum();
    }
    if (reaction.sampleById(this.id)) {
      this.belongTo = reaction;
    } else {
      if (!this.isNew) {
        if (!reaction._detachedMixtureMaterialIds) {
          Object.defineProperty(reaction, '_detachedMixtureMaterialIds', { value: new Set() });
        }
        reaction._detachedMixtureMaterialIds.add(this.id);
      }
      this.belongTo = undefined;
      delete this.isDetachedMixtureDraft;
      delete this._mixtureDraftSourceState;
      delete this.matGroup;
    }
  }

  static sameMixtureReactionState(left, right) {
    if (left === right) return true;
    if (!left || !right) return false;
    const first = JSON.parse(left);
    const second = JSON.parse(right);
    const sameMass = Number.isFinite(first.massG) && Number.isFinite(second.massG)
      && Math.abs(first.massG - second.massG) <= 1e-9 * Math.max(Math.abs(first.massG), Math.abs(second.massG), 1e-6);
    return sameMass && _.isEqual(_.omit(first, ['massG']), _.omit(second, ['massG']));
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

  /**
   * Normalizes a dot-separated SMILES string to a sorted set for order-independent comparison.
   * Assumes each fragment is a single-molecule SMILES (no dot-salts like [Na+].[Cl-] per component).
   * @param {string} smiles - Dot-separated canonical SMILES
   * @returns {string} Sorted, dot-joined SMILES string
   */
  static normalizeSmilesSet(smiles) {
    if (typeof smiles !== 'string' || smiles === '') return '';
    return smiles.split('.').filter(Boolean).sort().join('.');
  }

  /**
   * Compares two dot-separated SMILES strings as sets (order-independent).
   * @param {string} a - First SMILES string
   * @param {string} b - Second SMILES string
   * @returns {boolean} True when both strings represent the same SMILES set
   */
  static sameSmilesSet(a, b) {
    return Sample.normalizeSmilesSet(a ?? '') === Sample.normalizeSmilesSet(b ?? '');
  }

  /**
   * Reorders mixture components to follow the sequence in a dot-separated SMILES string
   * (typically matching the structure editor / molfile fragment order).
   * @param {Array<string>} mixtureSmiles - Ordered SMILES fragments
   */
  syncComponentOrderToSmiles(mixtureSmiles) {
    if (!this.hasComponents() || !mixtureSmiles?.length) return;

    const ordered = [];
    const remaining = [...this.components];

    mixtureSmiles.forEach((smiles) => {
      const index = remaining.findIndex(
        (component) => component.molecule_cano_smiles === smiles
          || component.molecule?.cano_smiles === smiles
      );
      if (index >= 0) {
        ordered.push(remaining[index]);
        remaining.splice(index, 1);
      }
    });

    if (remaining.length > 0) {
      ordered.push(...remaining);
    }

    this.components = ordered;
    this.setComponentPositions();
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
      newSample.molecule_name = sample.molecule_name;
      newSample.sample_svg_file = sample.sample_svg_file;
      newSample.residues = sample.residues || [];
      newSample.contains_residues = sample.contains_residues || !!sample.molecule?.is_partial;
      newSample.filterResidueData(true);
    } else {
      // source is a Molecule — propagate polymer flag so yield uses loading-based formula
      newSample.molecule = sample;
      if (sample.is_partial) {
        newSample.contains_residues = true; // triggers setDefaultResidue(); loading stays null until user sets it
      }
    }
    if (sample.stereo) {
      const { abs, rel } = sample.stereo;
      newSample.stereo = { abs, rel };
    }
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
    // Compute missing stock mass and relative MWs before the portion copies them.
    if (this.isMixture() && this.hasComponents() && !this.sample_details?.total_mixture_mass_g) {
      this.calculateTotalMixtureMass();
    }

    const splitSample = this.clone();
    if (this.isMixture()) {
      // A reaction portion must not rescale the stock's components or internal solvents.
      splitSample.components = _.cloneDeep(this.components);
      splitSample.sample_details = _.cloneDeep(this.sample_details);
      splitSample.solvent = _.cloneDeep(this.solvent);
    }
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
      literatures: this.literatures,
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
    const show_sample_short_label = profile ? profile.show_sample_short_label : false;
    const { external_label, name, short_label } = this;
    const extLabelClass = 'label--bold';

    const otherChecked = show_external_name || show_sample_name;
    const showShortLabel = !otherChecked || show_sample_short_label;

    const parts = [];
    if (showShortLabel) parts.push(<span key="short">{short_label}</span>);
    if (show_sample_name && name) parts.push(<span key="name" className={extLabelClass}>{name}</span>);
    if (show_external_name && external_label) parts.push(<span key="ext" className={extLabelClass}>{external_label}</span>);

    if (parts.length === 0) return short_label;
    if (parts.length === 1) return parts[0];

    return (
      <span className="d-inline-flex gap-1 align-items-center">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-muted">|</span>}
            {part}
          </React.Fragment>
        ))}
      </span>
    );
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

  // Returns true when a bound value represents an open (unbounded) end of a range.
  static isOpenBound(value) {
    return value === '' || value == null
      || value === Number.NEGATIVE_INFINITY || value === Number.POSITIVE_INFINITY
      || value === '-Infinity' || value === 'Infinity';
  }

  // Persists or removes the human-readable label in xref so it survives a reload.
  updateRangeLabel(field, label) {
    this.xref = { ...(this.xref || {}) };
    if (label === '' || label == null) {
      delete this.xref[`${field}_label`];
    } else {
      this.xref[`${field}_label`] = label;
    }
  }

  // Derives the display string shown in the UI input from the normalised bounds.
  static rangeDisplayText(lowerForApi, upperForApi, isOpenLower, isOpenUpper, label) {
    if (label) return label;

    if (isOpenLower && isOpenUpper) return '';

    if (isOpenLower) return `<${upperForApi}`;
    if (isOpenUpper) return lowerForApi.toString();

    if (lowerForApi === upperForApi) return lowerForApi.toString();

    return `${lowerForApi} – ${upperForApi}`.trim();
  }

  // Serializes the bounds into the Ruby range literal stored on the model
  // and sent to the API (e.g. "65..68", "65...Infinity", "-Infinity..200").
  static rangeSerialised(lowerForApi, upperForApi, isOpenLower, isOpenUpper) {
    if (isOpenLower && isOpenUpper) return '';
    if (isOpenLower) return `-Infinity..${upperForApi}`;
    if (isOpenUpper || lowerForApi === upperForApi) return `${lowerForApi}...${Number.POSITIVE_INFINITY}`;

    return `${lowerForApi}..${upperForApi}`;
  }

  updateRange(field, lower, upper, label = undefined) {
    const isOpenLower = Sample.isOpenBound(lower);
    const isOpenUpper = Sample.isOpenBound(upper);

    const lowerForApi = isOpenLower ? '' : lower;
    const upperForApi = isOpenUpper ? '' : upper;

    this[`${field}_lowerbound`] = lowerForApi;
    this[`${field}_upperbound`] = upperForApi;

    // Always synchronize the persisted xref label with the current update so
    // stale labels do not survive calls that only change/clear the bounds.
    this.updateRangeLabel(field, label === undefined ? '' : label);

    const displayText = Sample.rangeDisplayText(lowerForApi, upperForApi, isOpenLower, isOpenUpper, label);
    // When both bounds are equal treat it as a single-value entry (no upper stored).
    if (!isOpenLower && !isOpenUpper && lowerForApi === upperForApi) {
      this[`${field}_upperbound`] = '';
    }

    this[`${field}_display`] = displayText;
    this[field] = Sample.rangeSerialised(lowerForApi, upperForApi, isOpenLower, isOpenUpper);
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
    if (!this.isMixture() || !this.hasComponents()) return;

    this.updateComponentAmounts();
    this.updateSolventVolumes();
  }

  /** Synchronizes component amounts to the current mass without rescaling internal solvents. */
  syncMixtureComponentAmounts() {
    if (!this.isMixture() || !this.hasComponents()) return;

    const relativeWeight = Number(this.reference_component?.relative_molecular_weight);
    const expectedAmountMol = Number(this.amount_g) / relativeWeight;
    const componentAmountMol = Number(this.reference_component?.amount_mol);
    const tolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(expectedAmountMol));
    if (Number.isFinite(relativeWeight) && relativeWeight > 0 && Number.isFinite(expectedAmountMol)
      && (!Number.isFinite(componentAmountMol)
        || Math.abs(componentAmountMol - expectedAmountMol) > tolerance)) {
      this.updateComponentAmounts();
    }
  }

  /** Updates a component ratio, preserving gram-entered reaction product mass. */
  updateComponentRatio(
    component, ratio, materialGroup, { concentrationLocked = false, lockAmountColumnSolids = null } = {}
  ) {
    const referenceComponent = this.reference_component;
    if (!referenceComponent) return;

    if (this.hasFixedProductMass()) {
      this.updateProductComponentRatio(component, ratio, { concentrationLocked });
      return;
    }

    const hasUnallocatedMass = this.hasUnallocatedMixtureMass();

    component.updateRatio(ratio, materialGroup, this.amount_l, referenceComponent.amount_mol, lockAmountColumnSolids);
    if (concentrationLocked) this.updateTotalVolume(component.amount_mol, component.concn);

    if (hasUnallocatedMass) {
      this.updateComponentAmounts();
      // Another missing/zero ratio can still prevent initialization. Keep the entered
      // mass instead of overwriting it with the unresolved components' zero total.
      if (!this.components.some((entry) => Number(entry.amount_mol) > 0)) return;
    }
    this.calculateTotalMixtureMass();
  }

  /** Whether a known mixture mass has not yet been assigned to any component quantities or weights. */
  hasUnallocatedMixtureMass() {
    const massG = Number(this.amount_g);
    return this.isMixture() && this.hasComponents() && Number.isFinite(massG) && massG > 0
      && !this.components.some((component) => {
        const weight = Number(component.relative_molecular_weight);
        return (Number.isFinite(weight) && weight > 0) || ['amount_mol', 'amount_g', 'amount_l']
          .some((field) => Number(component[field]) > 0);
      });
  }

  /** Redistributes a product's fixed mass using its molar ratios rather than stored relative weights. */
  updateProductComponentRatio(component, ratio, { concentrationLocked = false } = {}) {
    const massG = Number(this.amount_g);
    if (!Number.isFinite(massG) || massG < 0 || !Number.isFinite(ratio) || ratio < 0) return;

    component.equivalent = ratio;
    this.redistributeProductMixtureMass({ component, concentrationLocked });
  }

  /** Applies composition or volume edits only when the resulting amounts fit the current product mass. */
  redistributeProductMixtureMass({
    component = this.reference_component, concentrationLocked = false, totalVolumeL,
  } = {}) {
    const massG = Number(this.amount_g);
    if (!Number.isFinite(massG) || massG < 0 || !this.hasComponents()) return false;
    if (totalVolumeL !== undefined && (!Number.isFinite(totalVolumeL) || totalVolumeL < 0)) return false;

    const mixtureComposition = this.getProductMixtureComposition();
    if (!mixtureComposition) return false;

    const { composition } = mixtureComposition;
    const scale = this.productMixtureMolarScale(massG, mixtureComposition, component, {
      concentrationLocked, totalVolumeL,
    });
    if (!Number.isFinite(scale) || scale < 0) return false;

    const componentMassG = scale * mixtureComposition.weightedMass;
    if (totalVolumeL !== undefined && componentMassG <= 8 * Number.EPSILON * Math.max(1, massG)) return false;

    if (totalVolumeL !== undefined) {
      this.initializeSampleDetails();
      this.sample_details.total_mixture_volume_l = totalVolumeL;
    }
    composition.forEach((entry) => {
      entry.component.amount_mol = scale * entry.ratio;
      entry.component.updatePhysicalAmounts();
    });

    this.updateProductMixtureProperties(component, massG, {
      concentrationLocked, volumeEdited: totalVolumeL !== undefined,
    });
    return true;
  }

  /** Validates molar ratios and calculates the physical mass per ratio unit. */
  getProductMixtureComposition() {
    const composition = this.components.map((entry) => ({
      component: entry,
      ratio: entry.equivalent,
      massPerMole: Sample.componentMassPerMole(entry),
    }));
    if (!composition.every((entry) => Number.isFinite(entry.ratio) && entry.ratio >= 0
      && Number.isFinite(entry.massPerMole) && entry.massPerMole > 0)) return null;

    const weightedMass = composition.reduce(
      (sum, entry) => sum + entry.ratio * entry.massPerMole, 0
    );
    if (!Number.isFinite(weightedMass) || weightedMass <= 0) return null;

    const liquidWeight = composition.reduce((sum, entry) => sum
      + (entry.component.material_group === 'liquid' ? entry.ratio * entry.massPerMole : 0), 0);

    return { composition, weightedMass, liquidWeight, solidWeight: weightedMass - liquidWeight };
  }

  /** Solves the same component, solvent and total-volume mass balance as calculateTotalMixtureMass. */
  productMixtureMolarScale(massG, composition, component, {
    concentrationLocked = false, totalVolumeL,
  } = {}) {
    const { weightedMass, liquidWeight, solidWeight } = composition;
    if (concentrationLocked && Number.isFinite(component.concn) && component.concn > 0) {
      const volumeWeight = 1000 * component.equivalent / component.concn;
      return volumeWeight > 0 ? massG / (solidWeight + Math.max(liquidWeight, volumeWeight))
        : (massG - this.mixtureSolventMass()) / weightedMass;
    }

    const volumeMass = (totalVolumeL ?? this.resolveMixtureTotalVolume()) * 1000;
    if (volumeMass > 0) {
      // With liquids only, total volume can already account for the entire mass.
      // Retain the current component mass rather than assigning the remainder twice.
      const tolerance = 8 * Number.EPSILON * Math.max(1, massG, volumeMass);
      if (solidWeight === 0 && Math.abs(massG - volumeMass) <= tolerance) {
        const liquidMass = this.components.reduce((sum, entry) => sum + Sample.componentMassInMixture(entry), 0);
        return Math.min(liquidMass, massG) / liquidWeight;
      }
      const scale = massG / weightedMass;
      if (scale * liquidWeight >= volumeMass) return scale;
      if (solidWeight > 0) return (massG - volumeMass) / solidWeight;
      return null;
    }
    return (massG - this.mixtureSolventMass()) / weightedMass;
  }

  /** Physical solution mass per mole follows the same density/stock priority as component volume calculations. */
  static componentMassPerMole(component) {
    const purity = Number(component.purity ?? 1);
    if (!Number.isFinite(purity) || purity <= 0) return NaN;
    if (!['solid', 'liquid'].includes(component.material_group)) return NaN;
    if (component.material_group === 'liquid' && !(component.density > 0)) {
      const stock = Number(component.starting_molarity_value);
      return Number.isFinite(stock) && stock > 0 ? 1000 / (stock * purity) : NaN;
    }
    return Number(component.molecule_molecular_weight) / purity;
  }

  /** Refreshes product mass, volume, molecular weights and concentrations after redistribution. */
  updateProductMixtureProperties(component, massG, { concentrationLocked = false, volumeEdited = false } = {}) {
    this.initializeSampleDetails();
    this.sample_details.total_mixture_mass_g = massG;
    if (concentrationLocked && Number.isFinite(component.concn) && component.concn > 0) {
      this.sample_details.total_mixture_volume_l = component.amount_mol / component.concn;
    }
    this.updateMixtureDensity();
    this.calculateRelativeMolecularWeightsForComponents();
    const totalVolumeL = this.amount_l;
    // An explicit volume edit takes priority over concentration locks to keep mass and ratios consistent.
    this.components.forEach((entry) => entry.calculateTargetConcentration(totalVolumeL, { ignoreLock: volumeEdited }));
  }

  /** Checks whether a component can participate in mass initialization from positive ratios. */
  static hasValidComponentComposition(component) {
    const ratio = Number.isFinite(component.equivalent)
      ? component.equivalent : (component.reference ? 1 : null);
    const molarMass = Number(component.molecule_molecular_weight);
    const purity = Number(component.purity ?? 1);
    // Stock molarity relates solute moles to solution volume, not solution mass.
    // A density is required for a liquid to participate in this mass-only split.
    const hasLiquidMassBasis = component.material_group !== 'liquid'
      || (Number.isFinite(Number(component.density)) && Number(component.density) > 0);
    return hasLiquidMassBasis && ratio != null && ratio > 0 && Number.isFinite(molarMass) && molarMass > 0
      && Number.isFinite(purity) && purity > 0;
  }

  /**
   * Updates component amounts (in mol) from the mixture's total mass using stored
   * relative molecular weights, which include solvent mass and component purity.
   *
   * If no component has a usable relative molecular weight, a solvent-free composition
   * without a total-volume mass basis can initialize from known ratios and molar masses:
   *   amount_mol_i = (ratio_i * totalMass) / Σ_j (ratio_j * molar_mass_j / purity_j)
   * This fallback assumes all mixture mass belongs to the components, preserves their
   * mole ratios and conserves their physical mass, including impurities.
   *
   * Missing weights in a loaded mixture and unknown ratios in a new composition leave
   * the affected amounts unchanged; their mass must not be redistributed to other components.
   * @returns {void}
   */
  updateComponentAmounts() {
    const totalMassG = Number(this.amount_g);
    if (!Number.isFinite(totalMassG) || totalMassG < 0) return;

    const components = this.components || [];
    if (components.length === 0) return;

    const hasRelativeWeight = (component) => {
      const relativeWeight = Number(component.relative_molecular_weight);
      return Number.isFinite(relativeWeight) && relativeWeight > 0;
    };

    // A missing weight must not discard the solvent-aware weights of the other components.
    if (components.some(hasRelativeWeight)) {
      components.forEach((component) => {
        if (!hasRelativeWeight(component)) return;

        component.amount_mol = totalMassG / Number(component.relative_molecular_weight);
        component.updatePhysicalAmounts?.();
      });
      return;
    }

    // Ratio initialization assumes no solvent mass. Match the volume basis used by
    // calculateTotalMixtureMass, including its fallback to the sample's own volume.
    const totalVolumeL = Number(this.sample_details?.total_mixture_volume_l ?? this.amount_l);
    if ((Array.isArray(this.solvent) && this.solvent.length > 0)
      || !Number.isFinite(totalVolumeL) || totalVolumeL !== 0) return;

    const ratioOf = (component) => {
      const isRef = !!component.reference;
      return Number.isFinite(component.equivalent) ? component.equivalent : (isRef ? 1 : 0);
    };
    const molarMassOf = (component) => Number(component.molecule_molecular_weight);
    const purityOf = (component) => Number(component.purity ?? 1);

    // Require positive ratios for every component: zero/reset or unknown ratios and
    // missing/invalid molar masses leave the distribution indeterminate. Do not assign
    // those components 0 moles and reallocate their share to the others.
    if (!components.every(Sample.hasValidComponentComposition)) return;

    // Physical mass per ratio unit: Σ (ratio_j * molar_mass_j / purity_j).
    const weighted = components.reduce(
      (sum, component) => sum + (ratioOf(component) * molarMassOf(component) / purityOf(component)),
      0
    );
    if (!Number.isFinite(weighted) || weighted <= 0) return;

    components.forEach((component) => {
      component.amount_mol = (ratioOf(component) * totalMassG) / weighted;
      component.updatePhysicalAmounts?.();
    });
  }

  /**
   * Scales solvent volumes (L) relative to change in total mass.
   * @param {number} [previousAmountG] - Mass before this rescale; defaults to the user-edit snapshot.
   * @returns {void}
   */
  updateSolventVolumes(previousAmountG = this.sample_details?.previous_amount_g) {
    if (!Array.isArray(this.solvent) || this.solvent.length === 0) return;

    this.initializeSampleDetails();
    const prevAmountG = Number(previousAmountG);
    const currentAmountG = Number(this.amount_g);
    const basisMassG = Number.isFinite(prevAmountG) && prevAmountG > 0
      ? prevAmountG : Number(this.sample_details.solvent_scaling_mass_g);

    // A committed zero can be an intermediate typing value. Keep the solvent and
    // its last positive mass basis so the next nonzero edit can still rescale it.
    if (!Number.isFinite(currentAmountG) || currentAmountG <= 0) {
      if (Number.isFinite(basisMassG) && basisMassG > 0) {
        this.sample_details.solvent_scaling_mass_g = basisMassG;
      }
      return;
    }

    if (Number.isFinite(basisMassG) && basisMassG > 0) {
      const scaleFactor = currentAmountG / basisMassG;
      this.solvent.forEach((solvent) => {
        const baseVolumeL = Number(solvent && solvent.amount_l);
        if (Number.isFinite(baseVolumeL)) {
          solvent.amount_l = baseVolumeL * scaleFactor;
        }
      });
    }
    this.sample_details.solvent_scaling_mass_g = currentAmountG;
  }

  /**
   * Updates the sample's concentration (`concn`) from the gas vessel volume.
   * Used for feedstock samples in a gas-scheme reaction, whose concentration
   * is based on the vessel volume rather than the reaction-mixture volume.
   * Respects `preserveConcentration` to keep manually-entered values intact.
   *
   * @returns {void}
   */
  updateConcentrationFromGasVessel() {
    if (this.preserveConcentration) return;

    const vesselSize = this.fetchReactionVesselSizeFromStore();
    if (Number.isFinite(vesselSize) && vesselSize > 0
      && Number.isFinite(this.amount_mol) && this.amount_mol >= 0) {
      this.concn = this.amount_mol / vesselSize;
    } else {
      this.concn = null;
    }
  }

  /**
   * Updates the sample's concentration (`concn`) based on its total amount in moles
   * and the reaction-level volume selected by `reaction.reactionVolumeForConcentration()`.
   *
   * Volume selection is delegated to the reaction model according to its
   * `concentration_mode` setting.
   *
   * - For mixtures: calculates concentration as `amount_mol / selectedReactionVolume`.
   * - For non-mixtures: calculates concentration as `amount_mol / selectedReactionVolume`.
   * - If any required data is missing or invalid, `concn` is set to `null`.
   *
   * Formula:
    *   concn = amount_mol / reaction.reactionVolumeForConcentration()
   *
   * @method updateConcentrationFromSolvent
    * @memberof Sample
    * @param {Object} reaction - The reaction object that resolves concentration volume.
   * @returns {void}
   */
  updateConcentrationFromSolvent(reaction) {
    // Gas products derive concentration from ppm via the ideal gas law at
    // 25 °C. `concn` is transient (not serialized), while the ppm lives in the
    // persisted gas_phase_data — so recompute it from ppm on every pass,
    // including on load, or a saved gas reaction reopens with a blank column.
    if (this.isGas()) {
      this.concn = calculateGasConcentrationFromPpm(this.gas_phase_data?.part_per_million);
      return;
    }

    // Feedstocks in a gas-scheme reaction live in the gas vessel rather than
    // the reaction mixture, so their concentration is derived from the vessel
    // volume — not the reaction volume.
    if (reaction && reaction.gaseous && this.isFeedstock()) {
      this.updateConcentrationFromGasVessel();
      return;
    }

    // Keep manually-entered concentration unchanged.
    if (this.preserveConcentration) {
      return;
    }

    if (!reaction) {
      this.concn = null;
      return;
    }

    // Determine which reaction-level volume to use for concentration calculations
    const volumeToUse = reaction.reactionVolumeForConcentration();

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
   * Captures previous state and clears the reference_component_changed flag.
   * @returns {void}
   */
  handleMixtureAmountChange() {
    // When amount_g or amount_l is manually changed by user, clear the reference_component_changed flag
    // so that amount_mol will be calculated from amount_g instead of using reference component's amount_mol
    // Only do this for user-initiated changes, not programmatic changes (like during reference component switch)
    // For mixture samples, always capture the previous state before changing amount
    this.storePreviousAmountState();
    this.sample_details.reference_component_changed = false;
  }

  /**
   * Sets the amount and unit for the sample.
   * For mixtures, updates components and internal solvents after assigning the final amount.
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
    if (this.isMixture()) this.updateMixtureComponentAmounts();
  }

  /**
   * Updates the sample's amount from a concentration and a reaction-level
   * volume, using the formula `amount_mol = volume (L) * concentration (mol/L)`.
   * The corresponding mass is derived inside `setAmount` via molecular weight.
   *
   * @param {number} concentration - Concentration in mol/L.
   * @param {number} volumeL - Volume in liters.
   * @returns {number | null} The new amount in mol, or `null` if inputs invalid.
   */
  setAmountFromConcentration(concentration, volumeL) {
    if (!Number.isFinite(volumeL)
      || volumeL <= 0
      || !Number.isFinite(concentration)
      || concentration <= 0) {
      return null;
    }

    const newAmountMol = volumeL * concentration;
    this.setAmount({ value: newAmountMol, unit: 'mol' });
    return newAmountMol;
  }

  /**
   * Variant of `setAmountFromConcentration` intended for user-entered
   * concentrations: after writing the new amount, marks `preserveConcentration`
   * so that subsequent bulk concentration recalculations (e.g.
   * `Reaction#updateAllConcentrations`) do not overwrite the entered value.
   *
   * @param {number} concentration - Concentration in mol/L.
   * @param {number} volumeL - Volume in liters.
   * @returns {void}
   */
  setAmountFromConcentrationAndPreserve(concentration, volumeL) {
    const newAmountMol = this.setAmountFromConcentration(concentration, volumeL);
    if (newAmountMol == null) return;

    this.preserveConcentration = true;
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
    const previousAmountG = this.isMixture() ? Number(this.amount_g) : null;
    this.amount_value = this.convertToGram(amount.value, amount.unit);
    this.amount_unit = 'g';
    if (this.isMixture()) {
      this.updateComponentAmounts();
      // Programmatic Eq rescales must use the current mass, not an earlier user-edit snapshot.
      this.updateSolventVolumes(previousAmountG);
    }
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
    return (this.target_amount_value && !this.real_amount_value ? 'target' : 'real');
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
    // For mixtures, derive moles from the selected component and its relative molecular weight
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
   * 4. If `relative_molecular_weight > 0`:
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

    const relMolWeight = referenceComponent.relative_molecular_weight;
    const prevMol = this.sample_details?.previous_amount_mol;
    const prevG = this.sample_details?.previous_amount_g;

    // Prefer the selected component’s relative molecular weight.
    if (relMolWeight && relMolWeight > 0) {
      return currentMol * relMolWeight;
    }

    // Fall back to the previous mass-to-moles ratio when the relative MW is unavailable.
    // Only use ratio if BOTH previous values are valid and > 0
    if (Number.isFinite(prevMol) && prevMol > 0 && Number.isFinite(prevG) && prevG > 0) {
      return prevG * (currentMol / prevMol);
    }

    // The available data cannot determine the mass.
    return 'n.d';
  }

  /**
   * Calculates the amount in moles for mixture samples.
   * Uses total mass divided by the selected component’s relative molecular weight.
   * Without a relative molecular weight, falls back to that component’s known amount.
   *
   * @returns {number} The calculated amount in moles or fallback value
   */
  calculateMixtureAmountMol() {
    const referenceComponent = this.reference_component;
    if (!referenceComponent) {
      return 'n.d';
    }

    const relMolWeight = referenceComponent.relative_molecular_weight;
    const result = relMolWeight > 0 ? this.amount_g / relMolWeight : (referenceComponent.amount_mol || 'n.d');

    return result;
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
    if (!this.contains_residues || !this.residues?.[0]?.custom_info) return '';
    const formula = this.residues[0].custom_info.formula;
    return formula != null ? String(formula) : '';
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
    if (this.contains_residues && this.residues?.[0]?.custom_info) {
      const info = this.residues[0].custom_info;
      const value = info.polymer_type ?? info.surface_type;
      return value != null ? String(value) : '';
    }
    return '';
  }

  get loading() {
    if (this.contains_residues && this.residues?.[0]?.custom_info) {
      return parseHstoreNumber(this.residues[0].custom_info.loading);
    }
    return false;
  }

  set loading(loading) {
    if (this.contains_residues && this.residues?.[0]?.custom_info) {
      this.residues[0].custom_info.loading = loading;
    }
  }

  get external_loading() {
    if (this.contains_residues && this.residues?.[0]?.custom_info) {
      return parseHstoreNumber(this.residues[0].custom_info.external_loading);
    }
    return false;
  }

  set external_loading(loading) {
    if (this.contains_residues && this.residues?.[0]?.custom_info) {
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

    if (this.sample_svg_file && this.sample_svg_file !== '***') {
      return `/images/samples/${this.sample_svg_file}`;
    }
    if (this.molecule && this.molecule.molecule_svg_file) {
      return `/images/molecules/${this.molecule.molecule_svg_file}`;
    }
    return this.sample_svg_file === '***' ? '/images/wild_card/no_image_180.svg' : '';
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
    if (this.hasFixedProductMass()) {
      return this.redistributeProductMixtureMass({ totalVolumeL: totalVolume });
    }
    this.initializeSampleDetails();

    // Store the volume values before calculateTotalMixtureMass overwrites them
    this.sample_details.total_mixture_volume_l = totalVolume;

    // Recalculate the mass and density from the composition and entered volume.
    this.calculateTotalMixtureMass({ totalVolumeL: totalVolume });

    // A positive volume remains the entered quantity. Clearing it keeps the
    // calculated grams; storing 0 l would discard the component and solvent mass.
    if (totalVolume > 0) {
      this.amount_value = totalVolume;
      this.amount_unit = 'l';
    }

    this.handleTotalVolumeChangeForMixture(totalVolume);
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
    if (this.isMixture() && params.sample_details) {
      // Reaction saves persist the settled basis, without changing the live editor state.
      params.sample_details = { ...params.sample_details, reference_component_changed: false };
    }
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
      // null = components never loaded on the client (list/search responses
      // omit them) → server keeps/copies persisted ones. [] = user removed
      // them all → server deletes. Raw API objects (no serializeComponent)
      // are already in serialized shape and pass through as-is.
      components: this.components?.map((comp) => comp.serializeComponent?.() ?? comp) ?? null,
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
      // Use external_label if available (e.g., "Acetone" from dropdown),
      // otherwise fall back to IUPAC name (e.g., "propan-2-one")
      const label = newSolvent.external_label || molecule.iupac_name;
      const solventData = {
        label, smiles: molecule.cano_smiles, inchikey: molecule.inchikey, ratio: 1
      };
      // Filter by chemical identity (inchikey or smiles) rather than label
      // to avoid duplicates when the same compound has different labels (e.g., "Acetone" vs "propan-2-one")
      const filtered = tmpSolvents.find((solv) => (solv && solv.smiles === solventData.smiles
            && solv.inchikey === solventData.inchikey));
      if (!filtered) {
        tmpSolvents.push(solventData);
      } else if (newSolvent.external_label) {
        // If a match is found and we have an external_label, update the existing entry's label
        // to prefer user-friendly names over IUPAC names
        filtered.label = label;
      }
      this.solvent = tmpSolvents;
    }
  }

  deleteSolvent(solventToDelete) {
    const tmpSolvents = [];
    if (this.solvent) {
      Object.assign(tmpSolvents, this.solvent);
    }

    // Match by chemical identity (inchikey or smiles) rather than label
    // to ensure deletion works even if labels differ (e.g., "Acetone" vs "propan-2-one")
    const filteredIndex = tmpSolvents.findIndex((solv) => (solv.smiles === solventToDelete.smiles
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
    if (!this.isMixture() && newSampleType === SAMPLE_TYPE_MIXTURE) {
      this.prepareForMixtureConversion();
    }
    this.sample_type = newSampleType;
  }

  /** Preserves physical mass and resets density and molarity before switching to a mixture. */
  prepareForMixtureConversion() {
    // Resolve mass while the original density and molarity are still available.
    const massG = this.amount_g;
    const hasPositiveMass = Number.isFinite(massG) && massG > 0;

    if (this.amount_unit !== 'g' && hasPositiveMass) {
      this.amount_value = massG;
      this.amount_unit = 'g';
    }

    this.setDensity({ value: 0 });
  }

  /**
   * Initializes the components array and sorts them by position.
   * Also updates the checksum after all initialization is complete.
   * @param {Array<Object>} components - The components to initialize.
   */
  initialComponents(components) {
    this.components = components.sort((a, b) => a.position - b.position);

    if (this.isMixture() && this.hasComponents()) {
      // Preserve loaded relative MWs: reaction children retain the stock's total mixture mass,
      // while their component amounts reflect the portion used. Recalculate only when the
      // editor derives total mass from those same component amounts in calculateTotalMixtureMass.
      // Keep loaded composition ratios; reference switches normalize them to the selected component.
      // Derive missing ratios only for uninitialized/legacy components.
      if (!this.reference_component || this.components.some((component) => component.equivalent == null)) {
        this.updateMixtureComponentEquivalent();
      }
      if (this.parent_id != null) {
        // Older reaction children persisted portion moles alongside stock masses/volumes.
        this.components.forEach((component) => component.updatePhysicalAmounts?.());
      }
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
    this.addMixtureComponentSync(newComponent);
    await this.updateMixtureMolecule();
  }

  /**
   * Synchronously adds a new component to the mixture's component array.
   * Does NOT fetch the combined molecule — call updateMixtureMolecule() afterwards
   * to update the molecule/SVG via a network request.
   * @param {Object} newComponent - The new component to add.
   * @param {boolean} skipRecalculations - If true, skips expensive recalculations (for batch operations)
   * @returns {boolean} Always true — every component is added unconditionally.
   */
  addMixtureComponentSync(newComponent, skipRecalculations = false) {
    const tmpComponents = [...(this.components || [])];

    if (!newComponent.material_group) {
      newComponent.material_group = 'liquid';
    }

    if (!newComponent.purity) {
      newComponent.purity = 1;
    }

    tmpComponents.push(newComponent);
    this.components = tmpComponents;

    if (!skipRecalculations) {
      this.setComponentPositions();
      this.calculateTotalMixtureMass();
      this.updateMixtureComponentEquivalent();
    }

    return true;
  }

  /**
   * Fetches the combined molecule for the current mixture components via a
   * single network request and updates the molecule, molfile, and SVG.
   * @async
   */
  async updateMixtureMolecule() {
    // Capture the per-component SMILES list before the async fetch so the
    // stale check below can detect any additions/removals that happen while waiting.
    const componentSmilesSnapshot = (this.components || [])
      .map((c) => c.molecule_cano_smiles)
      .filter(Boolean);

    // Flatten each component's SMILES into individual fragments (a merged ionic compound
    // or a "benzene dimer" carries a dot-joined cano_smiles like "c1ccccc1.c1ccccc1"),
    // then deduplicate across all fragments so that multiple components sharing the same
    // molecule — whether stored as separate rows or as a merged multi-fragment molecule —
    // each contribute only one structure to the combined SVG.
    const allFragments = componentSmilesSnapshot.flatMap((s) => s.split('.'));
    const combinedSmiles = [...new Set(allFragments)].join('.');

    if (!combinedSmiles) return;

    // Same component set (possibly different order) — keep editor molfile/SVG intact.
    if (Sample.sameSmilesSet(combinedSmiles, this.molecule_cano_smiles)) return;

    const result = await MoleculesFetcher.fetchBySmi(combinedSmiles, null, this.molfile, 'ketcher');

    // fetchBySmi swallows errors and returns undefined - exit cleanly if fetch failed
    if (!result || !result.molfile) {
      console.warn('updateMixtureMolecule: Failed to fetch molecule for combined SMILES:', combinedSmiles);
      return;
    }

    // Stale check: compare the pre-fetch snapshot against the current component list.
    // Sort before joining so a reorder while the fetch was in flight does not
    // discard a valid result. Use '\0' as separator — SMILES never contain null
    // bytes, so component boundaries stay unambiguous even when a single
    // component's cano_smiles is itself dot-separated (e.g. multi-fragment molecules).
    const snapshotKey = [...componentSmilesSnapshot].sort().join('\0');
    const currentKey = (this.components || [])
      .map((c) => c.molecule_cano_smiles)
      .filter(Boolean)
      .sort()
      .join('\0');

    if (!currentKey || snapshotKey !== currentKey) {
      return;
    }

    this.molecule = result;
    this.molfile = result.molfile;
  }

  /**
   * Synchronously adds multiple new components to the mixture in a single batch.
   * Does NOT fetch the combined molecule — call updateMixtureMolecule() afterwards.
   * @param {Array<Object>} newComponents - The new components to add.
   */
  addMixtureComponentsSync(newComponents) {
    if (!newComponents || newComponents.length === 0) return;

    newComponents.forEach((c) => this.addMixtureComponentSync(c, true));

    this.setComponentPositions();
    this.calculateTotalMixtureMass();
    this.updateMixtureComponentEquivalent();
  }

  /**
   * Clears the molecule data (molecule, molfile, and SVG for mixtures).
   * Used when all components have been removed from a mixture.
   */
  clearMoleculeData() {
    this.molecule = null;
    this.molfile = '';
    if (this.isMixture()) {
      this.sample_svg_file = null;
    }
  }

  /**
   * Deletes a component from the mixture.
   * This only does fast synchronous operations (positions, mass, equivalents).
   * Call updateMixtureMolecule() afterwards if you need to update the SVG.
   * @param {Object} componentToDelete - The component to delete.
   */
  deleteMixtureComponent(componentToDelete) {
    if (this.rejectLinkedReferenceChange([componentToDelete])) return false;
    const tmpComponents = [...(this.components || [])];
    const filteredComponents = tmpComponents.filter(
      (comp) => comp !== componentToDelete
    );
    this.components = filteredComponents;

    // Do the fast operations (positions, mass, equivalents)
    this.setComponentPositions();
    this.calculateTotalMixtureMass();
    this.updateMixtureComponentEquivalent();

    // If no components remain, clear the molecule and SVG
    if (!this.hasComponents()) {
      this.clearMoleculeData();
    }
    return true;
  }

  /** Reference changes in linked mixtures must go through the reaction scheme. */
  rejectLinkedReferenceChange(components) {
    if (!this.isReactionLinked() || !components.some((component) => component?.reference)) return false;

    rootStore.notificationsStore.add({
      title: 'Mixture reference is used in a reaction',
      message: 'Change the reference component in the reaction scheme before removing or replacing it here.',
      level: 'warning',
      position: 'tr',
    });
    return true;
  }

  /**
   * Removes the source component and resets the target's amounts, concentration and
   * ratio to zero, then recalculates mixture totals. The reference component keeps
   * a ratio of one. Used when both components share the
   * same molecule so no new molecule fetch is required.
   * @param {Object} srcMat - The duplicate component to remove.
   * @param {Object} tagMat - The component to keep, whose amounts will be cleared.
   */
  mergeSameMoleculeComponents(srcMat, tagMat) {
    if (this.rejectLinkedReferenceChange([srcMat, tagMat])) return;
    this.deleteMixtureComponent(srcMat);
    tagMat.resetAmounts();
    // Re-run after reset so mass and equivalents reflect the zeroed amounts.
    this.calculateTotalMixtureMass();
    this.updateMixtureComponentEquivalent();
  }

  /**
   * Handles total volume changes for mixture samples.
   *
   * This method is called when the total volume of a mixture is updated.
   * It handles two scenarios:
   * - Case 2: Total volume updated; Total Concentration is locked
   *   - Recalculates amount_mol for all components
   *   - For liquid components: recalculates volume based on density or stock concentration
   *   - For solid components: recalculates mass (not volume)
   * - Case 3: Total volume updated; Total Concentration is not locked
   *   - Only recalculates the target concentration
   *   - Amount and volume stay the same
   *
   * The method validates the input, then delegates to each component's handleTotalVolumeChanges
   * method to perform the appropriate calculations. After updating components, it recalculates
   * the component equivalents to maintain proper ratios.
   *
   * @param {number} totalVolume - The new total volume for the mixture. Must be non-negative.
   * @returns {void} Returns early without modifying components if totalVolume is negative,
   *   showing an error notification; otherwise updates components based on the new total volume.
   */
  handleTotalVolumeChangeForMixture(totalVolume) {
    if (this.components.length < 1) {
      return;
    }

    if (totalVolume < 0) {
      rootStore.notificationsStore.add({
        title: 'Invalid Total Volume',
        message: 'Total volume cannot be negative. Please enter a valid volume value.',
        level: 'error',
        position: 'tr',
        autoDismiss: 5,
      });
      return;
    }

    this.components.forEach((component) => {
      component.handleTotalVolumeChanges(totalVolume);
    });

    this.updateMixtureComponentEquivalent();
  }

  /**
   * Switches the reference component, preserving mass by default or moles for a locked reaction material.
   *
   * The selected component is marked as the reference and all others as non-reference.
   * Ratios are normalized against the selected reference without changing composition.
   * If the provided index is invalid or the components array is missing,
   * the function exits without making any changes.
   *
   * @param {number} componentIndex - The index of the component to set as reference.
   * @param {Object} [options] - Reference-switch constraints.
   * @param {boolean} [options.preserveRatios=false] - Preserve unresolved composition ratios, rebased to the new reference.
   * @param {boolean} [options.preserveAmountMol=false] - Keep moles fixed and rescale the physical quantity.
   * @param {boolean} [options.fromReactionScheme=false] - Allow the scheme to update a linked reference and its dependents.
   * @returns {boolean} Whether the reference selection was applied.
   */
  setReferenceComponent(componentIndex, {
    preserveRatios = false, preserveAmountMol = false, fromReactionScheme = false,
  } = {}) {
    const referenceComponent = this.components?.[componentIndex];
    if (!referenceComponent) return false;

    // Read mass using the old reference before a mol-stored amount changes its basis.
    // Initial reference selection has no previous molar basis to preserve.
    const previousReference = this.reference_component;
    if (!fromReactionScheme && previousReference !== referenceComponent
      && this.rejectLinkedReferenceChange([previousReference])) return false;

    const referenceRatio = Number(referenceComponent.equivalent);
    const hadReference = !!previousReference;
    const mixtureMassG = hadReference ? Number(this.amount_g) : NaN;
    const mixtureAmountMol = hadReference && preserveAmountMol ? Number(this.amount_mol) : NaN;
    if (hadReference && preserveAmountMol
      && !Sample.canPreserveAmountAfterReferenceChange(mixtureAmountMol, mixtureMassG, referenceComponent)) {
      return false;
    }

    this.components.forEach((component, index) => {
      component.reference = (index === componentIndex);
      if (!preserveRatios && !component.reference && previousReference !== referenceComponent) {
        // Ratios against the old reference cannot initialize amounts under the new one.
        component.equivalent = 'n.d';
      } else if (preserveRatios && Number.isFinite(referenceRatio) && referenceRatio > 0
        && Number.isFinite(component.equivalent)) {
        component.equivalent /= referenceRatio;
      }
    });

    if (hadReference) {
      this.updateReferenceComponentDetails(referenceComponent);
      if (preserveAmountMol) {
        this.preserveAmountAfterReferenceChange(mixtureAmountMol, mixtureMassG);
      } else {
        this.preserveMassAfterReferenceChange(mixtureMassG);
      }
    }

    this.updateMixtureComponentEquivalent();
    return true;
  }

  /** Checks whether the selected component can preserve moles with a finite, nonnegative mass. */
  static canPreserveAmountAfterReferenceChange(amountMol, massG, referenceComponent) {
    const relativeWeight = Number(referenceComponent.relative_molecular_weight);
    return Number.isFinite(amountMol) && amountMol >= 0
      && Number.isFinite(massG) && massG >= 0
      && Number.isFinite(relativeWeight) && relativeWeight > 0
      && Number.isFinite(amountMol * relativeWeight);
  }

  /** Keeps a locked material's moles and stored unit, scaling its components and internal solvents once. */
  preserveAmountAfterReferenceChange(amountMol, previousMassG) {
    const massG = amountMol * Number(this.reference_component.relative_molecular_weight);
    const storedUnit = this.amount_unit;
    const gramsPerLiter = storedUnit === 'l' ? this.convertToGram(1, 'l') : null;
    const volumeL = Number.isFinite(gramsPerLiter) && gramsPerLiter > 0 ? massG / gramsPerLiter : null;
    const keepVolume = storedUnit === 'l' && Number.isFinite(volumeL) && (volumeL > 0 || massG === 0);

    this.amount_value = storedUnit === 'mol' ? amountMol : (keepVolume ? volumeL : massG);
    this.amount_unit = storedUnit === 'mol' || keepVolume ? storedUnit : 'g';
    this.sample_details.previous_amount_g = previousMassG;
    this.sample_details.previous_amount_mol = amountMol;

    this.updateComponentAmounts();
    this.updateSolventVolumes(previousMassG);
  }

  /** Records the selected reference's molecular weights and clears its transient change flag. */
  updateReferenceComponentDetails(referenceComponent) {
    this.initializeSampleDetails();
    if (referenceComponent.molecule?.molecular_weight) {
      this.sample_details.reference_molecular_weight = referenceComponent.molecule.molecular_weight;
    }
    const relativeWeight = Number(referenceComponent.relative_molecular_weight);
    if (relativeWeight) {
      this.sample_details.reference_relative_molecular_weight = relativeWeight;
    }
    this.sample_details.reference_component_changed = false;
  }

  /** Rebases the stored amount using the mass captured before the reference switch. */
  preserveMassAfterReferenceChange(mixtureMassG) {
    if (!Number.isFinite(mixtureMassG) || mixtureMassG < 0) return;

    this.sample_details.previous_amount_g = mixtureMassG;
    const relativeWeight = Number(this.reference_component.relative_molecular_weight);
    if (Number.isFinite(relativeWeight) && relativeWeight > 0) {
      const newAmountMol = mixtureMassG / relativeWeight;
      this.sample_details.previous_amount_mol = newAmountMol;
      if (this.amount_unit === 'mol') this.amount_value = newAmountMol;
      // Only the reference changed; internal solvent volumes must not scale.
      this.updateComponentAmounts();
    } else {
      // Without a usable relative MW, retain the known mass in grams.
      this.amount_value = mixtureMassG;
      this.amount_unit = 'g';
    }
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
      if (index === referenceIndex) {
        component.equivalent = 1;
      } else if (!referenceMol || Number.isNaN(referenceMol)) {
        // The reference has no amount, so the ratio cannot be derived from amounts.
        // Preserve positive typed ratios while this reference has no amount.
        const currentEq = component.equivalent;
        const hasPositiveRatio = Number.isFinite(currentEq) && currentEq > 0;
        component.equivalent = hasPositiveRatio ? currentEq : 'n.d';
      } else {
        const currentMol = component.amount_mol ?? 0;
        component.equivalent = currentMol && !Number.isNaN(currentMol)
          ? currentMol / referenceMol
          : 'n.d';
      }
    });
  }

  /**
   * Recomputes non-reference components after the reference component's own amount
   * changes.
   *
   * Per non-reference component:
   * - has a typed ratio (numeric equivalent > 0) but NO amount yet → fill the amount
   *   from the ratio: amount_mol = ratio * referenceAmount, ratio kept. This is the
   *   case where a ratio was typed while the reference had no amount.
   * - already has an amount → keep the amount fixed and re-derive the ratio from it
   *   (matching updateMixtureComponentEquivalent), so a later reference change updates
   *   the ratio rather than the amount the user already established.
   * A typed ratio fills the missing amount once, when a reference edit is committed.
   * Ratios are intentionally non-sticky: there is no persistent ratio-driven mode.
   * A debounce pause or blur can commit that first value; subsequent corrections keep
   * the generated component amount fixed, just like a directly entered amount.
   *
   * Falls back to updateMixtureComponentEquivalent when there is no usable reference
   * amount to scale from.
   */
  updateMixtureComponentsFromReferenceAmount() {
    if (!this.hasComponents()) return;

    const referenceComponent = this.reference_component;
    const referenceMol = referenceComponent?.amount_mol ?? 0;

    // Without a reference amount, ratios cannot be scaled into amounts; defer to the
    // ratio-preserving path.
    if (!referenceComponent || !referenceMol || Number.isNaN(referenceMol)) {
      this.updateMixtureComponentEquivalent();
      return;
    }

    const totalVolume = this.amount_l;
    // The Mass lock is stored under this mixture's id, which a component cannot resolve from
    // its own parent_id, so look it up here and pass it into the ratio-fill path.
    const lockAmountColumnSolids = ComponentStore.getLockStateForSample(
      ComponentStore.getState(),
      'lockAmountColumnSolids',
      this.id
    );

    this.components.forEach((component) => {
      if (component.id === referenceComponent.id) {
        component.equivalent = 1;
        return;
      }

      const eq = component.equivalent;
      const hasTypedRatio = typeof eq === 'number' && !Number.isNaN(eq) && eq > 0;
      const currentMol = component.amount_mol ?? 0;
      // Fill the amount from the ratio only when the component has a typed ratio and no
      // amount yet. Once it has an amount, keep the amount and re-derive the ratio.
      const isRatioDriven = hasTypedRatio && !currentMol;

      if (isRatioDriven) {
        component.updateAmountFromRatio(eq, referenceMol, totalVolume, lockAmountColumnSolids);
        // Mirror updateComponentRatio: a concentration-locked component holds its concentration,
        // so the mixture's total volume must track the filled amount (volume = amount / concn).
        if (component.isComponentConcentrationLocked()) {
          this.updateTotalVolume(component.amount_mol, component.concn);
        }
      } else {
        component.updateRatioFromReference(referenceComponent);
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
   * Combines two different-molecule components into one by joining their SMILES,
   * fetching the resulting molecule, and replacing both with the merged component.
   * @async
   * @param {Object} srcMat - The source component.
   * @param {Object} tagMat - The target component.
   * @param {string} tagGroup - Material group for the new merged component.
   */
  async mergeDifferentMoleculeComponents(srcMat, tagMat, tagGroup) {
    if (this.rejectLinkedReferenceChange([srcMat, tagMat])) return;
    const newSmiles = `${srcMat.molecule_cano_smiles}.${tagMat.molecule_cano_smiles}`;

    try {
      const newMolecule = await MoleculesFetcher.fetchBySmi(newSmiles, null, this.molfile, 'ketcher');
      if (!newMolecule) throw new Error('Failed to fetch merged molecule');

      const newSample = Sample.buildNew(newMolecule, this.collection_id);
      newSample.material_group = tagGroup;

      const { default: Component } = await import('src/models/Component');

      if (this.rejectLinkedReferenceChange([srcMat, tagMat])) return;
      this.addMixtureComponentSync(new Component(newSample));
      this.deleteMixtureComponent(tagMat);
      this.deleteMixtureComponent(srcMat);
      await this.updateMixtureMolecule();
    } catch (error) {
      console.error('Error merging components:', error);
      NotificationActions.add({ message: 'Failed to merge components. Please try again.', level: 'error' });
    }
  }

  /**
   * Merges two components into one. Routes to the appropriate strategy based on
   * whether the components share the same molecule.
   * @async
   * @param {Object} srcMat - The source material/component to merge.
   * @param {string} srcGroup - The source group name.
   * @param {Object} tagMat - The target material/component to merge with.
   * @param {string} tagGroup - The target group name.
   */
  static haveSameMolecule(matA, matB) {
    const idA = matA?.molecule?.id || matA?.molecule_id;
    const idB = matB?.molecule?.id || matB?.molecule_id;
    return !!(idA && idB && idA === idB);
  }

  async mergeComponents(srcMat, srcGroup, tagMat, tagGroup) {
    if (srcMat === tagMat) return;
    if (this.rejectLinkedReferenceChange([srcMat, tagMat])) return;

    const srcIndex = this.components.findIndex((mat) => mat === srcMat);
    const tagIndex = this.components.findIndex((mat) => mat === tagMat);

    if (srcIndex === -1 || tagIndex === -1) {
      console.error('Source or target material not found in components.');
      return;
    }

    if (Sample.haveSameMolecule(srcMat, tagMat)) {
      this.mergeSameMoleculeComponents(srcMat, tagMat);
    } else {
      await this.mergeDifferentMoleculeComponents(srcMat, tagMat, tagGroup);
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
   * Fetches individual molecules for the given SMILES fragments and reconciles
   * them with the existing components:
   * - fragments already covered by an existing component are skipped, so
   *   unchanged structures keep their component entry (no duplicates),
   * - components whose structure no longer occurs in the edited structure
   *   (i.e. it was modified in the structure editor) are updated in place
   *   with the new molecule, preserving amounts, name, and position,
   * - any remaining fragments are added as new Component instances.
   *
   * Does NOT call updateMixtureMolecule() — the caller is responsible for
   * triggering the combined-molecule fetch (and any intermediate setState)
   * so the UI can show components before the SVG update finishes.
   *
   * @param {Array<string>} mixtureSmiles - Array of SMILES strings to split.
   * @param {string} editor - The editor to use for fetching molecules.
   * @returns {Promise<void>} Resolves once components have been added/updated.
   */
  async splitSmilesToMolecule(mixtureSmiles, editor) {
    const { staleComponents, unknownSmiles } = this.partitionEditedSmiles(mixtureSmiles);
    if (this.rejectLinkedReferenceChange(staleComponents)) return false;

    // Nothing new to fetch — still delete stale components so the list stays
    // consistent with the edited structure.
    if (unknownSmiles.length === 0) {
      this.removeStaleComponents(staleComponents, mixtureSmiles);
      return;
    }

    const resolved = await Sample.fetchMoleculesForSmiles(unknownSmiles, editor);
    if (this.rejectLinkedReferenceChange(staleComponents)) return false;

    // Mapping an edited fragment back to its component is only unambiguous for
    // a single edit — fragment order and component order are not guaranteed to
    // align, so positional pairing of several edits could attach a molecule
    // (and the user's amounts) to the wrong row.
    if (staleComponents.length === 1 && unknownSmiles.length === 1 && resolved.length === 1) {
      Sample.applyResolvedMolecule(staleComponents[0], resolved[0]);
      this.calculateTotalMixtureMass();
      this.updateMixtureComponentEquivalent();
    } else {
      await this.addResolvedFragmentsAsComponents(staleComponents, unknownSmiles, resolved);
    }

    this.syncComponentOrderToSmiles(mixtureSmiles);
  }

  /**
   * Splits the edited structure into stale components (at least one fragment
   * edited away) and fragments that still need resolving. Stale components
   * don't count as covering any fragment: a stale "A.B" (A→A2) must not block
   * "B" from being fetched.
   *
   * Matching is deliberately set-based, NOT count-based: the editor canvas is
   * deduplicated (updateMixtureMolecule renders each distinct structure once),
   * so fragment multiplicity in the editor carries no meaning. Duplicate
   * same-molecule components are created via drag & drop, and counting
   * occurrences here would wrongly delete one of them on every editor save.
   *
   * @returns {{staleComponents: Array<Object>, unknownSmiles: Array<string>}}
   */
  partitionEditedSmiles(mixtureSmiles) {
    const components = this.components || [];

    const editedFragments = new Set(mixtureSmiles);
    const staleComponents = components.filter(
      (component) => !(component.molecule_cano_smiles || '')
        .split('.')
        .every((fragment) => editedFragments.has(fragment))
    );
    const staleSet = new Set(staleComponents);

    const existingFragments = new Set(
      components
        .filter((c) => !staleSet.has(c))
        .flatMap((c) => (c.molecule_cano_smiles || '').split('.'))
        .filter(Boolean)
    );

    const unknownSmiles = mixtureSmiles.filter((smiles) => smiles && !existingFragments.has(smiles));

    return { staleComponents, unknownSmiles };
  }

  /**
   * Deletes the given stale components and refreshes totals/ratios/ordering.
   */
  removeStaleComponents(staleComponents, mixtureSmiles) {
    if (staleComponents.length === 0) return;
    if (this.rejectLinkedReferenceChange(staleComponents)) return;

    staleComponents.forEach((c) => this.deleteMixtureComponent(c));
    this.calculateTotalMixtureMass();
    this.updateMixtureComponentEquivalent();
    this.syncComponentOrderToSmiles(mixtureSmiles);
  }

  /**
   * Fetches a molecule per SMILES fragment, warns the user about failures,
   * and returns only the successfully resolved molecules (in fragment order).
   */
  static async fetchMoleculesForSmiles(smilesList, editor) {
    const results = await Promise.all(
      smilesList.map((smiles) => MoleculesFetcher.fetchBySmi(smiles, null, null, editor))
    );

    const failedSmiles = smilesList.filter((smiles, index) => !(results[index] && results[index].id));
    if (failedSmiles.length > 0) {
      rootStore.notificationsStore.add({
        title: 'Molecule Resolution Failed',
        message: `Could not resolve ${failedSmiles.length} SMILES: ${failedSmiles.join(', ')}`,
        level: 'warning',
        position: 'tr',
        autoDismiss: 10,
      });
    }

    return results.filter((molecule) => molecule && molecule.id);
  }

  /**
   * Points an existing component at a newly resolved molecule, preserving its
   * amount, name, and position.
   */
  static applyResolvedMolecule(component, molecule) {
    component.molecule = molecule;
    component.molecule_id = molecule.id;
    component.molfile = molecule.molfile;
    // MW changed — re-derive the molar amount from the entered mass/volume.
    component.calculateAmount(component.purity || 1.0);
  }

  /**
   * Ambiguous reconcile case (multiple edits, or new fragments mixed with
   * edits): add every resolved fragment as a new component rather than guess
   * which stale row it came from. Stale rows are deleted only when every
   * fragment resolved; on partial failure they are kept (the user was warned).
   */
  async addResolvedFragmentsAsComponents(staleComponents, unknownSmiles, resolved) {
    const { default: Component } = await import('src/models/Component');
    if (this.rejectLinkedReferenceChange(staleComponents)) return;

    // Read after molecule resolution so edits made while it was loading are retained.
    const unallocatedMassG = this.isMixture() && !this.hasComponents() ? Number(this.amount_g) : 0;
    const newComponents = resolved.map((molecule) => {
      const component = new Component(Sample.buildNew(molecule, this.collection_id));
      component.resetAmounts();
      return component;
    });
    if (resolved.length === unknownSmiles.length) {
      staleComponents.forEach((c) => this.deleteMixtureComponent(c));
    }

    if (newComponents.length > 0) {
      this.addMixtureComponentsSync(newComponents);
    } else {
      // Every fetch failed — still refresh totals/ratios.
      this.calculateTotalMixtureMass();
      this.updateMixtureComponentEquivalent();
    }

    // Fresh structure rows have no quantities yet. Keep the entered total mass
    // until the user assigns their amounts, including when molecule resolution fails.
    if (Number.isFinite(unallocatedMassG) && unallocatedMassG > 0
      && !(this.components || []).some((component) => Number(component.amount_mol) > 0)) {
      this.amount_value = unallocatedMassG;
      this.amount_unit = 'g';
      this.total_mixture_mass_g = unallocatedMassG;

      this.updateMixtureDensity();
    }
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
      await this.updateMixtureMolecule();
      return true;
    } catch (err) {
      return false;
    }
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
      const { molecule, relative_molecular_weight: relativeMolecularWeight } = referenceComponent;

      // Assign values to sample_details
      Object.assign(this.sample_details, {
        reference_molecular_weight: molecule?.molecular_weight || null,
        reference_relative_molecular_weight: relativeMolecularWeight || null
      });

      // A reference-component change is a transient UI state. Persist the settled state so
      // reloaded mixtures derive amount_mol from their mass and selected component.
      this.sample_details.reference_component_changed = false;

      // Log warnings if values are missing
      if (!molecule?.molecular_weight) {
        console.warn('Reference component has no molecular weight');
      }
      if (!relativeMolecularWeight) {
        console.warn('Reference component has no relative molecular weight');
      }
    }
  }

  /** Mass of a component as counted in the mixture, including stock-solution carrier mass. */
  static componentMassInMixture(component) {
    if (component.material_group === 'solid') return parseFloat(component.amount_g) || 0;
    if (component.material_group === 'liquid') {
      const density = component.density > 0 ? component.density : 1;
      return density * (parseFloat(component.amount_l) || 0) * 1000;
    }
    return 0;
  }

  /** Internal solvents contribute their solution mass when no total volume is entered. */
  mixtureSolventMass() {
    return (Array.isArray(this.solvent) ? this.solvent : []).reduce((sum, solvent) => {
      if (!solvent) return sum;
      const density = solvent.density > 0 ? solvent.density : 1;
      return sum + density * (parseFloat(solvent.amount_l) || 0) * 1000;
    }, 0);
  }

  /** Normalizes an entered stock volume to the reaction portion before using its mass contribution. */
  resolveMixtureTotalVolume(editedTotalVolumeL) {
    this.initializeSampleDetails();
    if (this.sample_details.total_mixture_volume_l == null && this.amount_unit === 'l') {
      this.sample_details.total_mixture_volume_l = this.amount_value;
    }
    let totalVolumeL = editedTotalVolumeL ?? this.sample_details.total_mixture_volume_l ?? 0;
    const storedMassG = Number(this.total_mixture_mass_g);
    const portionMassG = Number(this.amount_g);
    if (editedTotalVolumeL === undefined && this.parent_id != null
      && this.sample_details.total_mixture_volume_l != null
      && Number.isFinite(storedMassG) && storedMassG > 0
      && Number.isFinite(portionMassG) && portionMassG > 0 && portionMassG !== storedMassG) {
      totalVolumeL *= portionMassG / storedMassG;
      this.sample_details.total_mixture_volume_l = totalVolumeL;
    }
    return parseFloat(totalVolumeL) || 0;
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
  calculateTotalMixtureMass({ totalVolumeL: editedTotalVolumeL, preserveUnallocatedMass = false } = {}) {
    this.initializeSampleDetails();

    if (!this.isMixture()) {
      return;
    }

    let totalMass = 0;
    let totalLiquidComponentsMassG = 0;

    // --- Step 1: Calculate component masses and sum liquid component masses (with densities) ---
    if (this.hasComponents()) {
      this.components.forEach((component) => {
        const massG = Sample.componentMassInMixture(component);
        totalMass += massG;
        if (component.material_group === 'liquid') totalLiquidComponentsMassG += massG;
      });
    }

    // --- Step 2: Determine total/solvent volume info ---
    // Only an entered volume can supply the remaining-volume mass. amount_l may
    // derive from the previous mass/density; feeding it back makes ratio edits drift.
    const totalVolumeML = this.resolveMixtureTotalVolume(editedTotalVolumeL) * 1000;
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
      totalMass += this.mixtureSolventMass();
    }
    // A property edit on a fresh mixture does not allocate its known mass.
    // Callers capture this state before editing, so clearing established amounts can still produce zero.
    if (preserveUnallocatedMass && totalMass === 0) return;

    this.sample_details.total_mixture_mass_g = totalMass;
    // Set amount directly without triggering updateMixtureComponentAmounts()
    // to preserve user's amount_mol inputs when calculating total mass
    this.amount_value = totalMass;
    this.amount_unit = 'g';
    // Recomputing mass establishes a new basis without rescaling solvents. Do not
    // persist an older zero-edit recovery basis for these recomputed quantities.
    delete this.sample_details.solvent_scaling_mass_g;

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
   * 1. Returns early if the sample is not a mixture.
   * 2. Initializes `sample_details` if missing.
   * 3. Retrieves total mixture mass (g) and total volume (L → converted to mL).
   * 4. If the mixture is liquid and volume > 0, computes and sets the density.
   *    Otherwise, resets density to 0.
   *
   * @returns {void}
   */
  updateMixtureDensity() {
    if (!this.isMixture()) return;

    this.initializeSampleDetails();

    const totalMassG = Number(this.sample_details.total_mixture_mass_g) || 0;
    // A mass-derived amount_l cannot establish the volume used to derive density.
    const totalVolumeL = this.sample_details.total_mixture_volume_l
      ?? (this.amount_unit === 'l' ? this.amount_value : 0);
    const totalVolumeML = parseFloat(totalVolumeL) * 1000;

    // An entered positive total volume supplies a liquid basis even if the
    // previous density was cleared and all components are solids.
    if (totalVolumeML > 0) {
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

  /**
   * Calculate and apply this sample's amount based on a provided target amount of weight percentage reference and
   * the sample's stored weight percentage.
   *
   * Behavior:
   * - Expects `targetAmount` to be an object { value: Number, unit: String } representing
   *   the total target mass for the product reference material (e.g. { value: 10, unit: 'g' }).
   * - If `this.weight_percentage` is set and > 0 the sample's amount will be set to
   *   `targetAmount.value * this.weight_percentage` using `setAmount` to preserve unit handling.
   * - If this sample is not the reference material, its `equivalent` will be set to 0.
   *
   * Guard clauses / validation/ Side-effects:
   * - If `targetAmount` is missing, has no value, or value <= 0 the method returns early.
   * - If `targetAmount.unit` is not present the method returns early (no unit to assign).
   * - Mutates sample amount (via `setAmount`) and possibly `equivalent`.
   *
   * @param {Object} targetAmount - Target amount object ({ value: Number, unit: String }).
   * @returns {Sample} The updated sample instance (for chaining).
   */
  calculateAmountBasedOnWeightPercentage(targetAmount) {
    // guard clauses kept inside model, expect targetAmount: { value, unit }
    if (
      !targetAmount
      || targetAmount.value == null
      || targetAmount.unit == null
      || this.weight_percentage == null
    ) return this;

    if (this.weight_percentage && this.weight_percentage > 0 && !this.weight_percentage_reference) {
      const amountValue = targetAmount.value * this.weight_percentage;
      this.setAmount({
        value: amountValue,
        unit: targetAmount.unit,
      });

      // set equivalent to zero only if sample is not a reference material
      if (!this.reference) {
        this.equivalent = 0;
      }
    }
    return this;
  }

  /**
   * Update equivalent (yield) for samples flagged as `weight_percentage_reference`.
   *
   * Behavior:
   * - This method only acts on samples where `weight_percentage_reference` is truthy.
   * - For samples with `amountType === 'target'` the equivalent is set to the string
   *   `'n.d'` (not determined).
   * - For samples with `amountType === 'real'` the method attempts to compute a yield
   *   by converting the sample's `target_amount_value` to moles and comparing the
   *   sample's actual `amount_mol` against that target mole value.
   *   - If `targetValue` (converted target in mol) is non-null and `target_amount_value > 0`,
   *     the yield is calculated as `amount_mol / targetValue` and clamped to a maximum of 1.
   *   - Otherwise equivalent is set to `'n.d'`.
   *
   * Guard clauses / side-effects:
   * - If the sample is not flagged as `weight_percentage_reference` the method returns early.
   * - Mutates `equivalent` property on the sample instance.
   *
   * @returns {Sample} Returns the sample instance (`this`) for chaining and safe use in
   *                   functional iterators (map/forEach).
   */
  updateYieldForWeightPercentageReference() {
    if (!this.weight_percentage_reference) return this;

    if (this.amountType === 'target') {
      this.equivalent = 'n.d';
      return this;
    }

    if (this.amountType === 'real') {
      const targetValue = this.convertGramToUnit(this.target_amount_value, 'mol');
      if (targetValue !== null && this.target_amount_value > 0) {
        const calculatedYield = this.amount_mol / targetValue;
        this.equivalent = calculatedYield > 1 ? 1 : calculatedYield;
      } else {
        this.equivalent = 'n.d';
      }
    }
    return this;
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
