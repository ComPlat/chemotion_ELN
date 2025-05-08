/* eslint-disable no-underscore-dangle */
/* eslint-disable camelcase */
import Sample from 'src/models/Sample';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

/**
 * Represents a Component in the mixture, extending Sample.
 */
export default class Component extends Sample {
  constructor(props) {
    super(props);
  }

  /**
   * @returns {boolean} True if density is given and starting molarity is not set.
   */
  get has_density() {
    return this.density > 0 && this.starting_molarity_value === 0;
  }

  /** @type {number} */
  get amount_mol() {
    return this._amount_mol;
  }

  /** @param {number} amount_mol */
  set amount_mol(amount_mol) {
    this._amount_mol = amount_mol;
  }

  /** @type {number} */
  get amount_g() {
    return this._amount_g;
  }

  /** @param {number} amount_g */
  set amount_g(amount_g) {
    this._amount_g = amount_g;
  }

  /** @type {number} */
  get amount_l() {
    return this._amount_l;
  }

  /** @param {number} amount_l */
  set amount_l(amount_l) {
    this._amount_l = amount_l;
  }

  /**
   * @returns {string} Path to the molecule SVG image, if available.
   */
  get svgPath() {
    return this.molecule && this.molecule.molecule_svg_file
      ? `/images/molecules/${this.molecule.molecule_svg_file}` : '';
  }

  /**
   * Volume/Mass related codes
   * Calculates volume for a liquid component based on density or starting concentration.
   * @param {number} purity - Purity factor (between 0 and 1).
   */
  calculateVolumeForLiquid(purity) {
    if (this.density && this.density > 0) { // if density is given
      this.calculateVolumeFromDensity(purity);
    } else if (this.starting_molarity_value && this.starting_molarity_value > 0) { // if stock concentration is given
      this.calculateVolumeFromConcentration();
    }
  }

  /**
   * Handles volume input changes and recalculates dependent values.
   * @param {Object} amount - Contains value and unit.
   * @param {number} totalVolume - Total volume of the mixture.
   * @param {Object} referenceComponent - Reference component for ratio calculations.
   */
  handleVolumeChange(amount, totalVolume, referenceComponent) {
    if (!amount.unit || Number.isNaN(amount.value)) return;

    this.setVolumeOrMass(amount);

    const purity = this.purity || 1.0;

    this.calculateAmount(purity);

    this.updateRatioFromReference(referenceComponent);

    if (totalVolume && totalVolume > 0) {
      this.calculateTargetConcentration(totalVolume);
    }
  }

  /**
   * Sets volume (liquid) or mass (solid) based on material group.
   * @param {{value: number}} amount
   */
  setVolumeOrMass(amount) {
    if (this.material_group === 'liquid') {
      this.amount_l = amount.value;
    } else if (this.material_group === 'solid') {
      this.amount_g = amount.value;
    }
  }

  // Volume related codes ends

  /**
   * Amount related codes
   * Calculates amount (mol) for a given total volume and purity.
   * @param {number} totalVolume
   * @param {number} purity
   */
  calculateAmount(purity) {
    if (this.material_group === 'liquid') {
      this.calculateAmountForLiquid(purity);
    } else if (this.material_group === 'solid') {
      this.calculateAmountFromMass(purity);
    }
  }

  /**
   * Calculates the amount (mol) for a liquid component based on either
   * its density or starting concentration (molarity), depending on availability.
   *
   * Prefers using density if it is defined and greater than 0.
   * Falls back to using starting molarity if density is not available.
   *
   * @param {number} purity - The purity of the component (as a decimal or percentage).
   */
  calculateAmountForLiquid(purity) {
    if (this.density && this.density > 0) {
      this.calculateAmountFromDensity(purity);
    } else if (this.starting_molarity_value && this.starting_molarity_value > 0) {
      this.calculateAmountFromConcentration(purity);
    }
  }

  /**
   * Handles molar amount change and recalculates dependent fields.
   * @param {{value: number, unit: string}} amount
   * @param {number} totalVolume
   * @param {Component} referenceComponent
   */
  handleAmountChange(amount, totalVolume, referenceComponent) {
    if (Number.isNaN(amount.value) || amount.unit !== 'mol') return;

    this.amount_mol = amount.value;

    const purity = this.purity || 1.0;

    if (this.material_group === 'liquid') {
      this.calculateVolumeForLiquid(purity);
    } else if (this.material_group === 'solid') {
      this.calculateMassFromAmount(purity);
    }

    this.updateRatioFromReference(referenceComponent);

    if (totalVolume && totalVolume > 0) {
      this.calculateTargetConcentration(totalVolume);
    }
  }

