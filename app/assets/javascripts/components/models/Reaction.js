import Element from './Element';
import Sample from './Sample';
import Literature from './Literature';

import UserStore from '../stores/UserStore';

export default class Reaction extends Element {
  isMethodDisabled() {
    return false;
  }

  isMethodRestricted(m) {
    return false;
  }

  initializeTemporarySampleCounter(currentUser) {
    if(!this.temporary_sample_counter) {
      this.temporary_sample_counter = currentUser.samples_created_count + 1;
    }
  }

  static buildEmpty(collection_id) {
    return new Reaction({
      collection_id: collection_id,
      type: 'reaction',
      name: 'New Reaction',
      status: "",
      description: "",
      timestamp_start: "",
      timestamp_stop: "",
      observation: "",
      purification: "",
      dangerous_products: "",
      tlc_solvents: "",
      rf_value: 0.00,
      temperature: "21.0°C",
      tlc_description: "",
      starting_materials: [],
      reactants: [],
      products: [],
      literatures: [],
      solvent: ''
    })
  }

  get temporary_sample_counter() {
    return this._temporary_sample_counter;
  }

  set temporary_sample_counter(count) {
    this._temporary_sample_counter = count;
  }

  get name() {
    return this._name;
  }

  set name(name) {
    this._name = name;
  }

  get temperature() {
    return this._temperature
  }

  set temperature(temperature) {
    this._temperature = temperature
  }

  get solvents() {
    return this._solvents
  }

  set solvents(solvents) {
    this._solvents = solvents
  }

  get starting_materials() {
    return this._starting_materials
  }

  set starting_materials(samples) {
    this._starting_materials = this._coerceToSamples(samples);
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
    return [...this.starting_materials, ...this.reactants, ...this.products]
  }

  static copyFromReactionAndCollectionId(reactionProxy, collection_id) {
    let reaction = reactionProxy.unwrap();
    const copy = reaction.buildCopy();
    copy.name = reaction.name + " Copy"
    copy.collection_id = collection_id;
    copy.starting_materials = reaction.starting_materials.map(sample => Sample.copyFromSampleAndCollectionId(sample, collection_id));
    copy.reactants = reaction.reactants.map(sample => Sample.copyFromSampleAndCollectionId(sample, collection_id));
    copy.products = reaction.products.map(sample => Sample.copyFromSampleAndCollectionId(sample, collection_id));

    return copy;
  }

  addMaterial(material, materialGroup) {
    const materials = this[materialGroup];
    if(this.sampleCount == 0) {
      this._setAsReferenceMaterial(material);
    } else {
      this._updateEquivalentForMaterial(material);
    }
    materials.push(material);
  }

  deleteMaterial(material, materialGroup) {
    const materials = this[materialGroup];
    const materialIndex = materials.indexOf(material);
    materials.splice(materialIndex, 1);
  }

  moveMaterial(material, previousMaterialGroup, materialGroup) {
    const materials = this[materialGroup];
    this.deleteMaterial(material, previousMaterialGroup);
    materials.push(material);
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
    sample.reference = 1;
  }

  _updateEquivalentForMaterial(sample) {
    if(this.referenceMaterial && this.referenceMaterial.amount_mmol) {
      sample.equivalent = sample.amount_mmol / this.referenceMaterial.amount_mmol;
    }
  }

  get svgPath() {
    return this.reaction_svg_file && `/images/reactions/${this.reaction_svg_file}`
  }

  hasMaterials() {
    return this.starting_materials.length > 0 || this.reactants.length > 0 || this.products.length > 0;
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
}
