/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import React from 'react';
import Sample from 'src/models/Sample';

export default class Component extends Sample {
  constructor(props) {
    super(props);
  }

  get has_density() {
    return this.density > 0 && this.starting_molarity_value === 0;
  }

  get amount_mol() {
    return this._amount_mol;
  }

  set amount_mol(amount_mol) {
    this._amount_mol = amount_mol;
  }

  get amount_g() {
    return this._amount_g;
  }

  set amount_g(amount_g) {
    return this._amount_g = amount_g;
  }

  get amount_l() {
    return this._amount_l;
  }

  set amount_l(amount_l) {
    return this._amount_l = amount_l;
  }

  get svgPath() {
    return this.molecule && this.molecule.molecule_svg_file
      ? `/images/molecules/${this.molecule.molecule_svg_file}` : '';
  }

  setAmount(amount, totalVolume) {
    if (!amount.unit || Number.isNaN(amount.value)) {
      return;
    }
    if (this.density && this.density > 0 && this.material_group !== 'solid') {
      this.calculateAmountFromDensity(amount, totalVolume);
    } else {
      this.calculateAmountFromConcentration(amount, totalVolume);
    }
  }

  // refactor this part
  setMol(amount, totalVolume) {
    if (Number.isNaN(amount.value) || amount.unit !== 'mol') return;

    this.amount_mol = amount.value;
    const purity = this.purity || 1.0;

    if (this.material_group === 'liquid') {
      if (this.density && this.density > 0) { // if density is given
        this.starting_molarity_value = 0;
        this.amount_l = (this.amount_mol * this.molecule_molecular_weight * purity) / (this.density * 1000);
      } else { // if stock concentration is given
        this.density = 0;
        this.amount_l = this.amount_mol / (this.starting_molarity_value * purity);
      }
      if (totalVolume && totalVolume > 0) {
        const concentration = this.amount_mol / (totalVolume * purity);
        this.molarity_value = concentration;
        this.concn = concentration;
        this.molarity_unit = 'M';
      }
    }
    if (this.material_group === 'solid') {
      // update concentrations
      if (this.amount_l === 0 || this.amount_g === 0) {
        this.molarity_value = 0;
        this.concn = 0;
      } else if (totalVolume && totalVolume > 0) {
        const concentration = this.amount_mol / (totalVolume * purity);

        this.concn = concentration;
        this.molarity_value = concentration;

        this.molarity_unit = 'M';
      }
    }
  }

  calculateAmountFromDensity(amount, totalVolume) {
    this.starting_molarity_value = 0;
    const purity = this.purity || 1.0;

    if (this.material_group === 'liquid') {
      this.amount_g = (this.amount_l * 1000) * this.density;
      this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;

      if (totalVolume && totalVolume > 0) {
        const concentration = this.amount_mol / (totalVolume * purity);
        this.molarity_value = concentration;
        this.concn = concentration;
      }
    }
  }

  calculateAmountFromDensity(amount, totalVolume) {
    this.amount_l = amount.value;
    this.starting_molarity_value = 0;
    const purity = this.purity || 1.0;
    if (this.material_group === 'liquid') {
      this.amount_g = (this.amount_l * 1000) * this.density;
      this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;

      const concentration = this.amount_mol / (totalVolume * purity);
      this.molarity_value = concentration;
      this.concn = concentration;
    }
  }

  setAmountConc(amount, totalVolume) {
    const purity = this.purity || 1.0;
    if (amount.unit === 'l') {
      this.amount_l = amount.value;
      if (this.starting_molarity_value) {
        this.amount_mol = this.starting_molarity_value * this.amount_l * purity;
      }

      const concentration = this.amount_mol / (totalVolume * purity);
      this.concn = concentration;
      this.molarity_value = concentration;
      this.molarity_unit = 'M';
    } else if (amount.unit === 'g') {
      this.amount_g = amount.value;
      this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;
      if (totalVolume) {
        this.molarity_value = this.concn = this.amount_mol / (totalVolume * purity);
        this.molarity_unit = 'M';
      }

      if (this.amount_l === 0 || this.amount_g === 0) {
        this.molarity_value = this.concn = 0;
      }
    }

    this.density = 0;
  }