  /**
   * Target Conc. changes, mass is updated for Solid
   * Calculates mass from amount and purity.
   * @param {number} purity
   */
  calculateMassFromTargetConc(purity) {
    // mass_g = (amount_mol * molecular_weight) / purity
    this.amount_g = ((this.amount_mol ?? 0) * this.molecule_molecular_weight) / purity;
  }

  /**
   * Calculates mass or updates purity for solid based on lock flag.
   * @param {number} purity
   */
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

  /**
   * Stock related codes
   * Handles changes in concentration.
   * @param {{value: number, unit: string}} amount
   * @param {number} totalVolume
   * @param {string} concType - 'startingConc' or other
   * @param {boolean} lockColumn
   * @param {Object} referenceComponent
   */
  handleConcentrationChange(amount, totalVolume, concType, lockColumn, referenceComponent) {
    if (!amount.unit || Number.isNaN(amount.value) || amount.unit !== 'mol/l' || lockColumn) { return; }

    if (concType === 'startingConc') {
      this.handleStartingConcChange(amount);
    } else {
      this.handleTargetConcChange(amount, totalVolume, referenceComponent);
    }
  }

  /**
   * Sets the starting concentration and resets row.
   * @param {{value: number, unit: string}} amount
   */
  handleStartingConcChange(amount) {
    this.setStartingConc(amount);
    this.resetRowFields();
  }

  /**
   * Sets the target concentration and updates related fields.
   * @param {{value: number, unit: string}} amount
   * @param {number} totalVolume
   * @param {Component} referenceComponent
   */
  handleTargetConcChange(amount, totalVolume, referenceComponent) {
    this.setTargetConcentration(amount);
    this.handleTargetConcUpdates(totalVolume, referenceComponent);
  }

  /**
   * Sets the starting concentration and clears density.
   * @param {{value: number, unit: string}} amount
   */
  setStartingConc(amount) {
    this.starting_molarity_value = amount.value;
    this.starting_molarity_unit = amount.unit;
    this.density = 0;
  }

  /**
   * Sets the target concentration.
   * @param {{value: number, unit: string}} amount
   */
  setTargetConcentration(amount) {
    this.concn = amount.value;
    this.molarity_value = amount.value;
    this.molarity_unit = amount.unit;

    this.concentrationCheckWarning();
  }

  /**
   * Debounced warning if concentration exceeds stock concentration.
   */
  concentrationCheckWarning() {
    if (this._concentrationWarningTimeout) {
      clearTimeout(this._concentrationWarningTimeout);
    }
    this._concentrationWarningTimeout = setTimeout(() => {
      if (
        typeof this.concn === 'number'
        && typeof this.starting_molarity_value === 'number'
        && this.starting_molarity_value > 0
        && this.concn > this.starting_molarity_value
      ) {
        const concn_mmol = (this.concn * 1000).toFixed(2);
        const stock_mmol = (this.starting_molarity_value * 1000).toFixed(2);

        NotificationActions.add({
          title: 'Concentration Exceeds Stock',
          message: `Total concentration (${concn_mmol} mmol/l) exceeds stock concentration (${stock_mmol} mmol/l).`,
          level: 'warning',
          position: 'tr',
          autoDismiss: 5,
        });
      }
    }, 500); // 500ms debounce
  }

  /**
   * Resets common row fields.
   */
  resetRowFields() {
    this.amount_l = 0;
    this.amount_mol = 0;
    this.molarity_value = 0;
    this.equivalent = 1.0;
    this.purity = 1.0;
  }

  /**
   * Checks if the current component has a locked concentration.
   *
   * Retrieves the `lockedComponents` list from the `ComponentStore` state
   * and determines whether this component's ID (`this.id`) is included.
   *
   * @returns {boolean} `true` if the component's concentration is locked, otherwise `false`.
   */
  isComponentConcentrationLocked() {
    try {
      const { lockedComponents } = ComponentStore.getState() || { lockedComponents: [] };
      return lockedComponents.includes(this.id);
    } catch (error) {
      console.error('Error checking component lock state:', error);
      return false;
    }
  }

  /**
   * Calculates concentration based on amount and total volume.
   * @param {number} totalVolume
   */
  calculateTargetConcentration(totalVolume) {
    const lockedConcentration = this.isComponentConcentrationLocked();

    if (!lockedConcentration) {
      // totalConc_mol/l = amount_mol/totalVolume_l
      const concentration = totalVolume > 0 ? (this.amount_mol ?? 0) / totalVolume : 0;
      this.molarity_value = concentration;
      this.concn = concentration;
      this.molarity_unit = 'M';
    }
  }

