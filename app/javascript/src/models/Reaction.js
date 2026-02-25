import {
  isEmpty,
  round,
} from 'lodash';
import Delta from 'quill-delta';
import moment from 'moment';
import 'moment-precise-range-plugin';

import Element from 'src/models/Element';
import Sample from 'src/models/Sample';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import Component from 'src/models/Component';
import Container from 'src/models/Container';
import { isSbmmSample } from 'src/utilities/ElementUtils';

import UserStore from 'src/stores/alt/stores/UserStore';
import Segment from 'src/models/Segment';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';

const TemperatureUnit = ['°C', '°F', 'K'];

const TemperatureDefault = {
  valueUnit: '°C',
  userText: '',
  data: []
};

export const convertTemperature = (temperature, fromUnit, toUnit) => {
  if (fromUnit === toUnit) {
    return temperature;
  }
  const conversionTable = {
    K: {
      '°C': (t) => parseFloat(t) - 273.15,
      '°F': (t) => (parseFloat(t) * 9 / 5) - 459.67
    },
    '°C': {
      K: (t) => parseFloat(t) + 273.15,
      '°F': (t) => (parseFloat(t) * 1.8) + 32
    },
    '°F': {
      K: (t) => (parseFloat(t) + 459.67) * 5 / 9,
      '°C': (t) => (parseFloat(t) - 32) / 1.8
    }
  };
  return conversionTable[fromUnit][toUnit](temperature);
};

const MomentUnit = {
  'Week(s)': 'weeks',
  'Day(s)': 'days',
  'Hour(s)': 'hours',
  'Minute(s)': 'minutes',
  'Second(s)': 'seconds',
};

const LegMomentUnit = {
  'Year(s)': 'years',
  'Month(s)': 'months',
  ...MomentUnit
};

const DurationUnit = [
  // 'Year(s)',
  // 'Month(s)',
  'Week(s)',
  'Day(s)',
  'Hour(s)',
  'Minute(s)',
  'Second(s)'
];

const DurationDefault = {
  dispUnit: 'Hour(s)',
  dispValue: '',
  memValue: null,
  memUnit: 'Hour(s)'
};

export const convertDuration = (value, unit, newUnit) => moment.duration(Number.parseFloat(value), LegMomentUnit[unit])
  .as(MomentUnit[newUnit]);

const durationDiff = (startAt, stopAt, precise = false) => {
  if (startAt && stopAt) {
    const start = moment(startAt, 'DD-MM-YYYY HH:mm:ss');
    const stop = moment(stopAt, 'DD-MM-YYYY HH:mm:ss');
    if (start < stop) {
      return precise ? moment.preciseDiff(start, stop) : moment.duration(stop.diff(start));
    }
  }
  return null;
};

const highestUnitFromDuration = (d, threshold = 1.0) => {
  if (d.asWeeks() >= threshold) { return 'Week(s)'; }
  if (d.asDays() >= threshold) { return 'Day(s)'; }
  if (d.asHours() >= threshold) { return 'Hour(s)'; }
  if (d.asMinutes() >= threshold) { return 'Minute(s)'; }
  if (d.asSeconds() >= threshold) { return 'Second(s)'; }
  return 'Hour(s)';
};

export default class Reaction extends Element {
  // reaction material types
  static STARTING_MATERIALS = 'starting_materials';

  static REACTANTS = 'reactants';

  static PRODUCTS = 'products';

  static SOLVENTS = 'solvents';

  static PURIFICATION_SOLVENTS = 'purification_solvents';

  // material group
  static materialGroups = [
    Reaction.PRODUCTS,
    Reaction.REACTANTS,
    Reaction.STARTING_MATERIALS,
    Reaction.SOLVENTS,
    Reaction.PURIFICATION_SOLVENTS
  ];

  static buildEmpty(collection_id) {
    const reaction = new Reaction({
      collection_id,
      container: Container.init(),
      dangerous_products: '',
      conditions: '',
      description: Reaction.quillDefault(),
      duration: '',
      durationDisplay: DurationDefault,
      literatures: {},
      research_plans: {},
      name: '',
      observation: Reaction.quillDefault(),
      products: [],
      purification: '',
      purification_solvents: [],
      reactants: [],
      reactant_sbmm_samples: [],
      rf_value: 0.00,
      role: '',
      user_labels: [],
      solvent: '',
      solvents: [],
      status: '',
      starting_materials: [],
      temperature: TemperatureDefault,
      timestamp_start: '',
      timestamp_stop: '',
      tlc_description: '',
      tlc_solvents: '',
      type: 'reaction',
      can_update: true,
      can_copy: false,
      variations: [],
      vessel_size: { amount: null, unit: 'ml' },
      volume: null,
      use_reaction_volume: false,
      gaseous: false,
      weight_percentage: false
    });
    reaction.short_label = this.buildReactionShortLabel();
    reaction.rxno = '';
    return reaction;
  }