  setConc(amount, totalVolume, concType, lockColumn) {
    if (!amount.unit || Number.isNaN(amount.value) || amount.unit !== 'mol/l') { return; }

    if (this.density && this.density > 0 && concType !== 'startingConc' && this.material_group !== 'solid') {
      this.setMolarityDensity(amount, totalVolume);
    } else {
      this.handleStockChange(amount, totalVolume, concType, lockColumn);
      // this.setMolarity(amount, totalVolume, concType, updateVolume);
    }
  }

  handleVolumeChange(amount, totalVolume) {
    if (!amount.unit || Number.isNaN(amount.value)) return;

    this.amount_l = amount.value;

    if (this.material_group === 'liquid') {
      if (this.density && this.density > 0) {
        this.calculateAmountFromDensity(amount, totalVolume);
      } else if (this.starting_molarity_value && this.starting_molarity_value > 0) {
        this.calculateAmountFromConcentration(amount, totalVolume);
      }
    }
  }

  handleStockChange(amount, totalVolume, concType, lockColumn) {
    const purity = this.purity || 1.0;

    this.setConcentration(amount, concType, lockColumn);

    if (this.amount_l && this.amount_l > 0) {
      this.calculateAmountFromConcentration(purity, totalVolume);
    } else if (this.amount_mol && this.amount_mol > 0) {
      this.calculateVolumeFromConcentration(purity);
    }

    if (totalVolume && totalVolume > 0) {
      const concentration = this.amount_mol / (totalVolume * purity);
      this.concn = concentration;
      this.molarity_value = concentration;
    }
  }

  setConcentration(amount, concType, lockColumn) {
    if (concType !== 'startingConc') {
      this.concn = amount.value;
      this.molarity_value = amount.value;
      this.molarity_unit = amount.unit;
    } else if (!lockColumn) {
      this.starting_molarity_value = amount.value;
      this.starting_molarity_unit = amount.unit;
    }
  }

  // Case 1.2: Calculate Amount from Volume, Concentration, and Purity
  calculateAmountFromConcentration(purity, totalVolume) {
    this.amount_mol = this.starting_molarity_value * this.amount_l * purity;

    if (totalVolume) {
      const concentration = this.amount_mol / (totalVolume * purity);
      this.concn = concentration;
      this.molarity_value = concentration;
      this.molarity_unit = 'M';
    }
  }

  // Case 2.2: Calculate Volume from Amount, Concentration, and Purity
  calculateVolumeFromConcentration(purity) {
    this.amount_l = this.amount_mol / (this.starting_molarity_value * purity);
  }

  setMolarityDensity(amount, totalVolume) {
    const purity = this.purity || 1.0;
    this.molarity_value = this.concn = amount.value;
    this.molarity_unit = amount.unit;
    this.starting_molarity_value = 0;

    this.amount_mol = this.molarity_value * totalVolume * purity;
    this.amount_g = (this.molecule_molecular_weight * this.amount_mol) / purity;
    this.amount_l = (this.amount_g / this.density) / 1000;
  }

