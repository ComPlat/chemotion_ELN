import Element from './Element';
import Sample from './Sample';
import Literature from './Literature';

import UserStore from '../stores/UserStore';

export default class Reaction extends Element {
  static buildEmpty(collection_id) {
    let reaction = new Reaction({
      collection_id: collection_id,
      type: 'reaction',
      name: '',
      status: "",
      description: "",
      timestamp_start: "",
      timestamp_stop: "",
      duration: "",
      observation: "",
      purification: "",
      dangerous_products: "",
      tlc_solvents: "",
      rf_value: 0.00,
      temperature: "21.0 °C",
      tlc_description: "",
      starting_materials: [],
      reactants: [],
      solvents: [],
      products: [],
      literatures: [],
      solvent: ''
    })

    reaction.short_label = this.buildReactionShortLabel()
    return reaction
  }

  static buildReactionShortLabel() {
    let {currentUser} = UserStore.getState()
    if(!currentUser) {
      return 'New Reaction';
    } else {
      return `${currentUser.initials}-R${currentUser.reactions_count + 1}`;
    }
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
      duration: this.duration,
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
      reaction_svg_file: this.reaction_svg_file,
      materials: {
        starting_materials: this.starting_materials.map(s=>s.serializeMaterial()),
        reactants: this.reactants.map(s=>s.serializeMaterial()),
        solvents: this.solvents.map(s=>s.serializeMaterial()),
        products: this.products.map(s=>s.serializeMaterial())
      },
      literatures: this.literatures.map(literature => literature.serialize())
    })
  }

  get temperature() {
    return this._temperature
  }

  set temperature(temperature) {
    this._temperature = temperature
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
    return [...this.starting_materials, ...this.reactants, ...this.solvents, ...this.products]
  }

  static copyFromReactionAndCollectionId(reaction, collection_id) {
    const copy = reaction.buildCopy();
    copy.name = reaction.name + " Copy"
    copy.collection_id = collection_id;
    copy.starting_materials = reaction.starting_materials.map(sample => Sample.copyFromSampleAndCollectionId(sample, collection_id));
    copy.reactants = reaction.reactants.map(sample => Sample.copyFromSampleAndCollectionId(sample, collection_id));
    copy.solvents = reaction.solvents.map(sample => Sample.copyFromSampleAndCollectionId(sample, collection_id));
    copy.products = reaction.products.map(sample => Sample.copyFromSampleAndCollectionId(sample, collection_id));

    return copy;
  }

  title() {
    const short_label = this.short_label ? this.short_label : ''
    return this.name ? `${short_label} ${this.name}` : short_label
  }

  addMaterial(material, materialGroup) {
    const materials = this[materialGroup];
    // do not set it as reference material if this is reaction product
    if(!this.referenceMaterial && materialGroup == 'starting_materials') {
      this._setAsReferenceMaterial(material);
    } else {
      this._updateEquivalentForMaterial(material);
    }

    if(materialGroup == "products") {
      material.amountType = 'real';

      // we don't want to copy loading from sample
      if(material.contains_residues) {
        material.loading = 0.0;
      }
    }

    materials.push(material);
    // Skip short_label for reactants and solvents
    if (materialGroup != "reactants" && materialGroup != "solvents")
      this.temporary_sample_counter += 1;
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
    if(this.referenceMaterial && this.referenceMaterial.amount_mol) {
      sample.equivalent = sample.amount_mol / this.referenceMaterial.amount_mol;
    }
  }

  get svgPath() {
    if(this.reaction_svg_file && this.reaction_svg_file != '***')
      return `/images/reactions/${this.reaction_svg_file}`
    else
      return `images/no_image_180.svg`
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
    return this.starting_materials.find((sample) => {
      return sample.id == sampleId
    }) || this.reactants.find((sample) => {
      return sample.id == sampleId
    }) || this.solvents.find((sample) => {
      return sample.id == sampleId
    }) || this.products.find((sample) => {
      return sample.id == sampleId
    });
  }

  hasPolymers() {
    return this.starting_materials.find((sample) => {
      return sample.contains_residues
    }) || this.reactants.find((sample) => {
      return sample.contains_residues
    }) || this.products.find((sample) => {
      return sample.contains_residues
    });
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
}
