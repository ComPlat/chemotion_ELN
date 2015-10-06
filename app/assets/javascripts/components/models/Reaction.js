import Sample from '../models/Sample';

export default class Reaction {

  constructor(args) {
    Object.assign(this, args);
  }

  get starting_materials() {
    return this._starting_materials
  }

  set starting_materials(samples) {
    this._starting_materials = samples.map(s => new Sample(s));
  }

  get reactants() {
    return this._reactants
  }

  set reactants(samples) {
    this._reactants = samples.map(s => new Sample(s))
  }

  get products() {
    return this._products
  }

  set products(samples) {
    this._products = samples.map(s => new Sample(s))
  }

  get samples() {
    return [...this.starting_materials, ...this.reactants, ...this.products]
  }

  sampleById(id) {

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

  markSampleAsReference(sampleID) {
    this.samples.forEach((sample) => {
      sample.reference = sample.id == sampleID;
    })
  }
}
