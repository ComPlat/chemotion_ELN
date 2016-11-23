import _ from 'lodash';
import Element from './Element';
import Sample from './Sample';
import Literature from './Literature';

import UserStore from '../stores/UserStore';

const TemperatureUnit = ["°C", "°F", "K"]

export default class Reaction extends Element {
  static buildEmpty(collection_id) {
    let temperature_default = {
      "valueUnit": "°C",
      "userText": "",
      "data": []
    }

    let description_default = {
      "ops": [{ "insert": "" }]
    }

    let reaction = new Reaction({
      collection_id: collection_id,
      type: 'reaction',
      name: '',
      status: "",
      description: description_default,
      timestamp_start: "",
      timestamp_stop: "",
      duration: "",
      observation: "",
      purification: "",
      dangerous_products: "",
      tlc_solvents: "",
      rf_value: 0.00,
      temperature: temperature_default,
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
      let number = currentUser.reactions_count + 1;
      let prefix = currentUser.reaction_name_prefix;
      return `${currentUser.initials}-${prefix}${number}`;
    }
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

  get temperature() {
    return this._temperature
  }

  set temperature(temperature) {
    this._temperature = temperature
  }

  get description_contents() {
    return this.description.ops.map(s => s.insert).join()
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

    material = this.materialPolicy(material, null, materialGroup);
    materials.push(material);

    this.rebuildReference(material);
  }

  deleteMaterial(material, materialGroup) {
    const materials = this[materialGroup];
    const materialIndex = materials.indexOf(material);
    materials.splice(materialIndex, 1);

    this.rebuildReference(material);
  }

  moveMaterial(material, previousMaterialGroup, materialGroup) {
    const materials = this[materialGroup];
    this.deleteMaterial(material, previousMaterialGroup);
    material = this.materialPolicy(material, previousMaterialGroup, materialGroup);
    materials.push(material);

    this.rebuildReference(material);
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
    } else if (newGroup == "reactants" || newGroup == "solvents") {
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

    return material;
  }

  shortLabelPolicy(material, oldGroup, newGroup) {
    if (oldGroup) {
      // Save old short_label
      material[oldGroup + "_short_label"] = material.short_label;
      if (material[newGroup + "_short_label"]) {
        material.short_label = material[newGroup + "_short_label"];
        return 0;
      }

      if (newGroup == "products") {
        let savedStartingMaterial = oldGroup == "starting_materials" && !material.isNew
        if (!savedStartingMaterial) {
          material.short_label =
            Sample.buildNewShortLabel();
        }
      } else if (newGroup == "starting_materials") {
        if (material.split_label) {
          material.short_label = material.split_label;
        } else {
          material.short_label =
            Sample.buildNewShortLabel();
        }
      }
    } else {
      if (newGroup == "starting_materials") {
        if (material.split_label) material.short_label = material.split_label;
      } else if (newGroup == "products") {
        material.short_label =
          Sample.buildNewShortLabel();
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
    var cats = ['starting_materials', 'reactants', 'solvents', 'products'];
    for(let i = 0; i < cats.length; i++) {
      this['_' + cats[i]].map((sample, index) => {
        if(sample.id == material.id) {
          this['_' + cats[i]][index] = material;
        }
      })
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
}