  /**
   * Handles updates related to target concentration changes.
   * @param {number} totalVolume - The total volume of the mixture.
   * @param {Component} referenceComponent - The reference component for ratio-based calculations.
   */
  handleTargetConcUpdates(totalVolume, referenceComponent) {
    const purity = this.purity || 1.0;

    // Calculate Amount (mol): Both solid and liquid
    // amount_mol = TotalConc_(molL-1) * TotalVolume_L
    if (totalVolume > 0) {
      this.amount_mol = this.concn * totalVolume;
    } else {
      this.calculateAmount(purity);
    }

    // Calculate Volume (L): check code duplication
    if (this.material_group === 'liquid') {
      this.calculateVolumeForLiquid(purity);
    } else if (this.material_group === 'solid') {
      this.calculateMassFromTargetConc(purity);
    }

    this.updateRatioFromReference(referenceComponent);
  }

  /**
   * Handles changes in total volume and recalculates concentrations accordingly.
   * Total Volume changes -> total concentration changes -> amount changes ->volume changes
   * @param {number} totalVolume - The new total volume.
   */
  handleTotalVolumeChanges(totalVolume, referenceComponent) {
    const lockedConcentration = this.isComponentConcentrationLocked();

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

  /**
   * Handles changes to the density field.
   * @param {{ value: number, unit: string }} amount - The new density value.
   * @param {boolean} lockColumn - Whether the column is locked from editing.
   */
  handleDensityChange(amount, lockColumn) {
    if (!amount.unit || Number.isNaN(amount.value) || amount.unit !== 'g/ml' || lockColumn) return;

    this.setDensity(amount, lockColumn);

    this.resetRowFields();
  }

  /**
   * Sets the density value and resets starting molarity.
   * @param {{ value: number }} amount - The new density value.
   * @param {boolean} lockColumn - Whether the column is locked.
   */
  setDensity(amount, lockColumn) {
    if (!lockColumn) {
      this.density = amount.value;
      this.starting_molarity_value = 0;
    }
  }

  // Density related codes ends

  // Case 1.1: Calculate Amount from Volume, Density, Molecular Weight, and Purity

  /**
   * Calculates amount (mol) from volume (L), density (g/mL), molecular weight (g/mol), and purity.
   * @param {number} purity - The purity value.
   */
  calculateAmountFromDensity(purity) {
    this.starting_molarity_value = 0;

    this.amount_g = this.amount_l * this.density * 1000; // density -> g/mL. To convert it to g/L, we multiply by 1000
    this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;
  }

  // Case 1.2: Calculate Amount from Volume, Concentration, and Purity

  /**
   * Calculates amount (mol) from volume (L), concentration (mol/L), and purity.
   * @param {number} purity - The purity value.
   */
  calculateAmountFromConcentration(purity) {
    this.amount_mol = this.starting_molarity_value * this.amount_l * purity;
  }

  // Case 2.1: Calculate Volume from Amount, Density, Molecular Weight, and Purity

  /**
   * Calculates volume (L) from amount (mol), density (g/mL), molecular weight, and purity.
   * @param {number} purity - The purity value.
   */
  calculateVolumeFromDensity(purity) {
    this.starting_molarity_value = 0;
    this.amount_l = ((this.amount_mol ?? 0) * this.molecule_molecular_weight) / (this.density * 1000 * purity);
  }

  // Case 2.2: Calculate Volume from Amount and Concentration

  /**
   * Calculates volume (L) from amount (mol) and starting molarity.
   */
  calculateVolumeFromConcentration() {
    this.density = 0;
    this.amount_l = this.amount_mol / (this.starting_molarity_value);
  }

  // Case 4: Ratio changes

  /**
   * Updates the ratio and recalculates amount, mass/volume, and concentration.
   * @param {number} newRatio - New equivalent ratio.
   * @param {string} materialGroup - 'liquid' or 'solid'.
   * @param {number} totalVolume - Total mixture volume.
   * @param {number} referenceMoles - Amount in mol of reference component.
   */
  updateRatio(newRatio, materialGroup, totalVolume, referenceMoles) {
    if (this.equivalent === newRatio) { return; }

    const purity = this.purity || 1.0;

    // Calculate new amount based on ratio and reference moles
    // If reference moles is 0, set amount to 0
    // Amount (amount = amount of reference component * ratio)
    this.amount_mol = referenceMoles === 0 ? 0 : newRatio * referenceMoles;
    this.equivalent = newRatio;

    // Volume(Liquid)/Mass(Solid) Calculation
    if (materialGroup === 'liquid') {
      this.calculateVolumeForLiquid(purity);
    } else if (materialGroup === 'solid') {
      this.calculateMassFromAmount(purity);
    }

    // Total concentration calculation
    if (totalVolume && totalVolume > 0) {
      this.calculateTargetConcentration(totalVolume);
    }
  }

  // Case 1(Solids): Mass given -> Calculate Amount

  /**
   * Calculates amount (mol) from mass (g), molecular weight, and purity for solids.
   * @param {number} purity - The purity value.
   */
  calculateAmountFromMass = (purity) => {
    // Formula: amount [mol] = (mass[g] * purity) / molecularMass [g/mol]
    this.amount_mol = (this.amount_g * purity) / this.molecule_molecular_weight;
  };

  /**
   * Updates the equivalent ratio from the reference component.
   * @param {Component} referenceComponent - The reference component.
   */
  updateRatioFromReference(referenceComponent) {
    if (!referenceComponent) {
      this.equivalent = 1;
      return;
    }

    if (referenceComponent.id === this.id) {
      // If this is the reference component, set ratio to 1
      this.equivalent = 1;
      return;
    }

    const refAmountMol = referenceComponent.amount_mol ?? 0;
    const currentAmountMol = this.amount_mol ?? 0;

    // If either amount is 0 or NaN, set ratio to 0
    if (!refAmountMol || !currentAmountMol || Number.isNaN(refAmountMol) || Number.isNaN(currentAmountMol)) {
      this.equivalent = 0;
      return;
    }

    // Calculate ratio only if both amounts are valid numbers
    this.equivalent = currentAmountMol / refAmountMol;
  }

  /**
   * Sets the purity value and updates dependent fields.
   * @param {number} purity - The new purity value.
   * @param {number} totalVolume - Total mixture volume.
   * @param {Component} referenceComponent - Reference component for ratio.
   * @param {boolean} lockAmountColumnSolids - If true, amount column is locked for solids.
   * @param {string} materialGroup - 'liquid' or 'solid'.
   */
  setPurity(purity, totalVolume, referenceComponent, lockAmountColumnSolids, materialGroup) {
    if (!Number.isNaN(purity) && purity > 0 && purity <= 1) {
      const prevPurity = this.purity;

      this.purity = purity;

      this.handlePurityChanges(prevPurity, totalVolume, referenceComponent, lockAmountColumnSolids, materialGroup);
    }
  }

  /**
   * Handles updates after purity changes.
   * @param {number} prevPurity - Previous purity value.
   * @param {number} totalVolume - Total mixture volume.
   * @param {Component} referenceComponent - Reference component for ratio.
   * @param {boolean} lockAmountColumnSolids - Whether mass is locked for solids.
   * @param {string} materialGroup - 'liquid' or 'solid'.
   */
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

  /**
   * Updates the purity value based on current amount and mass.
   * Shows notification if calculated purity exceeds 1.
   */
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

  /**
   * Serializes the component into a plain object.
   * @returns {Object} Serialized component data.
   */
  serializeComponent() {
    return {
      id: this.id,
      name: this.name || this.molecule.iupac_name,
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

  /**
   * Creates a new component from sample data
   * @param {Object} sampleData - The sample data to create component from
   * @param {string} parentId - The parent sample ID
   * @param {string} materialGroup - The material group ('solid' or 'liquid')
   * @param {number} totalVolume - The total volume of the mixture
   * @returns {Component} The created component
   */
  static createFromSampleData(componentData, parentId, materialGroup, sample) {
    const { component_properties, ...rest } = componentData;
    const data = {
      ...rest,
      ...component_properties,
    };

    const component = new Component(data);
    component.parent_id = parentId;
    component.material_group = materialGroup;
    component.starting_molarity_value = data.molarity_value;
    component.molarity_value = 0;
    component.reference = false;
    component.id = `comp_${Math.random().toString(36).substr(2, 9)}`;

    if (materialGroup === 'solid') {
      component.setAmount({ value: component.amount_g, unit: 'g' }, sample.amount_l);
    } else if (materialGroup === 'liquid') {
      component.setAmount({ value: component.amount_l, unit: 'l' }, sample.amount_l);
    }

    return component;
  }

  /**
   * Construct a Component from API data, merging component_properties and other fields.
   * @param {Object} component
   * @returns {Component}
   */
  static deserializeData(component) {
    const { component_properties, ...rest } = component;
    const sampleData = { ...rest, ...component_properties };

    return new Component(sampleData);
  }
}