  setMolarity(amount, totalVolume, concType, lockColumn) {
    const purity = this.purity || 1.0;
    if (concType !== 'startingConc') {
      this.concn = amount.value;
      this.molarity_value = amount.value;
      this.molarity_unit = amount.unit;
    } else if (!lockColumn) {
      this.starting_molarity_value = amount.value;
      this.starting_molarity_unit = amount.unit;
    }
    if (this.material_group === 'liquid' && lockColumn) {
      this.amount_mol = this.starting_molarity_value * this.amount_l * purity;
      this.concn = this.molarity_value = this.amount_mol / (totalVolume * purity);
    } else if (this.material_group === 'liquid' && !lockColumn) {
      this.amount_mol = this.molarity_value * totalVolume * purity;
      this.amount_l = this.amount_mol / (this.starting_molarity_value * purity);
    } else if (this.material_group === 'solid' && this.concn && totalVolume) {
      this.amount_mol = this.molarity_value * totalVolume * purity;
      this.amount_g = this.molecule_molecular_weight * (this.amount_mol / purity);
    } else if (this.concn === 0) {
      this.amount_g = 0;
      this.amount_l = 0;
    }

    this.density = 0;
  }

  setDensity(density, lockColumn, totalVolume) {
    // const purity = this.purity || 1.0;
    if (!density.unit || isNaN(density.value) || density.unit !== 'g/ml') { return; }

    this.density = density.value;
    this.starting_molarity_value = 0;

    // const concentration = (this.amount_mol / (totalVolume * purity)) || 0;

    // this.concn = concentration;
    // this.molarity_value = concentration;

    this.amount_g = 0;
    this.amount_l = 0;
    this.amount_mol = 0;

    // if (lockColumn) {
    //   this.amount_g = (this.amount_l * 1000) * this.density;
    //   this.amount_mol = this.amount_g * purity / this.molecule_molecular_weight;
    //   this.concn = this.molarity_value = this.amount_mol / (totalVolume * purity);
    // } else {
    //   this.amount_mol = this.molarity_value * totalVolume * purity;
    //   this.amount_g = this.amount_mol * this.molecule_molecular_weight / purity;
    //   this.amount_l = (this.amount_g / this.density) / 1000;
    // }
  }

  updateRatio(newRatio, materialGroup, totalVolume, referenceMoles) {
    if (this.equivalent === newRatio) { return; }

    const purity = this.purity || 1.0;
    this.amount_mol = newRatio * referenceMoles;
    this.equivalent = newRatio;

    if (materialGroup === 'liquid') {
      if (!this.has_density) {
        this.amount_l = this.amount_mol / (this.starting_molarity_value * purity);
        this.molarity_value = this.concn = this.amount_mol / (totalVolume * purity);
        this.molarity_unit = 'M';
      } else if (this.has_density) {
        this.amount_g = (this.amount_mol * this.molecule_molecular_weight) / purity;
        this.amount_l = this.amount_g / (this.density * 1000);
        this.molarity_value = this.concn = this.amount_mol / (totalVolume * purity);
        this.molarity_unit = 'M';
      }
    } else if (materialGroup === 'solid') {
      this.amount_g = (this.amount_mol * this.molecule_molecular_weight) / purity;
      this.molarity_value = this.concn = this.amount_mol / (totalVolume * purity);
    }
  }

  setPurity(purity, totalVolume) {
    if (!isNaN(purity) && purity >= 0 && purity <= 1) {
      this.purity = purity;
      this.amount_mol = this.molarity_value * totalVolume * this.purity;
    }
  }

  get svgPath() {
    return this.molecule && this.molecule.molecule_svg_file
      ? `/images/molecules/${this.molecule.molecule_svg_file}` : '';
  }

  serializeComponent() {
    return {
      id: this.id,
      name: this.name,
      position: this.position,
      component_properties: {
        amount_mol: this.amount_mol,
        amount_l: this.amount_l,
        amount_g: this.amount_g,
        density: this.density,
        molarity_unit: this.molarity_unit,
        molarity_value: this.molarity_value,
        starting_molarity_value: this.starting_molarity_value,
        starting_molarity_unit: this.starting_molarity_unit,
        molecule_id: this.molecule.id,
        equivalent: this.equivalent,
        parent_id: this.parent_id,
        material_group: this.material_group,
        reference: this.reference,
        purity: this.purity,
      }
    };
  }
}
