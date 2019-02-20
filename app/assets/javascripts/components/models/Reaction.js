import _ from 'lodash';
import Delta from 'quill-delta';
import moment from 'moment';
import 'moment-precise-range-plugin';

import Element from './Element';
import Sample from './Sample';
import Literature from './Literature';
import Container from './Container.js'

import UserStore from '../stores/UserStore';

const TemperatureUnit = ["°C", "°F", "K"]
const MomentUnit = [
  { key: 'Year(s)', val: 'years' },
  { key: 'Month(s)', val: 'months' },
  { key: 'Week(s)', val: 'weeks' },
  { key: 'Day(s)', val: 'days' },
  { key: 'Hour(s)', val: 'hours' },
  { key: 'Minute(s)', val: 'minutes' },
  { key: 'Second(s)', val: 'seconds' }
];
const DurationUnit = ['Year(s)', 'Month(s)', 'Week(s)', 'Day(s)', 'Hour(s)', 'Minute(s)', 'Second(s)'];
const DurationDefault = {
  valueUnit: 'Day(s)',
  userText: ''
};
export default class Reaction extends Element {

  static buildEmpty(collection_id) {
    const temperatureDefault = {
      "valueUnit": "°C",
      "userText": "",
      "data": []
    }

    const reaction = new Reaction({
      collection_id,
      type: 'reaction',
      name: '',
      status: "",
      role: "",
      description: Reaction.quillDefault(),
      timestamp_start: "",
      timestamp_stop: "",
      durationCalc: "",
      observation: Reaction.quillDefault(),
      purification: "",
      dangerous_products: "",
      tlc_solvents: "",
      rf_value: 0.00,
      temperature: temperatureDefault,
      tlc_description: "",
      starting_materials: [],
      reactants: [],
      solvents: [],
      purification_solvents: [],
      products: [],
      literatures: [],
      solvent: '',
      container: Container.init(),
      duration_display: DurationDefault,
      duration: ''
    })

    reaction.short_label = this.buildReactionShortLabel()
    return reaction
  }

  static buildReactionShortLabel() {
    let {currentUser} = UserStore.getState()
    if(!currentUser) {
      return 'New Reaction';
    } else {
      let number = currentUser.reactions_count + 1;
      let prefix = currentUser.reaction_name_prefix;
      return `${currentUser.initials}-${prefix}${number}`;
    }
  }

