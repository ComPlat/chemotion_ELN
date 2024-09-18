/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import React from 'react';
import Sample from 'src/models/Sample';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';

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

  // Volume related codes

  handleVolumeChange(amount, totalVolume) {
    if (!amount.unit || Number.isNaN(amount.value)) return;

    this.setVolumeOrMass(amount);

    const purity = this.purity || 1.0;

    if (this.material_group === 'liquid') {
      if (this.density && this.density > 0) {
        this.calculateAmountFromDensity(totalVolume, purity);
      } else if (this.starting_molarity_value && this.starting_molarity_value > 0) {
        this.calculateAmountFromConcentration(totalVolume, purity);
      }
    } else if (this.material_group === 'solid') {
      this.calculateAmountFromMass(purity);
    }

    if (totalVolume && totalVolume > 0) {
      this.calculateTargetConcentration(totalVolume, purity);
    }
  }

  setVolumeOrMass(amount) {
    if (this.material_group === 'liquid') {
      this.amount_l = amount.value;
    } else if (this.material_group === 'solid') {
      this.amount_g = amount.value;
    }
  }

  // Volume related codes ends

  // Amount related codes

  handleAmountChange(amount, totalVolume) {
    if (Number.isNaN(amount.value) || amount.unit !== 'mol') return;

    this.amount_mol = amount.value;

    const purity = this.purity || 1.0;

    if (this.material_group === 'liquid') {
      if (this.density && this.density > 0) { // if density is given
        this.calculateVolumeFromDensity(purity);
      } else if (this.starting_molarity_value && this.starting_molarity_value > 0) { // if stock concentration is given
        this.calculateVolumeFromConcentration(purity);
      }
    } else if (this.material_group === 'solid') {
      this.calculateMassFromAmount(purity)
    }

    if (totalVolume && totalVolume > 0) {
      this.calculateTargetConcentration(totalVolume, purity);
    }
  }

  // Target Conc. changes, mass is updated for Solid
  calculateMassFromTargetConc(totalVolume, purity) {
    this.amount_g = ((this.concn ?? 0) * totalVolume * this.molecule_molecular_weight) / purity;
  }

  calculateMassFromAmount(purity) {
    this.amount_g = (this.amount_mol ?? 0) * this.molecule_molecular_weight / purity;
  }

  // Amount related codes ends

  // Stock related codes

  handleConcentrationChange(amount, totalVolume, concType, lockColumn) {
    if (!amount.unit || Number.isNaN(amount.value) || amount.unit !== 'mol/l' || lockColumn) { return; }

    if (concType === 'startingConc') {
      this.handleStartingConcChange(amount);
    } else {
      this.handleTargetConcChange(amount, totalVolume);
    }
  }

  handleStartingConcChange(amount) {
    this.setStartingConc(amount)
    this.resetRowFields();
  }

  handleTargetConcChange(amount, totalVolume) {
    this.setTargetConcentration(amount);

    this.handleTargetConcUpdates(totalVolume);
  }

  setStartingConc(amount) {
    this.starting_molarity_value = amount.value;
    this.starting_molarity_unit = amount.unit;
  }

  setTargetConcentration(amount) {
    this.concn = amount.value;
    this.molarity_value = amount.value;
    this.molarity_unit = amount.unit;
  }

  resetRowFields() {
    this.amount_l = 0;
    this.amount_mol = 0;
    this.molarity_value = 0;
    this.equivalent = 1.0;
    this.purity = 0;
  }

  calculateTargetConcentration(totalVolume, purity) {
    const { lockedComponentID } = ComponentStore.getState();
    const lockedConcentration = this.id === lockedComponentID;

    if (!lockedConcentration) {
      const concentration = (this.amount_mol ?? 0) / (totalVolume * purity);
      this.molarity_value = concentration;
      this.concn = concentration;
      this.molarity_unit = 'M';
    }
  }

  handleTargetConcUpdates(totalVolume) {
    if (totalVolume <= 0 || this.concn <= 0) { return; }

    const purity = this.purity || 1.0;

    // Calculate Amount (mol): Both solid and liquid
    this.amount_mol = this.concn * totalVolume * purity;

    // Calculate Volume (L): check code duplication
    if (this.material_group === 'liquid') {
      if (this.density && this.density > 0) {
        // if density is given and target conc. changes
        this.calculateVolumeFromDensityTargetConc(totalVolume, purity);
      } else if (this.starting_molarity_value && this.starting_molarity_value > 0) {
        // if stock concentration is given and target conc. changes
        this.calculateVolumeFromConcentrationTargetConc(totalVolume, purity);
      }
    } else if (this.material_group === 'solid') {
      this.calculateMassFromTargetConc(totalVolume, purity);
    }
  }

  // Total Volume changes -> total concentration changes -> amount changes ->volume changes
  handleTotalVolumeChanges(totalVolume) {
    const { lockedComponentID } = ComponentStore.getState();
    const lockedConcentration = this.id === lockedComponentID;

    const purity = this.purity || 1.0;

    if (lockedConcentration) {
      // Case 2: Total volume updated; Total Conc. is locked
      // Amount recalculated
      // Volume recalculated
      this.handleTargetConcUpdates(totalVolume);
    } else {
      // Case 3: Total volume updated; Total Conc. is not locked
      // Recalculate the total conc. Amount, Volume stay the same
      this.calculateTargetConcentration(totalVolume, purity);
    }
  }

  // Stock related codes ends

  // Density related codes

  handleDensityChange(amount, lockColumn) {
    if (!amount.unit || Number.isNaN(amount.value) || amount.unit !== 'g/ml' || lockColumn) return;

    this.setDensity(amount, lockColumn);

    this.resetRowFields();
  }

  setDensity(amount, lockColumn) {
    if (!lockColumn) {
      this.density = amount.value;
      this.starting_molarity_value = 0;
    }
  }

  // Density related codes ends

  // Case 1.1: Calculate Amount from Volume, Density, Molecular Weight, and Purity
  calculateAmountFromDensity(totalVolume, purity) {
    this.starting_molarity_value = 0;

    if (this.material_group === 'liquid') {
      this.amount_g = (this.amount_l * 1000) * this.density;
      this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;
    }
  }

  // Case 1.2: Calculate Amount from Volume, Concentration, and Purity
  calculateAmountFromConcentration(totalVolume, purity) {
    this.amount_mol = this.starting_molarity_value * this.amount_l * purity;

    if (totalVolume && totalVolume > 0) {
      this.calculateTargetConcentration(totalVolume, purity);
    }
  }



  // Case 2.1: Calculate Volume from Amount, Density, Molecular Weight, and Purity
  calculateVolumeFromDensity(purity) {
    this.starting_molarity_value = 0;
    this.amount_l = (this.amount_mol ?? 0) * this.molecule_molecular_weight * purity / (this.density * 1000);
  }

  // Calculate Volume from Target Concentration, Total Volume, Density, Molecular Weight, and Purity
  // volume of the component (L) = final conc (mol/L)* total volume (L) * purity * Molar mass (g/mol) / density (g/L)
  calculateVolumeFromDensityTargetConc(totalVolume, purity) {
    this.starting_molarity_value = 0;
    this.amount_l = (this.concn * totalVolume * purity * this.molecule_molecular_weight) / this.density;
  }

  // Case 2.2: Calculate Volume from Amount, Concentration, and Purity
  calculateVolumeFromConcentration(purity) {
    this.density = 0;
    this.amount_l = this.amount_mol / (this.starting_molarity_value * purity);
  }

  // Calculate Volume from Target Concentration, Starting Concentration, Total Volume and Purity
  // volume of component (L) = final conc (mol/L)*total volume (L) * purity/ stock concentration (mol/L)
  calculateVolumeFromConcentrationTargetConc(totalVolume, purity) {
    this.density = 0;
    this.amount_l = (this.concn * totalVolume * purity) / this.starting_molarity_value;
  }

  // Case 4: Ratio changes
  updateRatio(newRatio, materialGroup, totalVolume, referenceMoles) {
    if (this.equivalent === newRatio) { return; }

    const purity = this.purity || 1.0;
    this.amount_mol = newRatio * referenceMoles; // Amount (amount = amount of reference component * ratio)
    this.equivalent = newRatio;

    // Volume Calculation (Calculated from the Amount)
    if (materialGroup === 'liquid') {
      if (!this.has_density) {
        this.calculateVolumeFromConcentration(purity);
      } else if (this.has_density) {
        this.calculateVolumeFromDensity(purity);
      }
    } else if (materialGroup === 'solid') {
      this.calculateMassFromAmount(purity);
    }

    // Total concentration (Calculated from Amount and Volume)
    this.calculateTargetConcentration(totalVolume, purity);
  }

  // Case 1(Solids): Mass given -> Calculate Amount
  calculateAmountFromMass = (purity) => {
    // Formula: amount [mol] = (mass[g] * purity) / molecularMass [g/mol]
    this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;
  };

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
