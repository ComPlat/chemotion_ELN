/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import React from 'react';
import Sample from 'src/models/Sample';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

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

  // Volume/Mass related codes

  handleVolumeChange(amount, totalVolume, referenceComponent) {
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

    this.updateRatioFromReference(referenceComponent);

    if (totalVolume && totalVolume > 0) {
      this.calculateTargetConcentration(totalVolume);
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

  handleAmountChange(amount, totalVolume, referenceComponent) {
    if (Number.isNaN(amount.value) || amount.unit !== 'mol') return;

    this.amount_mol = amount.value;

    const purity = this.purity || 1.0;

    if (this.material_group === 'liquid') {
      if (this.density && this.density > 0) { // if density is given
        this.calculateVolumeFromDensity(purity);
      } else if (this.starting_molarity_value && this.starting_molarity_value > 0) { // if stock concentration is given
        this.calculateVolumeFromConcentration();
      }
    } else if (this.material_group === 'solid') {
      this.calculateMassFromAmount(purity);
    }

    this.updateRatioFromReference(referenceComponent);

    if (totalVolume && totalVolume > 0) {
      this.calculateTargetConcentration(totalVolume);
    }
  }

  // Target Conc. changes, mass is updated for Solid
  calculateMassFromTargetConc(purity) {
    // mass_g = (amount_mol * molecular_weight) / purity
    this.amount_g = ((this.amount_mol ?? 0) * this.molecule_molecular_weight) / purity;
  }

  calculateMassFromAmount(purity) {
    // mass_g = (amount_mol * molecular_weight) / purity
    const { lockAmountColumnSolids } = ComponentStore.getState();

    if (lockAmountColumnSolids) {
      this.updatePurityFromAmount();
    } else {
      this.amount_g = ((this.amount_mol ?? 0) * this.molecule_molecular_weight) / purity;
    }
  }

  // Amount related codes ends

  // Stock related codes

  handleConcentrationChange(amount, totalVolume, concType, lockColumn, referenceComponent) {
    if (!amount.unit || Number.isNaN(amount.value) || amount.unit !== 'mol/l' || lockColumn) { return; }

    if (concType === 'startingConc') {
      this.handleStartingConcChange(amount);
    } else {
      this.handleTargetConcChange(amount, totalVolume, referenceComponent);
    }
  }

  handleStartingConcChange(amount) {
    this.setStartingConc(amount);
    this.resetRowFields();
  }

  handleTargetConcChange(amount, totalVolume, referenceComponent) {
    this.setTargetConcentration(amount);
    this.handleTargetConcUpdates(totalVolume, referenceComponent);
  }

  setStartingConc(amount) {
    this.starting_molarity_value = amount.value;
    this.starting_molarity_unit = amount.unit;
    this.density = 0;
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
    this.purity = 1.0;
  }

  calculateTargetConcentration(totalVolume) {
    const { lockedComponents } = ComponentStore.getState();
    const lockedConcentration = lockedComponents.includes(this.id);

    if (!lockedConcentration) {
      // totalConc_mol/l = amount_mol/totalVolume_l
      const concentration = totalVolume > 0 ? (this.amount_mol ?? 0) / totalVolume : 0;
      this.molarity_value = concentration;
      this.concn = concentration;
      this.molarity_unit = 'M';
    }
  }

  handleTargetConcUpdates(totalVolume, referenceComponent) {
    const purity = this.purity || 1.0;

    // Calculate Amount (mol): Both solid and liquid
    // amount_mol = TotalConc_(molL-1) * TotalVolume_L
    this.amount_mol = this.concn * totalVolume;

    // Calculate Volume (L): check code duplication
    if (this.material_group === 'liquid') {
      if (this.density && this.density > 0) {
        this.calculateVolumeFromDensity(purity);
      } else if (this.starting_molarity_value && this.starting_molarity_value > 0) {
        this.calculateVolumeFromConcentration();
      }
    } else if (this.material_group === 'solid') {
      this.calculateMassFromTargetConc(purity);
    }

    this.updateRatioFromReference(referenceComponent);
  }

  // Total Volume changes -> total concentration changes -> amount changes ->volume changes
  handleTotalVolumeChanges(totalVolume, referenceComponent) {
    const { lockedComponents } = ComponentStore.getState();
    const lockedConcentration = lockedComponents.includes(this.id);

    if (lockedConcentration) {
      // Case 2: Total volume updated; Total Conc. is locked
      // Amount recalculated
      // Volume recalculated
      this.handleTargetConcUpdates(totalVolume, referenceComponent);
    } else {
      // Case 3: Total volume updated; Total Conc. is not locked
      // Recalculate the total conc. Amount, Volume stay the same
      this.calculateTargetConcentration(totalVolume);
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
      this.amount_g = this.amount_l * this.density * 1000; // density -> g/mL. To convert it to g/L, we multiply by 1000
      this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;
    }
  }

  // Case 1.2: Calculate Amount from Volume, Concentration, and Purity
  calculateAmountFromConcentration(totalVolume, purity) {
    this.amount_mol = this.starting_molarity_value * this.amount_l * purity;
  }

  // Case 2.1: Calculate Volume from Amount, Density, Molecular Weight, and Purity
  calculateVolumeFromDensity(purity) {
    this.starting_molarity_value = 0;
    this.amount_l = (this.amount_mol ?? 0) * this.molecule_molecular_weight / (this.density * 1000 * purity);
  }

  // Case 2.2: Calculate Volume from Amount and Concentration
  calculateVolumeFromConcentration() {
    this.density = 0;
    this.amount_l = this.amount_mol / (this.starting_molarity_value);
  }

  // Case 4: Ratio changes
  updateRatio(newRatio, materialGroup, totalVolume, referenceMoles) {
    if (this.equivalent === newRatio) { return; }

    const purity = this.purity || 1.0;
    this.amount_mol = newRatio * referenceMoles; // Amount (amount = amount of reference component * ratio)
    this.equivalent = newRatio;

    // Volume(Liquid)/Mass(Solid) Calculation (Calculated from the Amount)
    if (materialGroup === 'liquid') {
      if (!this.has_density) {
        this.calculateVolumeFromConcentration(purity);
      } else if (this.has_density) {
        this.calculateVolumeFromDensity(purity);
      }
    } else if (materialGroup === 'solid') {
      this.calculateMassFromAmount(purity);
    }

    // Total concentration (Calculated from Amount and Volume/Mass)
    this.calculateTargetConcentration(totalVolume);
  }

  // Case 1(Solids): Mass given -> Calculate Amount
  calculateAmountFromMass = (purity) => {
    // Formula: amount [mol] = (mass[g] * purity) / molecularMass [g/mol]
    this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;
  };

  updateRatioFromReference(referenceComponent) {
    if (referenceComponent && referenceComponent.id !== this.id) {
      // in case the current line is not the reference component
      const refAmountMol = referenceComponent.amount_mol ?? 0;

      if (refAmountMol > 0) {
        // ratio = amount_mol_current_component / amount_mol_ref_component
        this.equivalent = this.amount_mol / refAmountMol;
      } else {
        // when amount_mol for the reference component is 0, ratio of the current component = 0
        this.equivalent = 0;
      }
    } else {
      // If the current component is the reference, set the ratio to 1
      this.equivalent = 1;
    }
  }

  setPurity(purity, totalVolume, referenceComponent, lockAmountColumnSolids, materialGroup) {
    if (!Number.isNaN(purity) && purity > 0 && purity <= 1) {
      const prevPurity = this.purity;

      this.purity = purity;

      this.handlePurityChanges(prevPurity, totalVolume, referenceComponent, lockAmountColumnSolids, materialGroup);
    }
  }

  handlePurityChanges(prevPurity, totalVolume, referenceComponent, lockAmountColumnSolids, materialGroup) {
    if (materialGroup === 'liquid') {
      const previous_amount = this.amount_mol || 0;
      // amount_mol (corrected) = amount_mol (before correction) * purity(new)/purity(before correction)
      this.amount_mol = (previous_amount * this.purity) / prevPurity;
      this.updateRatioFromReference(referenceComponent);

      if (totalVolume && totalVolume > 0) {
        this.calculateTargetConcentration(totalVolume);
      }
    } else if (materialGroup === 'solid') {
      if (lockAmountColumnSolids) {
        // Amount [mol] = amount [g] * purity / molar mass [g/mol]
        this.amount_mol = (this.amount_g * this.purity) / this.molecule_molecular_weight;
        this.updateRatioFromReference(referenceComponent);

        if (totalVolume && totalVolume > 0) {
          this.calculateTargetConcentration(totalVolume);
        }
      } else {
        // mass is not locked
        // mass_g = (amount_mol * molecular_weight) / purity
        this.amount_g = ((this.amount_mol ?? 0) * this.molecule_molecular_weight) / this.purity;
      }
    }
  }

  updatePurityFromAmount() {
    // purity = amount_mol * (Molweight / mass_g)
    const purity = this.amount_mol * (this.molecule_molecular_weight / this.amount_g);

    if (purity <= 1) {
      this.purity = purity;
    } else {
      this.purity = 1;

      NotificationActions.add({
        message: `Your input makes the purity ${purity.toFixed(2)}. Purity value should be > 0 and <= 1.`,
        level: 'error'
      });
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