  static get duration_unit() {
    return DurationUnit;
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
      id: this.id,
      name: this.name,
      description: this.description,
      timestamp_start: this.timestamp_start,
      timestamp_stop: this.timestamp_stop,
      durationCalc: this.durationCalc,
      observation: this.observation,
      purification: this.purification,
      dangerous_products: this.dangerous_products,
      solvent: this.solvent,
      tlc_solvents: this.tlc_solvents,
      tlc_description: this.tlc_description,
      rf_value: this.rf_value,
      temperature: this.temperature,
      short_label: this.short_label,
      status: this.status,
      role: this.role,
      origin: this.origin,
      reaction_svg_file: this.reaction_svg_file,
      materials: {
        starting_materials: this.starting_materials.map(s=>s.serializeMaterial()),
        reactants: this.reactants.map(s=>s.serializeMaterial()),
        solvents: this.solvents.map(s=>s.serializeMaterial()),
        purification_solvents: this.purification_solvents.map(s=>s.serializeMaterial()),
        products: this.products.map(s=>s.serializeMaterial())
      },
      literatures: this.literatures.map(literature => literature.serialize()),
      container: this.container,
      duration: this.duration,
      duration_display: this.duration_display,
    });
  }

  get temperature_display() {
    let userText = this._temperature.userText
    if (userText !== "") return userText

    if (this._temperature.data.length == 0) return ""

    let arrayData = this._temperature.data
    let maxTemp = Math.max.apply(Math, arrayData.map(function(o){return o.value}))
    let minTemp = Math.min.apply(Math, arrayData.map(function(o){return o.value}))

    if (minTemp == maxTemp)
      return minTemp
    else
      return minTemp + " ~ " + maxTemp
  }

  get duration_display() {
    return this._duration_display;
  }

  set duration_display(duration_display) {
    this._duration_display = duration_display;
  }

  get duration() {
    return this._duration;
  }

  set duration(duration) {
    this._duration = duration;
  }

  get temperature() {
    return this._temperature
  }

  set temperature(temperature) {
    this._temperature = temperature
  }

  get description_contents() {
    return this.description.ops.map(s => s.insert).join()
  }

  get observation_contents() {
    return this.observation.ops.map(s => s.insert).join()
  }

  concat_text_observation(content) {
    const insertDelta = new Delta().insert(content);
    const observationDelta = new Delta(this.observation);
    const composedDelta = observationDelta.concat(insertDelta);
    this.observation = composedDelta;
  }

  convertDuration(newUnit) {
    let duration = this._duration_display;
    const oldUnit = duration.valueUnit;
    duration.valueUnit = newUnit;

    if (duration.userText && !isNaN(duration.userText)) {
      const durationMoment = moment.duration(Number.parseFloat(duration.userText), _.find(MomentUnit, m => m.key === oldUnit).val);
      let v = durationMoment.as(_.find(MomentUnit, m => m.key === newUnit).val);
      v = _.round(v, 1);
      duration.userText = v.toString();
    }
    return duration;
  }

  convertTemperature(newUnit) {
    let temperature = this._temperature
    let oldUnit = temperature.valueUnit
    temperature.valueUnit = newUnit

    let convertFunc
    switch (oldUnit) {
      case "K":
        convertFunc = this.convertFromKelvin
        break
      case "°F":
        convertFunc = this.convertFromFarenheit
        break
      default:
        convertFunc = this.convertFromCelcius
        break
    }

    // If userText is number only, treat as normal temperature value
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature.userText)) {
      temperature.userText =
        convertFunc(newUnit, temperature.userText).toFixed(2)

      return temperature
    }

    temperature.data.forEach(function(data, index, theArray) {
      theArray[index].value = convertFunc(newUnit, data.value).toFixed(2)
    })

    return temperature
  }

  convertFromKelvin(unit, temperature) {
    if (unit == "°C") {
      return (parseFloat(temperature) - 273.15)
    } else { // Farenheit
      return ((parseFloat(temperature) * 9 / 5) - 459.67)
    }
  }

  convertFromFarenheit(unit, temperature) {
    if (unit == "°C") {
      return ((parseFloat(temperature) - 32) / 1.8)
    } else { // Kelvin
      return ((parseFloat(temperature) + 459.67) * 5 / 9)
    }
  }

  convertFromCelcius(unit, temperature) {
    if (unit == "°F") {
      return ((parseFloat(temperature) * 1.8) + 32)
    } else { // Kelvin
      return (parseFloat(temperature) + 273.15)
    }
  }

  get short_label() {
    return this._short_label
  }

  set short_label(short_label) {
    this._short_label = short_label
  }

  get tlc_solvents() {
    return this._tlc_solvents
  }

  set tlc_solvents(solvents) {
    this._tlc_solvents = solvents
  }

  get starting_materials() {
    return this._starting_materials
  }

  set starting_materials(samples) {
    this._starting_materials = this._coerceToSamples(samples);
  }

  get solvents() {
    return this._solvents
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
    return this._reactants
  }

  set reactants(samples) {
    this._reactants = this._coerceToSamples(samples);
  }

  get products() {
    return this._products
  }

  set products(samples) {
    this._products = this._coerceToSamples(samples);
  }

  get samples() {
    return [
      ...this.starting_materials,
      ...this.reactants,
      ...this.solvents,
      ...this.purification_solvents,
      ...this.products,
    ];
  }

  buildCopy(params = {}) {
    const copy = super.buildCopy();
    Object.assign(copy, params);

    copy.starting_materials = this.starting_materials.map(
      sample => Sample.copyFromSampleAndCollectionId(sample, copy.collection_id)
    );
    copy.reactants = this.reactants.map(
      sample => Sample.copyFromSampleAndCollectionId(sample, copy.collection_id)
    );
    copy.solvents = this.solvents.map(
      sample => Sample.copyFromSampleAndCollectionId(sample, copy.collection_id)
    );
    copy.products = this.products.map(
      sample => Sample.copyFromSampleAndCollectionId(sample, copy.collection_id, true, true)
    );

    copy.container = Container.init();
    return copy;
  }

  static copyFromReactionAndCollectionId(reaction, collection_id) {
    const params = {
      collection_id,
      role: 'parts',
      timestamp_start: '',
      timestamp_stop: '',
      rf_value: 0.00,
      status: '',
    }
    const copy = reaction.buildCopy(params);
    copy.origin = { id: reaction.id, short_label: reaction.short_label };
    copy.name = copy.nameFromRole(copy.role);
    return copy;
  }

  title() {
    const short_label = this.short_label ? this.short_label : ''
    return this.name ? `${short_label} ${this.name}` : short_label
  }

  addMaterial(material, group) {
    const materials = this[group];
    const newMaterial = this.materialPolicy(material, null, group);
    this[group] = [...materials, newMaterial];

    this.rebuildReference(newMaterial);
    this.setPositions(group);
  }

  addMaterialAt(srcMaterial, srcGp, tagMaterial, tagGp) {
    const materials = this[tagGp];
    const idx = materials.indexOf(tagMaterial);
    const newSrcMaterial = this.materialPolicy(srcMaterial, srcGp, tagGp);

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
    this[group] = newGroup.filter(o => o != null) || [];

    this.rebuildReference(srcMaterial);
    this.setPositions(group);
  }

  moveMaterial(srcMaterial, srcGp, tagMaterial, tagGp) {
    if (srcGp === tagGp) {
      this.swapMaterial(srcMaterial, tagMaterial, tagGp);
    } else {
      this.deleteMaterial(srcMaterial, srcGp);
      this.addMaterialAt(srcMaterial, srcGp, tagMaterial, tagGp);
    }
  }

  setPositions(group) {
    this[group] = this[group].map((m, idx) => (
      Object.assign({}, m, { position: idx })
    ));
  }

  // We will process all reaction policy here
  // If oldGroup = null -> drag new Sample into Reaction
  // Else -> moving between Material Group
  materialPolicy(material, oldGroup, newGroup) {
    if (newGroup == "products") {
      material.amountType = 'real';

      // we don't want to copy loading from sample
      if(material.contains_residues) {
        material.loading = 0.0;
      }

      material.isSplit = false;
      material.reaction_product = true;
      material.equivalent = 0;
      material.reference = false;

      if (material.parent_id) {
        material.start_parent = material.parent_id
        material.parent_id = null
      }
    } else if (
      newGroup === "reactants" || newGroup === "solvents" ||
      newGroup === "purification_solvents"
    ) {
      if (newGroup === "solvents") {
        material.reference = false;
      }

      // Temporary set true, to fit with server side logical
      material.isSplit = true;
      material.reaction_product = false;
    } else if (newGroup == "starting_materials") {
      material.isSplit = true;
      material.reaction_product = false;

      if (material.start_parent && material.parent_id == null) {
        material.parent_id = material.start_parent
      }
    }

    this.shortLabelPolicy(material, oldGroup, newGroup);
    this.namePolicy(material, oldGroup, newGroup);

    material.coefficient = 1;
    material.waste = false;

    return material;
  }

  shortLabelPolicy(material, oldGroup, newGroup) {
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
    } else {
      if (newGroup === "starting_materials") {
        if (material.split_label) { material.short_label = material.split_label; }
      } else if (newGroup === "products") {
        // products are new samples => build new short_label
        material.short_label = Sample.buildNewShortLabel();
      } else {
        material.short_label = newGroup.slice(0, -1); // "reactant" or "solvent"
      }
    }
  }

  namePolicy(material, oldGroup, newGroup) {
    this.rebuildProductName();

    if (oldGroup && oldGroup == "products"){
      // Blank name if FROM "products"
      material.name = "";
      return 0;
    }

    if (newGroup == "products") {
      let productName = String.fromCharCode('A'.charCodeAt(0) + this.products.length);
      material.name = this.short_label + "-" + productName;
    }
  }

  rebuildProductName() {
    let short_label = this.short_label
    this.products.forEach(function(product, index, arr) {
      let productName = String.fromCharCode('A'.charCodeAt(0) + index);
      arr[index].name = short_label + "-" + productName;
    })
  }

  rebuildReference(material) {
    if (this.referenceMaterial) {
      let referenceMaterial = this.referenceMaterial
      let reference = this.starting_materials.find(function(m) {
        return referenceMaterial.id === m.id;
      })

      // if referenceMaterial exists,
      // referenceMaterialGroup must be either 'starting_materials' or 'reactants'
      if (!reference) reference = this.reactants.find(m => m.id === referenceMaterial.id);

      if (!reference && this.starting_materials.length > 0) {
        this._setAsReferenceMaterial(this.starting_materials[0]);
      } else {
        this._updateEquivalentForMaterial(material);
      }
    }

    this.products.forEach(function(product, index, arr) {
      arr[index].reference = false;
    })
  }

  _coerceToSamples(samples) {
    return samples && samples.map(s => new Sample(s)) || []
  }

  sampleById(sampleID) {
    return this.samples.find((sample) => {
      return sample.id == sampleID;
    })
  }

  get referenceMaterial() {
    return this.samples.find((sample) => {
      return sample.reference;
    })
  }

  get sampleCount() {
    return this.samples.length;
  }

  markSampleAsReference(sampleID) {
    this.samples.forEach((sample) => {
      sample.reference = sample.id == sampleID;
    })
  }

  _setAsReferenceMaterial(sample) {
    sample.equivalent = 1;
    sample.reference = true;
  }

  _updateEquivalentForMaterial(sample) {
    if(this.referenceMaterial && this.referenceMaterial.amount_mol) {
      sample.equivalent = sample.amount_mol / this.referenceMaterial.amount_mol;
    }
  }

  get svgPath() {
    if(this.reaction_svg_file && this.reaction_svg_file != '***')
      return `/images/reactions/${this.reaction_svg_file}`
    else
      return `images/wild_card/no_image_180.svg`
  }

  SMGroupValid() {
    let result = true;
    this.starting_materials.map((sample) => {
      if(!sample.isValid)
        result = false;
    });

    return result;
  }

  hasMaterials() {
    return this.starting_materials.length > 0 || this.reactants.length > 0 || this.solvents.length > 0 || this.products.length > 0;
  }

  hasSample(sampleId) {
    return this.samples.find((sample) => {
      return sample.id == sampleId
    });
  }

  hasPolymers() {
    return this.samples.find((sample) => {
      return sample.contains_residues
    });
  }

  updateMaterial(material) {
    this._updateEquivalentForMaterial(material);
    const cats = ['starting_materials', 'reactants', 'solvents', 'products'];

    let i = 0;
    let group;
    let index;
    while (i < cats.length) {
      const groupName = `_${cats[i]}`;
      group = this[groupName];
      if (group) {
        const index = group.findIndex(x => x.id == material.id);
        if (index >= 0) {
          group[index] = new Sample(material);
          break;
        }
      }

      i += 1;
    }
  }

  // literatures

  get literatures() {
    return this._literatures || [];
  }

  set literatures(literatures) {
    this._literatures = literatures.map(literature => new Literature(literature));
  }

  removeLiterature(literature) {
    const literatureKey = this.literatures.indexOf(literature);
    this._literatures.splice(literatureKey, 1);
  }

  addLiterature(literature) {
    this._literatures.push(literature);
  }

  get totalVolume() {
    let totalVolume = 0.0;
    const materials = [...this.starting_materials,
                        ...this.reactants,
                        ...this.products,
                        ...this.solvents];
    materials.map(m => totalVolume += m.amount_l);
    return totalVolume;
  }

  get solventVolume() {
    let solventVolume = 0.0;
    const materials = [...this.solvents];
    materials.map(m => solventVolume += m.amount_l);
    return solventVolume;
  }

  // overwrite isPendingToSave method in models/Element.js
  get isPendingToSave() {
    return !_.isEmpty(this) && (this.isNew || this.changed);
  }

  extractNameFromOri(origin) {
    const ori = origin || this.origin;
    const oriSLabel = ori && ori.short_label;
    const oriSLNum = oriSLabel ? oriSLabel.split('-').slice(-1)[0] : 'xx';
    const name = `According to General Procedure ${oriSLNum}`;
    return name;
  }

  nameFromRole(role) {
    let name = this.name;
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
}