  static buildReactionShortLabel() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return 'New Reaction'; }

    const number = currentUser.reactions_count + 1;
    const prefix = currentUser.reaction_name_prefix;
    return `${currentUser.initials}-${prefix}${number}`;
  }

  static get temperature_unit() {
    return TemperatureUnit;
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  serialize() {
    return super.serialize({
      collection_id: this.collection_id,
      container: this.container,
      description: this.description,
      dangerous_products: this.dangerous_products,
      conditions: this.conditions,
      duration: this.duration,
      durationDisplay: this.durationDisplay,
      durationCalc: this.durationCalc(),
      id: this.id,
      literatures: this.literatures,
      research_plans: this.research_plans,
      materials: {
        starting_materials: this.starting_materials.map((s) => s.serializeMaterial()),
        reactants: this.reactants.map((s) => s.serializeMaterial()),
        solvents: this.solvents.map((s) => s.serializeMaterial()),
        purification_solvents: this.purification_solvents.map((s) => s.serializeMaterial()),
        products: this.products.map((s) => s.serializeMaterial()),
        reactant_sbmm_samples: (this.reactant_sbmm_samples || []).map((s) => s.serializeSbmmMaterial())
      },
      name: this.name,
      observation: this.observation,
      origin: this.origin,
      purification: this.purification,
      tlc_solvents: this.tlc_solvents,
      tlc_description: this.tlc_description,
      reaction_svg_file: this.reaction_svg_file,
      role: this.role,
      user_labels: this.user_labels || [],
      rf_value: this.rf_value,
      rxno: this.rxno,
      short_label: this.short_label,
      solvent: this.solvent,
      status: this.status,
      temperature: this.temperature,
      timestamp_start: this.timestamp_start,
      timestamp_stop: this.timestamp_stop,
      segments: this.segments.map((s) => s.serialize()),
      variations: this.variations,
      vessel_size: this.vessel_size,
      volume: this.volume,
      use_reaction_volume: this.use_reaction_volume,
      gaseous: this.gaseous,
      weight_percentage: this.weight_percentage,
    });
  }

  set variations(variations) {
    /*
    See Entities::ReactionVariationEntity for details on the data structure.

    Units are to be treated as immutable. Units and corresponding values
    are changed (not mutated in the present data-structure!) only for display or export
    (i.e., at the boundaries of the application).
    This is why there's a `standard` unit and a `display` unit.
    The `standard` (available as `unit` attribute of each entry) is immutable,
    whereas the value that corresponds to `display` is computed ad hoc at the boundaries.
    See https://softwareengineering.stackexchange.com/a/391480.
    */
    if (!Array.isArray(variations)) {
      throw new Error(`Variations must be of type Array. Got ${typeof variations}.`);
    }
    this._variations = variations;
  }

  get variations() {
    return this._variations;
  }

  // Reaction Duration

  durationCalc() {
    return durationDiff(this.timestamp_start, this.timestamp_stop, true);
  }

  get durationDisplay() {
    if (!this._durationDisplay || this._durationDisplay.memValue === '') {
      const duration = this._duration;
      const m = duration && duration.match(/(\d+\.?(\d+)?)\s+([\w()]+)/);
      if (m) {
        this._durationDisplay = {
          dispUnit: m[3],
          memUnit: m[3],
          dispValue: m[1],
          memValue: m[1],
        };
      } else {
        this._durationDisplay = { ...DurationDefault };
      }
    }

    return this._durationDisplay;
  }

  set durationDisplay(newDuration) {
    const { fromStartStop, nextUnit, nextValue } = newDuration;
    const {
      dispUnit, memUnit, memValue
    } = this.durationDisplay || {};

    if (fromStartStop) {
      const d = durationDiff(this.timestamp_start, this.timestamp_stop);
      if (d) {
        const dUnit = highestUnitFromDuration(d);
        const val = d.as(MomentUnit[dUnit]);
        const dispValue = round(val, 1).toString();
        this._durationDisplay = {
          dispUnit: dUnit,
          dispValue,
          memUnit: dUnit,
          memValue: val.toString(),
        };
        this._duration = `${dispValue} ${dUnit}`;
      }
    } else if (nextValue || nextValue === '') {
      this._durationDisplay = {
        dispValue: nextValue,
        dispUnit,
        memUnit,
        memValue: nextValue
      };
      this._duration = `${nextValue} ${dispUnit}`;
    } else if (nextUnit) {
      const index = DurationUnit.indexOf(this._durationDisplay.dispUnit);
      const u = DurationUnit[(index + 1) % DurationUnit.length];
      const dispValue = round(convertDuration(memValue, memUnit, u), 1).toString();
      this._durationDisplay = {
        dispUnit: u,
        dispValue,
        memUnit,
        memValue
      };
      this._duration = `${dispValue} ${u}`;
    } else {
      this._durationDisplay = DurationDefault;
    }
  }

  get duration() {
    return this._duration;
  }

  set duration(duration) {
    this._duration = duration;
  }

  get durationUnit() {
    return this.durationDisplay.dispUnit;
  }

  // Reaction Temperature

  get temperature_display() {
    const { userText } = this._temperature;
    if (userText !== '') { return userText; }

    if (this._temperature.data.length === 0) { return ''; }

    const arrayData = this._temperature.data;
    const maxTemp = Math.max(...arrayData.map((o) => o.value));
    const minTemp = Math.min(...arrayData.map((o) => o.value));

    if (minTemp === maxTemp) { return minTemp; }
    return `${minTemp} ~ ${maxTemp}`;
  }

  get temperature() {
    return this._temperature;
  }

  set temperature(temperature) {
    this._temperature = temperature;
  }

  get description_contents() {
    return this.description.ops.map((s) => s.insert).join();
  }

  get observation_contents() {
    return this.observation.ops.map((s) => s.insert).join();
  }

  concat_text_observation(content) {
    const insertDelta = new Delta().insert(content);
    const observationDelta = new Delta(this.observation);
    const composedDelta = observationDelta.concat(insertDelta);
    this.observation = composedDelta;
  }

  convertTemperature(newUnit) {
    const temperature = this._temperature;
    const oldUnit = temperature.valueUnit;
    temperature.valueUnit = newUnit;

    // If userText is number only, treat as normal temperature value
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature.userText)) {
      temperature.userText = convertTemperature(temperature.userText, oldUnit, newUnit).toFixed(2);

      return temperature;
    }

    temperature.data.forEach((data, index, theArray) => {
      theArray[index].value = convertTemperature(data.value, oldUnit, newUnit).toFixed(2);
    });

    return temperature;
  }

  get short_label() {
    return this._short_label;
  }

  set short_label(short_label) {
    this._short_label = short_label;
  }

  get tlc_solvents() {
    return this._tlc_solvents;
  }

  set tlc_solvents(solvents) {
    this._tlc_solvents = solvents;
  }

  get starting_materials() {
    return this._starting_materials;
  }

  set starting_materials(samples) {
    this._starting_materials = this._coerceToSamples(samples);
  }

  get solvents() {
    return this._solvents;
  }

  set solvents(samples) {
    this._solvents = this._coerceToSamples(samples);
  }

  get purification_solvents() {
    return this._purification_solvents;
  }

  set purification_solvents(samples) {
    this._purification_solvents = this._coerceToSamples(samples);
  }

  get reactants() {
    return this._reactants;
  }

  set reactants(samples) {
    this._reactants = this._coerceToSamples(samples);
  }

  get reactant_sbmm_samples() {
    return this._reactant_sbmm_samples || [];
  }

  set reactant_sbmm_samples(samples) {
    this._reactant_sbmm_samples = this._coerceToSbmmSamples(samples);
  }

  get products() {
    return this._products;
  }

  set products(samples) {
    this._products = this._coerceToSamples(samples);
  }

  get samples() {
    return [
      ...this.starting_materials || [],
      ...this.reactants || [],
      ...this.solvents || [],
      ...this.purification_solvents || [],
      ...this.products || [],
    ];
  }

  // do not run any check based on ID on allReactionMaterials, as some sample materials may have the same ID as the SBMM samples
  get allReactionMaterials() {
    return [
      ...this.starting_materials || [],
      ...this.reactants || [],
      ...this.reactant_sbmm_samples || [],
    ];
  }

  // may have same ID for the reactant samples and SBMM samples
  get reactantsWithSbmm() {
    return [
      ...this.reactants || [],
      ...this.reactant_sbmm_samples || [],
    ];
  }

  buildCopy(params = {}, keepAmounts = false) {
    const copy = super.buildCopy();
    Object.assign(copy, params);
    copy.short_label = Reaction.buildReactionShortLabel();
    copy.starting_materials = this.starting_materials.map((sample) => {
      const copiedSample = Sample.copyFromSampleAndCollectionId(sample, copy.collection_id);
      if (!keepAmounts) {
        copiedSample._real_amount_value = null;
        if (!copiedSample._target_amount_value && !copiedSample.reference) {
          copiedSample.equivalent = null;
        }
      }
      return copiedSample;
    });
    copy.reactants = this.reactants.map((sample) => {
      const copiedSample = Sample.copyFromSampleAndCollectionId(sample, copy.collection_id);
      if (!keepAmounts) {
        copiedSample._real_amount_value = null;
        if (!copiedSample._target_amount_value && !copiedSample.reference) {
          copiedSample.equivalent = null;
        }
      }
      return copiedSample;
    });
    copy.solvents = this.solvents.map((sample) => {
      const copiedSample = Sample.copyFromSampleAndCollectionId(sample, copy.collection_id);
      if (!keepAmounts) {
        copiedSample._real_amount_value = null;
        if (!copiedSample._target_amount_value && !copiedSample.reference) {
          copiedSample.equivalent = null;
        }
      }
      return copiedSample;
    });
    copy.products = this.products.map((sample) => {
      const copiedSample = Sample.copyFromSampleAndCollectionId(sample, copy.collection_id);
      copiedSample._real_amount_value = null;
      copiedSample._target_amount_value = null;
      copiedSample.equivalent = null;
      return copiedSample;
    });

    copy.rebuildProductName();
    copy.container = Container.init();
    copy.can_update = true;
    copy.can_copy = false;
    return copy;
  }

  static copyFromReactionAndCollectionId(reaction, collection_id, keepAmounts = false) {
    const target = Segment.buildCopy(reaction.segments);
    const params = {
      collection_id,
      role: 'parts',
      segments: target,
      timestamp_start: '',
      timestamp_stop: '',
      rf_value: 0.00,
      status: '',
    };
    const copy = reaction.buildCopy(params, keepAmounts);
    copy.origin = { id: reaction.id, short_label: reaction.short_label };
    copy.name = copy.nameFromRole(copy.role);
    return copy;
  }

  title() {
    const short_label = this.short_label ? this.short_label : '';
    return this.name ? `${short_label} ${this.name}` : short_label;
  }

  addMaterial(material, group) {
    const materials = this[group];
    const newMaterial = this.materialPolicy(material, null, group);
    this[group] = [...materials, newMaterial];

    this.rebuildReference(newMaterial);
    this.setPositions(group);
  }

  addMaterialAt(srcMaterial, srcGp, tagMaterial, tagGp, srcIsWeightPercentageRef = false) {
    const materials = this[tagGp];
    const idx = materials.indexOf(tagMaterial);
    const newSrcMaterial = this.materialPolicy(srcMaterial, srcGp, tagGp);

    // rebuild weight percentage reference
    if (srcIsWeightPercentageRef) {
      newSrcMaterial.weight_percentage_reference = true;
      newSrcMaterial.weight_percentage = 1;
      WeightPercentageReactionActions.setWeightPercentageReference(newSrcMaterial);
      const amount = { value: newSrcMaterial.target_amount_value, unit: newSrcMaterial.target_amount_unit };
      WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(amount);
    }

    if (idx === -1) {
      this[tagGp] = [...materials, newSrcMaterial];
    } else {
      this[tagGp] = [
        ...materials.slice(0, idx),
        newSrcMaterial,
        ...materials.slice(idx),
      ];
    }

    this.rebuildReference(newSrcMaterial);
    this.setPositions(tagGp);
  }

  deleteMaterial(material, group) {
    const materials = this[group];
    const idx = materials.indexOf(material);
    this[group] = [
      ...materials.slice(0, idx),
      ...materials.slice(idx + 1),
    ];

    // If deleted material is weight percentage reference, then set it to false
    if (material.weight_percentage_reference) {
      material.weight_percentage_reference = false;
      WeightPercentageReactionActions.setWeightPercentageReference(null);
      WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(null);
      const { allReactionMaterials } = this;
      const refMaterial = allReactionMaterials.filter(
        (m) => m.reference === true
      )[0];

      const refAmountMol = refMaterial.amount_mol || 1;

      // reset all weight percentage to null, since there is no weight percentage reference assigned
      allReactionMaterials.forEach((m) => {
        m.weight_percentage = null;
        const amountMol = m.amount_mol || 0;

        // assign equivalent based on reference material (guard against missing ref)
        if (refMaterial && Number.isFinite(refAmountMol) && refAmountMol > 0 && Number.isFinite(amountMol)) {
          m.equivalent = amountMol / refAmountMol;
        } else {
          m.equivalent = null;
        }
      });
    }

    if (material.weight_percentage && material.weight_percentage > 0) {
      material.weight_percentage = null;
    }
    this.rebuildReference(material);
    this.setPositions(group);
  }

  swapMaterial(srcMaterial, tagMaterial, group) {
    const srcIdx = this[group].indexOf(srcMaterial);
    const tagIdx = this[group].indexOf(tagMaterial);
    const groupWoSrc = [
      ...this[group].slice(0, srcIdx),
      ...this[group].slice(srcIdx + 1),
    ];
    const newGroup = [
      ...groupWoSrc.slice(0, tagIdx),
      srcMaterial,
      ...groupWoSrc.slice(tagIdx),
    ];
    this[group] = newGroup.filter((o) => o != null) || [];

    this.rebuildReference(srcMaterial);
    this.setPositions(group);
  }

  moveMaterial(srcMaterial, srcGp, tagMaterial, tagGp) {
    if (srcGp === tagGp) {
      this.swapMaterial(srcMaterial, tagMaterial, tagGp);
    } else {
      const srcIsWeightPercentageRef = srcMaterial.weight_percentage_reference || false;
      this.deleteMaterial(srcMaterial, srcGp);
      this.addMaterialAt(srcMaterial, srcGp, tagMaterial, tagGp, srcIsWeightPercentageRef);
    }
  }

  setPositions(group) {
    this[group] = this[group].map((m, idx) => (
      { ...m, position: idx }
    ));
  }

  userLabels() {
    return this.user_labels;
  }

  setUserLabels(userLabels) {
    this.user_labels = userLabels;
  }

  // We will process all reaction policy here
  // If oldGroup = null -> drag new Sample into Reaction
  // Else -> moving between Material Group
  materialPolicy(material, oldGroup, newGroup) {
    if (newGroup == 'products') {
      material.amountType = 'real';

      // we don't want to copy loading from sample
      if (material.contains_residues) {
        material.loading = 0.0;
      }

      material.isSplit = false;
      material.reaction_product = true;
      material.equivalent = 0;
      material.reference = false;

      if (material.parent_id) {
        material.start_parent = material.parent_id;
        material.parent_id = null;
      }
    } else if (
      newGroup === 'reactants'
      || newGroup === 'reactant_sbmm_samples'
      || newGroup === 'solvents'
      || newGroup === 'purification_solvents'
    ) {
      if (newGroup === 'solvents') {
        material.reference = false;
        material.weight_percentage_reference = false;
      }

      // Temporary set true, to fit with server side logical
      material.isSplit = true;
      material.reaction_product = false;
    } else if (newGroup == "starting_materials") {
      material.isSplit = true;
      material.reaction_product = false;

      if (material.start_parent && material.parent_id == null) {
        material.parent_id = material.start_parent;
      }
    }

    this.shortLabelPolicy(material, oldGroup, newGroup);
    this.namePolicy(material, oldGroup, newGroup);
    if (!material.coefficient || material.coefficient < 0) {
      material.coefficient = 1.0;
    }
    material.waste = false;

    return material;
  }

  shortLabelPolicy(material, oldGroup, newGroup) {
    // For SBMM samples, preserve their original short_label (like starting_materials)
    const isSbmm = isSbmmSample(material);
    if (isSbmm && newGroup === 'reactant_sbmm_samples') {
      // Preserve original short_label for SBMM samples - don't override it
      return;
    }

    if (oldGroup) {
      // Save previous short_label
      material[`short_label_${oldGroup}`] = material.short_label;

      // Reassign previous short_label if present
      if (material[`short_label_${newGroup}`]) {
        material.short_label = material[`short_label_${newGroup}`];
        return 0;
      }
      // routines below are for exisiting samples moved a first time
      if (newGroup === 'products') {
        // products are new samples => build new short_label
        material.short_label = Sample.buildNewShortLabel();
      } else if (newGroup === 'starting_materials') {
        if (oldGroup !== 'products') {
          // if starting_materials from products, reuse product short_label (do nothing)
          material.short_label = Sample.buildNewShortLabel();
        }
      }
      // else when newGroup is reactant/solvent do nothing because not displayed (short_label set in BE)
    } else if (newGroup === 'starting_materials') {
      if (material.split_label) { material.short_label = material.split_label; }
    } else if (newGroup === 'products') {
      // products are new samples => build new short_label
      material.short_label = Sample.buildNewShortLabel();
    } else {
      material.short_label = newGroup.slice(0, -1); // "reactant" or "solvent"
    }
  }

  namePolicy(material, oldGroup, newGroup) {
    this.rebuildProductName();

    // For SBMM samples, preserve their original name (like starting_materials)
    const isSbmm = isSbmmSample(material);
    if (isSbmm && newGroup === 'reactant_sbmm_samples') {
      // Preserve original name for SBMM samples - don't override it
      return;
    }

    if (oldGroup && oldGroup === 'products') {
      // Blank name if FROM "products"
      material.name = '';
      return 0;
    }

    if (newGroup === 'products') {
      const productName = String.fromCharCode('A'.charCodeAt(0) + this.products.length);
      material.name = `${this.short_label}-${productName}`;
    }
  }

  rebuildProductName() {
    const { short_label } = this;
    this.products.forEach((product, index, arr) => {
      const productName = String.fromCharCode('A'.charCodeAt(0) + index);
      arr[index].name = `${short_label}-${productName}`;
    });
  }

  rebuildReference(material) {
    if (this.referenceMaterial) {
      const { referenceMaterial } = this;

      if (!referenceMaterial && this.starting_materials.length > 0) {
        this._setAsReferenceMaterial(this.starting_materials[0]);
      } else {
        this._updateEquivalentForMaterial(material);
      }
    }

    this.products.forEach((product, index, arr) => {
      arr[index].reference = false;
    });
  }

  _coerceToSamples(samples) {
    return samples && samples.map((s) => new Sample(s)) || [];
  }

  _coerceToSbmmSamples(samples) {
    if (!samples) return [];

    return samples.map((s) => {
      if (s instanceof SequenceBasedMacromoleculeSample) {
        return s;
      }
      return new SequenceBasedMacromoleculeSample(s);
    });
  }

  sampleById(sampleID) {
    return this.samples.find((sample) => sample.id === sampleID);
  }

  findSbmmSample(sampleID) {
    return this.reactant_sbmm_samples.find((s) => s.id === sampleID);
  }

  /**
   * Gets the reference material for the reaction (either regular sample or SBMM sample)
   * @returns {Sample|SequenceBasedMacromoleculeSample|undefined} The reference material, or undefined if none exists
   */
  get referenceMaterial() {
    return this.allReactionMaterials.find((sample) => sample.reference);
  }

  get sampleCount() {
    return this.samples.length;
  }

  /**
   * Marks a regular Sample (non-SBMM) as the reference material for the reaction.
   * Clears the reference flag from all other samples in the reaction.
   *
   * @param {string|number} sampleID - The ID of the sample to mark as reference
   * @returns {void}
   */
  markSampleAsReference(sampleID) {
    this.samples.forEach((sample) => {
      sample.reference = sample.id === sampleID;
    });

    this.reactant_sbmm_samples.forEach((sample) => {
      sample.reference = false;
    });
  }

  /**
   * Marks a Sequence-Based Macromolecule Sample (SBMM) as the reference material for the reaction.
   * Only affects SBMM samples; does not modify regular samples.
   * Use this when setting an SBMM sample as reference to avoid ID collision issues.
   *
   * @param {string|number} sampleID - The ID of the SBMM sample to mark as reference
   * @returns {void}
   */
  markSbmmSampleAsReference(sampleID) {
    this.samples.forEach((sample) => {
      sample.reference = false;
    });

    this.reactant_sbmm_samples.forEach((sample) => {
      sample.reference = sample.id === sampleID;
    });
  }

  markWeightPercentageSampleAsReference(sampleID) {
    this.samples.forEach((sample) => {
      sample.weight_percentage_reference = sample.id === sampleID;
    });
  }

  toggleShowLabelForSample(sampleID) {
    const sample = this.sampleById(sampleID);
    sample.show_label = ((sample.decoupled && !sample.molfile) ? true : !sample.show_label);
  }

  _setAsReferenceMaterial(sample) {
    sample.equivalent = 1;
    sample.reference = true;
  }

  _updateEquivalentForMaterial(sample) {
    const referenceAmountMol = this.referenceMaterial.amount_mol;
    const sampleAmountMol = sample.amount_mol;

    if (referenceAmountMol) {
      sample.equivalent = sampleAmountMol / referenceAmountMol;
    }
  }

  get svgPath() {
    if (this.reaction_svg_file && this.reaction_svg_file != '***') {
      if (this.reaction_svg_file.includes('<svg')) {
        // Raw SVG must be encoded as data URI - passing it directly causes react-inlinesvg
        // to match embedded data URIs (e.g. in <image href="...">) and atob() invalid base64
        try {
          const base64 = btoa(unescape(encodeURIComponent(this.reaction_svg_file)));
          return `data:image/svg+xml;base64,${base64}`;
        } catch (e) {
          console.warn('Failed to encode reaction SVG as data URI', e);
          return 'images/wild_card/no_image_180.svg';
        }
      } if (this.reaction_svg_file.substr(this.reaction_svg_file.length - 4) === '.svg') {
        return `/images/reactions/${this.reaction_svg_file}`;
      }
    } else return 'images/wild_card/no_image_180.svg';
  }

  SMGroupValid() {
    let result = true;
    this.starting_materials.map((sample) => {
      if (!sample.isValid) result = false;
    });

    return result;
  }

  hasMaterials() {
    return this.starting_materials.length > 0
      || this.reactants.length > 0
      || this.reactant_sbmm_samples.length > 0
      || this.solvents.length > 0
      || this.products.length > 0;
  }

  hasSample(sampleId) {
    return this.samples.find((sample) => sample.id == sampleId);
  }

  hasPolymers() {
    return this.samples.find((sample) => sample.contains_residues);
  }

  getReferenceMaterial() {
    return this.referenceMaterial;
  }

  updateMaterial(material, refreshCoefficient) {
    const cats = ['starting_materials', 'reactants', 'solvents', 'products'];
    let i = 0;
    let group;

    while (i < cats.length) {
      const groupName = `_${cats[i]}`;
      group = this[groupName];
      if (group) {
        const index = group.findIndex((x) => x.id === material.id);
        if (index >= 0) {
          const existingMat = group[index];
          const mat = new Sample(material);
          mat.reference = existingMat.reference;
          mat.gas_type = existingMat.gas_type;
          mat.gas_phase_data = existingMat.gas_phase_data;
          mat.coefficient = existingMat.coefficient;
          mat.weight_percentage_reference = existingMat.weight_percentage_reference;
          mat.weight_percentage = existingMat.weight_percentage;

          // Ensure all components are Component instances, not plain objects
          if (mat.hasComponents()) {
            mat.components = mat.components.map((comp) => (
              comp instanceof Component ? comp : Component.deserializeData(comp)
            ));
          }

          mat.updateChecksum();
          group[index] = mat;
          break;
        }
      }

      i += 1;
    }
    this.refreshEquivalent(material, refreshCoefficient);
  }

  refreshEquivalent(material, refreshCoefficient) {
    let matGroup;
    const refMat = this.referenceMaterial;
    const referenceAmountMol = refMat.amount_mol;

    if (refMat && referenceAmountMol) {
      ['_starting_materials', '_reactants', '_solvents', '_products'].forEach((g) => {
        matGroup = this[g];
        if (matGroup) {
          this[g] = matGroup.map((mat) => {
            const m = mat;
            const amountMol = m.amount_mol;
            if (m.id === material.id) {
              if (refreshCoefficient && m.id === refreshCoefficient.sId) {
                m.coefficient = refreshCoefficient.coefficient;
              }
            }
            if (g === '_products' && m.gas_type !== 'gas') {
              const stoichiometryCoeff = (m.coefficient || 1.0) / (refMat?.coefficient || 1.0);
              m.equivalent = amountMol / referenceAmountMol / stoichiometryCoeff;
            } else {
              m.equivalent = amountMol / referenceAmountMol;
            }
            return m;
          });
        }
      });
    }
  }

  get research_plans() {
    return this._research_plans || {};
  }

  set research_plans(research_plans) {
    this._research_plans = research_plans;
  }

  get totalVolume() {
    let totalVolume = 0.0;
    const materials = [...this.starting_materials,
      ...this.reactants,
      ...this.products,
      ...this.solvents];
    materials.map((m) => totalVolume += m.amount_l);
    return totalVolume;
  }

  get purificationSolventVolume() {
    return this.totalVolumeForMaterialGroup(Reaction.PURIFICATION_SOLVENTS);
  }

  get solventVolume() {
    return this.totalVolumeForMaterialGroup(Reaction.SOLVENTS);
  }

  /**
  * Calculates the volume ratio (as a percentage) of a material within a given material group.
  *
  * This method is useful for determining how much a material contributes to the total volume
  * of its group (e.g., solvents or purification solvents).
  *
  * @param {number} amountLiters - The volume of the material in liters.
  * @param {number} totalVolume - The total volume of the material group in liters.
  * @returns {string} The volume ratio as a percentage string (e.g., "25.0%"), or `'n.d.'` if
  * the total volume is invalid or the calculation results in a non-numeric value.
  */
  calculateVolumeRatio(amountLiters, totalVolume) {
    if (!totalVolume || totalVolume === 0) return 'n.d.';
    const concn = ((amountLiters / totalVolume) * 100);
    if (Number.isNaN(concn) || !Number.isFinite(concn)) return 'n.d.';
    return `${concn.toFixed(1)}%`;
  }

  /**
   * Searches for a material by its ID within the defined material groups.
   *
   * Iterates through each group in `materialGroups` (e.g., starting materials, products, etc.)
   * and returns the material if found, along with its corresponding group type.
   *
   * @param {string} id - The unique identifier of the material to search for.
   * @returns {{ type: string|null, material: Object|null }} An object containing the material group type and the material itself,
   * or `{ type: null, material: null }` if not found.
   */
  findMaterialById(id) {
    let material = null;
    const type = Reaction.materialGroups.find((materialGroup) => {
      const list = this[materialGroup];
      material = list.find((sample) => sample?.id === id);
      return material;
    });
    return { type, material };
  }

  /**
   * Calculates the total volume (L) for a given material group.
   *
   * @param {string} materialGroup - The material group to calculate the volume for (e.g., 'solvents', 'purification_solvents').
   * @returns {number} The volume.
   */
  totalVolumeForMaterialGroup(materialGroup) {
    if (Array.isArray(this[materialGroup])) {
      return this[materialGroup].reduce((sum, m) => sum + (m.amount_l || 0), 0);
    }
    return 'n.d';
  }

  /**
   * Calculates the volume ratio (as a percentage) of a specific material by its ID
   * relative to the total volume of its material group (e.g., solvents or purification solvents).
   *
   * @param {number|string} id - The unique identifier of the material to calculate the ratio for.
   * @returns {string} The volume ratio as a percentage string (e.g., '25.0%') or 'n.d.' if not determinable.
   */
  volumeRatioByMaterialId(id) {
    const { type, material } = this.findMaterialById(id);
    if (!type || !material) return 'n.d.';
    const amountLiters = material.amount_l;
    const totalVolume = this.totalVolumeForMaterialGroup(type);
    if (Number.isNaN(amountLiters) || Number.isNaN(totalVolume) || totalVolume < 0 || amountLiters < 0) return 'n.d.'; // Ensure amount_l is valid
    return this.calculateVolumeRatio(amountLiters, totalVolume);
  }

  // overwrite isPendingToSave method in models/Element.js
  get isPendingToSave() {
    return !isEmpty(this) && (this.isNew || this.changed);
  }

  extractNameFromOri(origin) {
    const ori = origin || this.origin;
    const oriSLabel = ori && ori.short_label;
    const oriSLNum = oriSLabel ? oriSLabel.split('-').slice(-1)[0] : 'xx';
    const name = `According to General Procedure ${oriSLNum}`;
    return name;
  }

  nameFromRole(role) {
    let { name } = this;
    const sLabel = this.short_label;
    const sLNum = sLabel ? sLabel.split('-').slice(-1)[0] : 'xx';

    switch (role) {
      case 'gp':
        name = `General Procedure ${sLNum}`;
        break;
      case 'parts':
        name = this.extractNameFromOri();
        break;
      case 'single':
        name = `Single ${sLNum}`;
        break;
      default:
        break;
    }
    return name;
  }

  set segments(segments) {
    this._segments = (segments && segments.map((s) => new Segment(s))) || [];
  }

  get segments() {
    return this._segments || [];
  }

  updateMaxAmountOfProducts() {
    const startingMaterialsList = this.starting_materials.filter((sample) => sample.reference);
    if (startingMaterialsList.length == 0) { return; }
    const referenceSample = startingMaterialsList[0];

    this.products.forEach((product) => product.calculateMaxAmount(referenceSample));
  }

  findReactionVesselSizeCatalystMaterialValues() {
    const catalyst = this.findCatalystMaterial();
    const result = {
      catalystMoles: null,
      vesselSize: null
    };
    result.catalystMoles = catalyst ? this.calculateCatalystMoles(catalyst) : null;
    if (this.vessel_size) {
      if (this.vessel_size.unit === 'l') {
        result.vesselSize = this.vessel_size.amount;
      } else {
        result.vesselSize = this.vessel_size.amount * 0.001;
      }
    }
    return result;
  }

  findCatalystMaterial() {
    const materials = [...this.starting_materials, ...this.reactants];
    const catalystMaterial = materials.find((material) => (material.gas_type === 'catalyst'));
    return catalystMaterial;
  }

  calculateCatalystMoles(material) {
    let moles;
    let amount;
    let unit;
    const {
      purity,
      target_amount_unit,
      target_amount_value,
      real_amount_unit,
      real_amount_value,
      density
    } = material;
    if (real_amount_value && real_amount_unit) {
      amount = real_amount_value;
      unit = real_amount_unit;
    } else {
      amount = target_amount_value;
      unit = target_amount_unit;
    }
    const molecularWeight = material.molecule.molecular_weight;
    if (unit === 'mol') {
      moles = amount;
    } else if (unit === 'l') {
      const amountInGram = amount * density * 1000;
      moles = (amountInGram * purity) / molecularWeight;
    } else if (unit === 'g') {
      moles = (amount * purity) / molecularWeight;
    }
    return moles;
  }

  /**
   * Calculates the combined volume of all reaction materials
   * (solvent + starting_materials + reactants + reactant_sbmm_samples).
   *
   * @method calculateCombinedReactionVolume
   * @memberof Reaction
   * @returns {number|null} Combined volume in liters, or null if invalid
   */
  calculateCombinedReactionVolume() {
    let totalVolume = 0;

    // Add solvent volume
    if (Number.isFinite(this.solventVolume) && this.solventVolume > 0) {
      totalVolume += this.solventVolume;
    }

    // Add volumes from all reaction materials (starting + reactants + SBMM reactants)

    this.allReactionMaterials.forEach((material) => {
      if (material && Number.isFinite(material.amount_l) && material.amount_l > 0) {
        totalVolume += material.amount_l;
      }
    });

    return totalVolume > 0 ? totalVolume : null;
  }

  /**
   * Updates concentrations for all materials in the reaction when volumes change.
   * This should be called whenever any material's amount_l changes.
   *
   * @method updateAllConcentrations
   * @memberof Reaction
   * @returns {void}
   */
  updateAllConcentrations() {
    const allMaterials = [
      ...this.allReactionMaterials,
      ...(this.products || []),
    ];

    allMaterials.forEach((material) => {
      material.updateConcentrationFromSolvent(this);
    });
  }

  isFeedstockMaterialPresent() {
    const materials = [...this.starting_materials, ...this.reactants];
    return materials.some((material) => material.gas_type === 'feedstock');
  }

  findFeedstockMaterial() {
    const materials = [...this.starting_materials, ...this.reactants];
    const feedstockMaterial = materials.find((material) => (material.gas_type === 'feedstock'));
    return feedstockMaterial;
  }

  findWeightPercentageReferenceMaterial() {
    const result = {
      weightPercentageReference: null,
      targetAmount: null,
    };
    const materials = [...this.starting_materials, ...this.reactants, ...this.products];
    if (materials && materials.length > 0) {
      const reference = materials.find((material) => (material.weight_percentage_reference === true));
      if (reference) {
        result.weightPercentageReference = reference;
        result.targetAmount = {
          value: reference.target_amount_value,
          unit: reference.target_amount_unit
        };
      }
    }
    return result;
  }
}
