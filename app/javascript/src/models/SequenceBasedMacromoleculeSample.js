import Element from 'src/models/Element';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';
import { convertUnits, defaultUnits, conversionFactors } from 'src/components/staticDropdownOptions/units';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class SequenceBasedMacromoleculeSample extends Element {
  constructor(args) {
    let newArgs = args;
    if (!newArgs.is_new) {
      if (!newArgs._concentration_value) {
        newArgs._concentration_value = newArgs.concentration_value;
      }
      if (!newArgs._concentration_unit) {
        newArgs._concentration_unit = newArgs.concentration_unit;
      }
      if (!newArgs._concentration_rt_value) {
        newArgs._concentration_rt_value = newArgs.concentration_rt_value;
      }
      if (!newArgs._concentration_rt_unit) {
        newArgs._concentration_rt_unit = newArgs.concentration_rt_unit;
      }
      if (!newArgs._molarity_value) {
        newArgs._molarity_value = newArgs.molarity_value;
      }
      if (!newArgs._molarity_unit) {
        newArgs._molarity_unit = newArgs.molarity_unit;
      }
      if (newArgs._molarity_value && newArgs._base_molarity_value && !newArgs._base_molarity_value) {
        newArgs._base_molarity_value = convertUnits(newArgs.molarity_value, newArgs.molarity_unit, defaultUnits.molarity);
      }
      if (!newArgs._activity_value) {
        newArgs._activity_value = newArgs.activity_value;
      }
      if (!newArgs._activity_unit) {
        newArgs._activity_unit = newArgs.activity_unit;
      }
      if (newArgs._activity_value && newArgs._activity_unit && !newArgs._base_activity_value) {
        newArgs._base_activity_value = convertUnits(newArgs.activity_value, newArgs.activity_unit, defaultUnits.activity);
      }
      if (!newArgs._activity_per_mass_value) {
        newArgs._activity_per_mass_value = newArgs.activity_per_mass_value;
      }
      if (!newArgs._activity_per_mass_unit) {
        newArgs._activity_per_mass_unit = newArgs.activity_per_mass_unit;
      }
      if (newArgs._activity_per_mass_value && newArgs._activity_per_mass_unit && !newArgs._base_activity_per_mass_value) {
        newArgs._base_activity_per_mass_value =
          convertUnits(newArgs.activity_per_mass_value, newArgs.activity_per_mass_unit, defaultUnits.activity_per_mass);
      }
      if (!newArgs._activity_per_volume_value) {
        newArgs._activity_per_volume_value = newArgs.activity_per_volume_value;
      }
      if (!newArgs._activity_per_volume_unit) {
        newArgs._activity_per_volume_unit = newArgs.activity_per_volume_unit;
      }
      if (newArgs._activity_per_volume_value && newArgs._activity_per_volume_unit && !newArgs._base_activity_per_volume_value) {
        newArgs._base_activity_per_volume_value =
          convertUnits(newArgs.activity_per_volume_value, newArgs.activity_per_volume_unit, defaultUnits.activity_per_volume);
      }
      if (!newArgs._volume_as_used_value) {
        newArgs._volume_as_used_value = newArgs.volume_as_used_value;
      }
      if (!newArgs._volume_as_used_unit) {
        newArgs._volume_as_used_unit = newArgs.volume_as_used_unit;
      }
      if (newArgs._volume_as_used_value && newArgs._volume_as_used_unit && !newArgs._base_volume_as_used_value) {
        newArgs._base_volume_as_used_value =
          convertUnits(newArgs.volume_as_used_value, newArgs.volume_as_used_unit, defaultUnits.volume_as_used);
      }
      if (!newArgs._amount_as_used_mass_value) {
        newArgs._amount_as_used_mass_value = newArgs.amount_as_used_mass_value;
      }
      if (!newArgs._amount_as_used_mass_unit) {
        newArgs._amount_as_used_mass_unit = newArgs.amount_as_used_mass_unit;
      }
      if (newArgs._amount_as_used_mass_value && newArgs._amount_as_used_mass_unit && !newArgs._base_amount_as_used_mass_value) {
        newArgs._base_amount_as_used_mass_value =
          convertUnits(newArgs.amount_as_used_mass_value, newArgs.amount_as_used_mass_unit, defaultUnits.amount_as_used_mass);
      }
      if (!newArgs._amount_as_used_mol_value) {
        newArgs._amount_as_used_mol_value = newArgs.amount_as_used_mol_value;
      }
      if (!newArgs._amount_as_used_mol_unit) {
        newArgs._amount_as_used_mol_unit = newArgs.amount_as_used_mol_unit;
      }
      if (newArgs._amount_as_used_mol_value && newArgs._amount_as_used_mol_unit && !newArgs._base_amount_as_used_mol_value) {
        newArgs._base_amount_as_used_mol_value =
          convertUnits(newArgs.amount_as_used_mol_value, newArgs.amount_as_used_mol_unit, defaultUnits.amount_as_used_mol);
      }
    }
    if (newArgs.purity !== undefined && newArgs._purity === undefined) {
      newArgs._purity = newArgs.purity;
    }
    super(newArgs);
  }

  /**
   * Recalculates enzyme-related values depending on which field was updated.
   *
   * This method is only executed when `function_or_application` is set to `"enzyme"`.
   * Each input type triggers recalculation of the dependent enzyme values
   * according to standard enzyme activity formulas.
   *
   * Supported input types and their recalculations:
   *
   * - "volume_as_used":
   *      amount [mol]   = volume [L] * molarity [mol/L] * purity
   *      activity [U]   = volume [L] * activity_per_volume [U/L]
   *      mass [g]       = volume [L] * concentration [g/L] * purity
   *
   * - "activity":
   *      volume [L]     = activity [U] / activity_per_volume [U/L]
   *      mass [g]       = activity [U] / activity_per_mass [U/g]
   *      amount [mol]   = volume [L] * molarity [mol/L] * purity
   *
   * - "amount_as_used_mol":
   *      volume [L]     = amount [mol] / (molarity [mol/L] * purity)
   *      activity [U]   = volume [L] * activity_per_volume [U/L]
   *
   * - "amount_as_used_mass":
   *      volume [L]     = mass [g] / (concentration [g/L] * purity)
   *      activity [U]   = mass [g] * activity_per_mass [U/g]
   *
   * - "molarity":
   *      Recalculates amount if volume is available.
   *
   * - "activity_per_volume":
   *      Recalculates activity based on current volume.
   *
   * - "activity_per_mass":
   *      Recalculates activity based on mass.
   *
   * @param {string} type - The field that triggered the update.
   *                        Must be one of:
   *                        'volume_as_used',
   *                        'activity',
   *                        'amount_as_used_mol',
   *                        'amount_as_used_mass',
   *                        'molarity',
   *                        'activity_per_volume',
   *                        'activity_per_mass',
   *                        'purity',
   *                        'concentration'.
   *
   * @returns {void|null} Returns null if the object is not an enzyme.
   */

  /**
   * Sets the metric prefix for a given unit type.
   * Updates the appropriate unit field (mol, mass, or volume) with the new prefix,
   * automatically converting the value using the existing unit setter.
   *
   * @param {string} metricUnit - The base unit type ('mol', 'g', 'l')
   * @param {string} metricPrefix - The metric prefix ('m', 'µ', 'u', 'n', 'p', or '' for base unit)
   * @returns {void}
   */
  setUnitMetrics(metricUnit, metricPrefix) {
    if (!metricUnit) return;

    const unit = metricUnit.toLowerCase();
    const prefix = metricPrefix || '';

    if (unit === 'mol') {
      // Update mol unit with new prefix
      const newUnit = this.buildUnitWithPrefix('mol', prefix);
      // The setter will automatically convert the value
      this.amount_as_used_mol_unit = newUnit;
    } else if (unit === 'g') {
      // Update mass unit with new prefix
      const newUnit = this.buildUnitWithPrefix('g', prefix);
      // The setter will automatically convert the value
      this.amount_as_used_mass_unit = newUnit;
    } else if (unit === 'l') {
      // Update volume unit with new prefix
      const newUnit = this.buildUnitWithPrefix('L', prefix);
      // The setter will automatically convert the value
      this.volume_as_used_unit = newUnit;
    }
  }

  /**
   * Builds a unit string with the given metric prefix.
   *
   * @param {string} baseUnit - The base unit ('mol', 'g', 'L')
   * @param {string} prefix - The metric prefix ('m', 'µ', 'u', 'n', 'p', or '' for base unit)
   * @returns {string} The unit string with prefix (e.g., 'mmol', 'µg', 'mL')
   */
  buildUnitWithPrefix(baseUnit, prefix) {
    if (!prefix || prefix === '') return baseUnit;

    // Map prefix to unit prefix character
    const prefixMap = {
      'm': 'm',      // milli
      'n': 'n',      // nano
      'u': 'µ',      // micro (use µ symbol)
      'µ': 'µ',      // micro
      'p': 'p',      // pico
    };

    const prefixChar = prefixMap[prefix] || prefix;
    return `${prefixChar}${baseUnit}`;
  }

  calculateValues(type) {
    if (this.function_or_application !== 'enzyme') return null;

    switch (type) {
      case 'volume_as_used':
        if (this.base_volume_as_used_value > 0) {
          this.calculateAmountAsUsed();
          this.calculateActivity();
          this.calculateAmountAsUsedMass();
        }
        break;

      case 'activity':
        if (this._base_activity_value > 0) {
          this.calculateVolumeFromActivity();
          this.calculateMassFromActivity();
          this.calculateAmountMolFromActivity();
        }
        break;

      case 'amount_as_used_mol':
        if (this.base_amount_as_used_mol_value > 0) {
          this.calculateVolumeByAmount();
          this.calculateActivity();
        }
        break;

      case 'amount_as_used_mass':
        if (this.base_amount_as_used_mass_value > 0) {
          this.calculateVolumeByMass();
          this.calculateActivityByMass();
        }
        break;

      case 'molarity':
        if (this.base_molarity_value > 0) {
          this.calculateAmountAsUsed();
        }
        break;

      case 'activity_per_volume':
        if (this.base_activity_per_volume_value > 0) {
          this.calculateActivity();
        }
        break;

      case 'activity_per_mass':
        if (this.base_activity_per_mass_value > 0) {
          this.calculateActivityByMass();
        }
        break;

      case 'purity':
        if (this.purity > 0) {
          // Recalculate volume from mass: amount_l = amount_g / (concentration × purity)
          this.calculateVolumeByMass();
          // Recalculate amount_mol from volume: amount_mol = amount_l * molarity * purity
          this.calculateAmountAsUsed();
          // Recalculate amount_g from volume: amount_g = amount_l * (concentration × purity)
          this.calculateAmountAsUsedMass();
        }
        break;

      case 'concentration':
        if (this.concentration_value > 0) {
          // Recalculate volume from mass first: amount_l = amount_g / concentration
          // This ensures volume is available for subsequent calculations
          this.calculateVolumeByMass();
          // Then recalculate amount_g from volume: amount_g = amount_l * concentration * purity
          this.calculateAmountAsUsedMass();
        }
        break;

      default:
        break;
    }
  }

  calculateVolumeFromActivity() {
    // Case 1: Calculate volume from activity
    if (this.base_activity_per_volume_value > 0) {
      // Priority 1: Calculate volume from activity if activity_per_volume is given
      this.calculateVolumeByActivity();
    } else if (this.concentration_value > 0) {
      // Priority 2: Calculate volume from mass/concentration if concentration is given
      // and activity_per_volume is not given
      this.calculateVolumeByMass();
    }
  }

  calculateMassFromActivity() {
    // Case 2: Calculate amount_g from activity
    if (this.base_activity_per_mass_value > 0) {
      // Priority 1: Calculate mass from activity if activity_per_mass is given
      this.calculateMassByActivity();
    } else if (this.concentration_value > 0) {
      // Priority 2: Calculate mass from volume/concentration if concentration is given
      // and activity_per_mass is not given
      this.calculateAmountAsUsedMass();
    }
  }

  calculateAmountMolFromActivity() {
    // Case 3: Calculate amount_mol from activity
    this.calculateAmountAsUsed();
  }

  calculateActivity() {
    if (this.base_activity_per_volume_value === 0 || this.base_volume_as_used_value === 0) { return null; }

    this._activity_value = convertUnits(
      parseFloat((this.base_volume_as_used_value * this.base_activity_per_volume_value).toFixed(8)),
      defaultUnits.activity,
      this.activity_unit
    );
    this._base_activity_value =
      convertUnits(this._activity_value, this.activity_unit, defaultUnits.activity);
  }

  calculateActivityByMass() {
    if (this.base_activity_per_mass_value === 0 || this.base_amount_as_used_mass_value === 0) { return null; }

    this._activity_value = convertUnits(
      parseFloat((this.base_amount_as_used_mass_value * this.base_activity_per_mass_value).toFixed(8)),
      defaultUnits.activity,
      this.activity_unit
    );
    this._base_activity_value =
      convertUnits(this._activity_value, this.activity_unit, defaultUnits.activity);
  }

  calculateMassByActivity() {
    if (this.base_activity_value === 0 || this.base_activity_per_mass_value === 0) {
      return null;
    }

    // Calculate: mass = activity / activity_per_mass
    const massValue = this.base_activity_value / this.base_activity_per_mass_value;

    this._amount_as_used_mass_value = convertUnits(
      parseFloat(massValue.toFixed(8)),
      defaultUnits.amount_as_used_mass,
      this.amount_as_used_mass_unit
    );
    this._base_amount_as_used_mass_value =
      convertUnits(this._amount_as_used_mass_value, this.amount_as_used_mass_unit, defaultUnits.amount_as_used_mass);
  }

  calculateAmountAsUsed() {
    if (this.base_volume_as_used_value === 0 || this.base_molarity_value === 0) {
      return null;
    }

    // Purity is always stored as decimal (0.5 for 50%)
    const purity = this.purity > 0 ? this.purity : 1.0;

    this._amount_as_used_mol_value = convertUnits(
      parseFloat((this.base_volume_as_used_value * this.base_molarity_value * purity).toFixed(8)),
      defaultUnits.amount_as_used_mol,
      this.amount_as_used_mol_unit
    );
    this._base_amount_as_used_mol_value =
      convertUnits(this._amount_as_used_mol_value, this.amount_as_used_mol_unit, defaultUnits.amount_as_used_mol);
  }

  /**
   * Gets the concentration value for calculations, using purity-adjusted concentration if available,
   * otherwise falling back to the base concentration_value.
   *
   * @returns {number} The concentration value to use in calculations.
   */
  getConcentrationValue() {
    const concentrationByPurity = parseFloat(this.concentration_by_purity);
    return !Number.isNaN(concentrationByPurity) && concentrationByPurity > 0
      ? concentrationByPurity
      : this.concentration_value;
  }

  /**
   * Calculates concentration (RT) for reaction scheme: concentration_rt = amount_mol / amount_l
   * Recalculated when amount_as_used_mol_value or volume_as_used_value changes.
   */
  calculateConcentrationRt() {
    const amountMol = this.base_amount_as_used_mol_value;
    const volumeL = this.base_volume_as_used_value;

    // Calculate concentration (RT) = amount_mol / amount_l
    // Only calculate if volume is greater than 0 and amount is a valid number

    if (!Number.isFinite(amountMol) || !Number.isFinite(volumeL) || volumeL <= 0) {
      this._concentration_rt_value = null;
      return;
    }

    // Calculate concentration in base units (mol/L)
    const concentrationValue = amountMol / volumeL;

    // Round to 8 decimal places
    this._concentration_rt_value = Number(concentrationValue.toFixed(8));

    // Ensure unit is set
    this._concentration_rt_unit ??= 'mol/L';
  }

  calculateAmountAsUsedMass() {
    if (this.base_volume_as_used_value === 0 || this.concentration_value === 0) {
      return null;
    }

    // Calculate: mass = volume × concentration_by_purity
    // Use purity-adjusted concentration if available, otherwise fall back to concentration_value
    const concentrationValue = this.getConcentrationValue();
    const concentrationInGPerL = convertUnits(
      concentrationValue,
      this.concentration_unit,
      'g/L'
    );

    const massValue = this.base_volume_as_used_value * concentrationInGPerL;

    this._amount_as_used_mass_value = convertUnits(
      parseFloat(massValue.toFixed(8)),
      defaultUnits.amount_as_used_mass,
      this.amount_as_used_mass_unit
    );
    this._base_amount_as_used_mass_value =
      convertUnits(this._amount_as_used_mass_value, this.amount_as_used_mass_unit, defaultUnits.amount_as_used_mass);
  }

  calculateVolumeByMass() {
    if (this.base_amount_as_used_mass_value === 0 || this.concentration_value === 0) {
      return null;
    }

    // Calculate: volume = mass / concentration_by_purity
    // Use purity-adjusted concentration if available, otherwise fall back to concentration_value
    const concentrationValue = this.getConcentrationValue();
    const concentrationInGPerL = convertUnits(
      concentrationValue,
      this.concentration_unit,
      'g/L'
    );

    const volumeValue = this.base_amount_as_used_mass_value / concentrationInGPerL;

    this._volume_as_used_value = convertUnits(
      parseFloat(volumeValue.toFixed(8)),
      defaultUnits.volume_as_used,
      this.volume_as_used_unit
    );
    this._base_volume_as_used_value =
      convertUnits(this._volume_as_used_value, this.volume_as_used_unit, defaultUnits.volume_as_used);
  }

  calculateVolumeByActivity() {
    if (this.base_activity_per_volume_value === 0 || this.base_activity_value === 0) { return null; }

    this._volume_as_used_value = convertUnits(
      parseFloat((this.base_activity_value / this.base_activity_per_volume_value).toFixed(8)),
      defaultUnits.volume_as_used,
      this.volume_as_used_unit
    );
    this._base_volume_as_used_value =
      convertUnits(this._volume_as_used_value, this.volume_as_used_unit, defaultUnits.volume_as_used);
  }

  calculateVolumeByAmount() {
    if (this.base_molarity_value === 0 || this.base_amount_as_used_mol_value === 0) { return null; }

    // Purity is always stored as decimal (0.5 for 50%)
    const purity = this.purity > 0 ? this.purity : 1.0;

    this._volume_as_used_value = convertUnits(
      parseFloat((this.base_amount_as_used_mol_value / (this.base_molarity_value * purity)).toFixed(8)),
      defaultUnits.volume_as_used,
      this.volume_as_used_unit
    );
    this._base_volume_as_used_value =
      convertUnits(this._volume_as_used_value, this.volume_as_used_unit, defaultUnits.volume_as_used);
  }

  get activity_value() {
    return this._activity_value;
  }

  set activity_value(value) {
    this._activity_value = value;
    this._base_activity_value = convertUnits(this.activity_value, this.activity_unit, defaultUnits.activity);
    this.calculateValues('activity');
  }

  get base_activity_value() {
    return this._base_activity_value || 0;
  }

  set base_activity_value(value) {
    this._base_activity_value = value;
  }

  get activity_unit() {
    return this._activity_unit || defaultUnits.activity;
  }

  set activity_unit(value) {
    this._activity_value = convertUnits(this.activity_value, this.activity_unit, value);
    this._activity_unit = value;
  }

  get amount_as_used_mol_value() {
    return this._amount_as_used_mol_value;
  }

  set amount_as_used_mol_value(value) {
    this._amount_as_used_mol_value = value;
    this._base_amount_as_used_mol_value =
      convertUnits(this.amount_as_used_mol_value, this.amount_as_used_mol_unit, defaultUnits.amount_as_used_mol);

    if (this.amount_as_used_mass_value !== undefined && value) {
      this._amount_as_used_mass_value = '';
      this._base_amount_as_used_mass_value = 0;
    }

    this.calculateValues('amount_as_used_mol');
    this.calculateConcentrationRt();
  }

  get base_amount_as_used_mol_value() {
    return this._base_amount_as_used_mol_value || 0;
  }

  set base_amount_as_used_mol_value(value) {
    this._base_amount_as_used_mol_value = value;
  }

  get amount_as_used_mol_unit() {
    return this._amount_as_used_mol_unit || defaultUnits.amount_as_used_mol;
  }

  set amount_as_used_mol_unit(value) {
    const currentUnit = this.amount_as_used_mol_unit;
    // Only convert if both units are valid and different
    if (currentUnit && value && currentUnit !== value && conversionFactors[currentUnit] && conversionFactors[value]) {
      this._amount_as_used_mol_value = convertUnits(this.amount_as_used_mol_value, currentUnit, value);
    }
    this._amount_as_used_mol_unit = value;
  }

  get amount_as_used_mass_value() {
    return this._amount_as_used_mass_value;
  }

  set amount_as_used_mass_value(value) {
    this._amount_as_used_mass_value = value;
    this._base_amount_as_used_mass_value =
      convertUnits(this.amount_as_used_mass_value, this.amount_as_used_mass_unit, defaultUnits.amount_as_used_mass);

    if (this.amount_as_used_mol_value !== undefined && value) {
      this._amount_as_used_mol_value = '';
      this._base_amount_as_used_mol_value = 0;
    }

    this.calculateValues('amount_as_used_mass');
  }

  get base_amount_as_used_mass_value() {
    return this._base_amount_as_used_mass_value || 0;
  }

  set base_amount_as_used_mass_value(value) {
    this._base_amount_as_used_mass_value = value;
  }

  get amount_as_used_mass_unit() {
    return this._amount_as_used_mass_unit || defaultUnits.amount_as_used_mass;
  }

  set amount_as_used_mass_unit(value) {
    const currentUnit = this.amount_as_used_mass_unit;
    // Only convert if both units are valid and different
    if (currentUnit && value && currentUnit !== value && conversionFactors[currentUnit] && conversionFactors[value]) {
      this._amount_as_used_mass_value = convertUnits(this.amount_as_used_mass_value, currentUnit, value);
    }
    this._amount_as_used_mass_unit = value;
  }

  get concentration_value() {
    return this._concentration_value;
  }

  set concentration_value(value) {
    this._concentration_value = value;
    this.calculateValues('concentration');
  }

  get concentration_unit() {
    return this._concentration_unit || defaultUnits.concentration;
  }

  set concentration_unit(value) {
    this._concentration_value = convertUnits(this.concentration_value, this.concentration_unit, value);
    this._concentration_unit = value;
  }

  get concentration_rt_value() {
    return this._concentration_rt_value;
  }

  set concentration_rt_value(value) {
    this._concentration_rt_value = value;
  }

  get concentration_rt_unit() {
    return this._concentration_rt_unit || 'mol/L';
  }

  set concentration_rt_unit(value) {
    this._concentration_rt_value = convertUnits(this.concentration_rt_value, this.concentration_rt_unit, value);
    this._concentration_rt_unit = value;
  }

  get function_or_application() {
    return this._function_or_application;
  }

  set function_or_application(value) {
    this._function_or_application = value;
  }

  get molarity_value() {
    return this._molarity_value;
  }

  set molarity_value(value) {
    this._molarity_value = value;
    this._base_molarity_value = convertUnits(this.molarity_value, this.molarity_unit, defaultUnits.molarity);
    this.calculateValues('molarity');
  }

  get base_molarity_value() {
    return this._base_molarity_value || 0;
  }

  set base_molarity_value(value) {
    this._base_molarity_value = value;
  }

  get molarity_unit() {
    return this._molarity_unit || defaultUnits.molarity;
  }

  set molarity_unit(value) {
    this._molarity_value = convertUnits(this.molarity_value, this.molarity_unit, value);
    this._molarity_unit = value;
  }

  get activity_per_volume_value() {
    return this._activity_per_volume_value;
  }

  set activity_per_volume_value(value) {
    this._activity_per_volume_value = value;
    this._base_activity_per_volume_value =
      convertUnits(this.activity_per_volume_value, this.activity_per_volume_unit, defaultUnits.activity_per_volume);

    if (this.activity_per_mass_value !== undefined && value) {
      this._activity_per_mass_value = '';
      this._base_activity_per_mass_value = 0;
    }
    this.calculateValues('activity_per_volume');
  }

  get base_activity_per_volume_value() {
    return this._base_activity_per_volume_value || 0;
  }

  set base_activity_per_volume_value(value) {
    this._base_activity_per_volume_value = value;
  }

  get activity_per_volume_unit() {
    return this._activity_per_volume_unit || defaultUnits.activity_per_volume;
  }

  set activity_per_volume_unit(value) {
    this._activity_per_volume_value = convertUnits(this.activity_per_volume_value, this.activity_per_volume_unit, value);
    this._activity_per_volume_unit = value;
  }

  get activity_per_mass_value() {
    return this._activity_per_mass_value;
  }

  set activity_per_mass_value(value) {
    this._activity_per_mass_value = value;
    this._base_activity_per_mass_value =
      convertUnits(this.activity_per_mass_value, this.activity_per_mass_unit, defaultUnits.activity_per_mass);

    if (this.activity_per_volume_value !== undefined && value) {
      this._activity_per_volume_value = '';
      this._base_activity_per_volume_value = 0;
    }

    this.calculateValues('activity_per_mass');
  }

  get base_activity_per_mass_value() {
    return this._base_activity_per_mass_value || 0;
  }

  set base_activity_per_mass_value(value) {
    this._base_activity_per_mass_value = value;
  }

  get activity_per_mass_unit() {
    return this._activity_per_mass_unit || defaultUnits.activity_per_mass;
  }

  set activity_per_mass_unit(value) {
    this._activity_per_mass_value = convertUnits(this.activity_per_mass_value, this.activity_per_mass_unit, value);
    this._activity_per_mass_unit = value;
  }

  get volume_as_used_value() {
    return this._volume_as_used_value;
  }

  set volume_as_used_value(value) {
    this._volume_as_used_value = value;
    this._base_volume_as_used_value =
      convertUnits(this.volume_as_used_value, this.volume_as_used_unit, defaultUnits.volume_as_used);
    this.calculateValues('volume_as_used');
    this.calculateConcentrationRt();
  }

  get base_volume_as_used_value() {
    return this._base_volume_as_used_value || 0;
  }

  set base_volume_as_used_value(value) {
    this._base_volume_as_used_value = value;
  }

  get volume_as_used_unit() {
    return this._volume_as_used_unit || defaultUnits.volume_as_used;
  }

  set volume_as_used_unit(value) {
    const currentUnit = this.volume_as_used_unit;
    // Only convert if both units are valid and different
    if (currentUnit && value && currentUnit !== value && conversionFactors[currentUnit] && conversionFactors[value]) {
      this._volume_as_used_value = convertUnits(this.volume_as_used_value, currentUnit, value);
    }
    this._volume_as_used_unit = value;
  }

  get purity() {
    return this._purity;
  }

  validateAndSetPurity(value) {
    // Validate purity value and show warning if invalid
    if (value != null && (value < 0 || value > 1)) {
      NotificationActions.add({
        message: 'Purity value should be >= 0 and <=1',
        level: 'error'
      });
      // Set to 1 if invalid
      return 1;
    }
    return value;
  }

  set purity(value) {
    this._purity = this.validateAndSetPurity(value);
    this.calculateValues('purity');
  }

  get concentration_by_purity() {
    return this.concentration_value && this.purity
      ? parseFloat((this.concentration_value * this.purity).toFixed(8))
      : '';
  }

  get molarity_by_purity() {
    return this.molarity_value && this.purity
      ? parseFloat((this.molarity_value * this.purity).toFixed(8))
      : '';
  }

  get activity_per_mass_by_purity() {
    return this.activity_per_mass_value && this.purity
      ? parseFloat((this.activity_per_mass_value * this.purity).toFixed(8))
      : '';
  }

  /**
   * Getter for amount_g (mass in grams).
   * Maps from amount_as_used_mass_value, converting to base unit (g) if needed.
   * @returns {number|null} Mass in grams, or null if not set
   */
  get amount_g() {
    if (this.base_amount_as_used_mass_value == null) {
      return null;
    }
    // base_amount_as_used_mass_value is already in base unit (g)
    return this.base_amount_as_used_mass_value;
  }

  /**
   * Getter for amount_l (volume in liters).
   * Maps from volume_as_used_value, converting to base unit (L) if needed.
   * @returns {number|null} Volume in liters, or null if not set
   */
  get amount_l() {
    if (this.base_volume_as_used_value == null) {
      return null;
    }
    // base_volume_as_used_value is already in base unit (L)
    return this.base_volume_as_used_value;
  }

  /**
   * Getter for amount_mol (amount in moles).
   * Maps from amount_as_used_mol_value, converting to base unit (mol) if needed.
   * @returns {number|null} Amount in moles, or null if not set
   */
  get amount_mol() {
    if (this.base_amount_as_used_mol_value == null) {
      return null;
    }
    // base_amount_as_used_mol_value is already in base unit (mol)
    return this.base_amount_as_used_mol_value;
  }

  /**
   * Sets the "amount as used" on the sample based on the provided unit.
   *
   * The method detects whether the given unit represents:
   * - mass (g, mg, µg, ng)
   * - volume (l, ml, µl, nl)
   * - amount of substance (mol, mmol, µmol, nmol, pmol)
   *
   * Based on the detected category, it updates the corresponding
   * internal value/unit pair and sets `_amount_unit` to the base unit
   * (`g`, `l`, or `mol`).
   *
   * If the unit is not recognized, the amount is treated as mass by default.
   *
   * @param {Object} amount - Amount descriptor.
   * @param {number} amount.value - Numeric value of the amount.
   * @param {string} amount.unit - Unit of the amount (e.g. `mg`, `ml`, `mmol`).
   *
   * @returns {void}
   */
  setAmount(amount) {
    if (!amount || !amount.unit || Number.isNaN(amount.value)) return;

    const massUnits = new Set(['g', 'mg', 'µg', 'ng']);
    const volumeUnits = new Set(['l', 'ml', 'µl', 'nl']);
    const molUnits = new Set(['mol', 'mmol', 'µmol', 'nmol', 'pmol']);

    if (massUnits.has(amount.unit)) {
      this.amount_as_used_mass_value = amount.value;
      this.amount_as_used_mass_unit = amount.unit;
      this._amount_unit = 'g';
      return;
    }

    if (volumeUnits.has(amount.unit)) {
      this.volume_as_used_value = amount.value;
      this.volume_as_used_unit = amount.unit;
      this._amount_unit = 'l';
      return;
    }

    if (molUnits.has(amount.unit)) {
      this.amount_as_used_mol_value = amount.value;
      this.amount_as_used_mol_unit = amount.unit;
      this._amount_unit = 'mol';
      return;
    }

    // fallback
    this.amount_as_used_mass_value = amount.value;
    this.amount_as_used_mass_unit = amount.unit || 'g';
    this._amount_unit = 'g';
  }

  /**
   * Sets the amount and normalizes to grams.
   * Converts any unit to grams and updates amount_as_used_mass_value.
   * @param {Object} amount - The amount object containing value and unit
   * @param {number} amount.value - The numeric value of the amount
   * @param {string} amount.unit - The unit of measurement
   */
  setAmountAndNormalizeToGram(amount) {
    if (!amount || !amount.unit || Number.isNaN(amount.value)) return;

    // Convert to grams using convertUnits
    const valueInGrams = convertUnits(
      amount.value,
      amount.unit,
      'g'
    );

    // Update mass property with normalized value
    this.amount_as_used_mass_value = valueInGrams;
    this.amount_as_used_mass_unit = 'g';
    // Track that the primary unit is now 'g'
    this._amount_unit = 'g';
  }

  /**
   * Getter for amount_unit to determine which field is primary.
   * Returns the unit of the field that has a value, prioritizing mass > volume > mol.
   * @returns {string} The primary unit ('g', 'l', or 'mol')
   */
  get amount_unit() {
    // Return stored unit if set
    if (this._amount_unit) {
      return this._amount_unit;
    }

    // Determine primary unit based on which field has a value
    // Priority: mass > volume > mol
    if (this.base_amount_as_used_mass_value != null && this.base_amount_as_used_mass_value > 0) {
      return 'g';
    }
    if (this.base_volume_as_used_value != null && this.base_volume_as_used_value > 0) {
      return 'l';
    }
    if (this.base_amount_as_used_mol_value != null && this.base_amount_as_used_mol_value > 0) {
      return 'mol';
    }

    // Default to 'g' if no values are set
    return 'g';
  }

  /**
   * Setter for amount_unit to track which field is primary.
   * @param {string} unit - The unit ('g', 'l', or 'mol')
   */
  set amount_unit(unit) {
    this._amount_unit = unit;
  }

  get accessions() {
    const accessions = this.sequence_based_macromolecule.accessions;
    if (accessions) {
      return [accessions.join(',')];
    } else {
      return [];
    }
  }

  get ec_numbers() {
    const ecNumbers = this.sequence_based_macromolecule.ec_numbers;
    if (ecNumbers) {
      return [Array.isArray(ecNumbers) ? ecNumbers.join(',') : ecNumbers];
    } else {
      return [''];
    }
  }

  static buildEmpty(collectionID) {
    return new SequenceBasedMacromoleculeSample({
      collection_id: collectionID,
      type: 'sequence_based_macromolecule_sample',
      name: '',
      short_label: '',
      external_label: '',
      activity_per_mass_unit: 'U/g',
      activity_per_mass_value: '',
      activity_per_volume_unit: 'U/L',
      activity_per_volume_value: '',
      activity_unit: 'U',
      activity_value: '',
      amount_as_used_mass_unit: 'g',
      amount_as_used_mass_value: '',
      amount_as_used_mol_unit: 'mol',
      amount_as_used_mol_value: '',
      concentration_unit: 'ng/L',
      concentration_value: '',
      function_or_application: '',
      molarity_unit: 'mol/L',
      molarity_value: '',
      volume_as_used_unit: 'L',
      volume_as_used_value: '',
      heterologous_expression: 'unknown',
      localisation: '',
      organism: '',
      strain: '',
      taxon_id: '',
      tissue: '',
      obtained_by: '',
      supplier: '',
      formulation: '',
      purity: '',
      purity_detection: '',
      purification_method: '',

      sequence_based_macromolecule: {
        accessions: [],
        ec_numbers: [''],
        full_name: '',
        heterologous_expression: '',
        link_uniprot: '',
        link_pdb: '',
        localisation: '',
        molecular_weight: '',
        organism: '',
        other_identifier: '',
        own_identifier: '',
        parent: '',
        pdb_doi: '',
        primary_accession: '',
        sbmm_subtype: '',
        sbmm_type: 'protein',
        sequence: '',
        sequence_length: '',
        splitted_sequence: '',
        short_name: '',
        strain: '',
        taxon_id: '',
        tissue: '',
        uniprot_derivation: '',
        uniprot_source: '',
        attachments: [],

        post_translational_modifications: {
          acetylation_enabled: false,
          acetylation_lysin_number: '',
          glycosylation_enabled: false,
          glycosylation_n_linked_asn_details: '',
          glycosylation_n_linked_asn_enabled: false,
          glycosylation_o_linked_lys_details: '',
          glycosylation_o_linked_lys_enabled: false,
          glycosylation_o_linked_ser_details: '',
          glycosylation_o_linked_ser_enabled: false,
          glycosylation_o_linked_thr_details: '',
          glycosylation_o_linked_thr_enabled: false,
          hydroxylation_enabled: false,
          hydroxylation_lys_details: '',
          hydroxylation_lys_enabled: false,
          hydroxylation_pro_details: '',
          hydroxylation_pro_enabled: false,
          methylation_arg_details: '',
          methylation_arg_enabled: false,
          methylation_enabled: false,
          methylation_glu_details: '',
          methylation_glu_enabled: false,
          methylation_lys_details: '',
          methylation_lys_enabled: false,
          other_modifications_details: '',
          other_modifications_enabled: false,
          phosphorylation_enabled: false,
          phosphorylation_ser_details: '',
          phosphorylation_ser_enabled: false,
          phosphorylation_thr_details: '',
          phosphorylation_thr_enabled: false,
          phosphorylation_tyr_details: '',
          phosphorylation_tyr_enabled: false,
        },
        protein_sequence_modifications: {
          modification_n_terminal: false,
          modification_n_terminal_details: '',
          modification_c_terminal: false,
          modification_c_terminal_details: '',
          modification_insertion: false,
          modification_insertion_details: '',
          modification_deletion: false,
          modification_deletion_details: '',
          modification_mutation: false,
          modification_mutation_details: '',
          modification_other: false,
          modification_other_details: '',
        },
      },

      isNew: true,
      changed: false,
      updated: false,
      can_copy: false,
      container: Container.init(),
      attachments: [],
      errors: {},
    });
  }

  serialize() {
    const serialized = {
      id: this.id,
      collection_id: this.collection_id,
      name: this.name,
      short_label: this.short_label,
      activity_value: this.activity_value,
      activity_unit: this.activity_unit,
      amount_as_used_mol_value: this.amount_as_used_mol_value,
      amount_as_used_mol_unit: this.amount_as_used_mol_unit,
      amount_as_used_mass_value: this.amount_as_used_mass_value,
      amount_as_used_mass_unit: this.amount_as_used_mass_unit,
      concentration_value: this.concentration_value,
      concentration_unit: this.concentration_unit,
      concentration_rt_value: this.concentration_rt_value,
      concentration_rt_unit: this.concentration_rt_unit,
      container: this.container,
      function_or_application: this.function_or_application,
      molarity_value: this.molarity_value,
      molarity_unit: this.molarity_unit,
      activity_per_mass_value: this.activity_per_mass_value,
      activity_per_mass_unit: this.activity_per_mass_unit,
      activity_per_volume_value: this.activity_per_volume_value,
      activity_per_volume_unit: this.activity_per_volume_unit,
      volume_as_used_value: this.volume_as_used_value,
      volume_as_used_unit: this.volume_as_used_unit,
      heterologous_expression: this.heterologous_expression || 'unknown',
      localisation: this.localisation,
      organism: this.organism,
      strain: this.strain,
      taxon_id: this.taxon_id,
      tissue: this.tissue,
      obtained_by: this.obtained_by,
      supplier: this.supplier,
      formulation: this.formulation,
      purity: this.purity,
      purity_detection: this.purity_detection,
      purification_method: this.purification_method,
      equivalent: this.equivalent,
      weight_percentage: this.weight_percentage,

      sequence_based_macromolecule_attributes: {
        accessions: this.accessions,
        ec_numbers: this.ec_numbers,
        full_name: this.sequence_based_macromolecule.full_name,
        heterologous_expression: this.sequence_based_macromolecule.heterologous_expression || 'unknown',
        id: this.sequence_based_macromolecule.id,
        link_uniprot: this.sequence_based_macromolecule.link_uniprot,
        link_pdb: this.sequence_based_macromolecule.link_pdb,
        localisation: this.sequence_based_macromolecule.localisation,
        molecular_weight: this.sequence_based_macromolecule.molecular_weight,
        organism: this.sequence_based_macromolecule.organism,
        other_identifier: this.sequence_based_macromolecule.other_identifier,
        own_identifier: this.sequence_based_macromolecule.own_identifier,
        parent: this.sequence_based_macromolecule.parent,
        parent_identifier: this.sequence_based_macromolecule?.parent_identifier || this.sequence_based_macromolecule.parent?.id || '',
        pdb_doi: this.sequence_based_macromolecule.pdb_doi,
        primary_accession: this.sequence_based_macromolecule.primary_accession,
        sbmm_subtype: this.sequence_based_macromolecule.sbmm_subtype,
        sbmm_type: this.sequence_based_macromolecule.sbmm_type,
        sequence: this.sequence_based_macromolecule.sequence,
        short_name: this.sequence_based_macromolecule.short_name,
        strain: this.sequence_based_macromolecule.strain,
        taxon_id: this.sequence_based_macromolecule.taxon_id,
        tissue: this.sequence_based_macromolecule.tissue,
        uniprot_derivation: this.sequence_based_macromolecule.uniprot_derivation,
        uniprot_source: this.sequence_based_macromolecule.uniprot_source,

        post_translational_modification_attributes: this.sequence_based_macromolecule.post_translational_modifications,
        protein_sequence_modification_attributes: this.sequence_based_macromolecule.protein_sequence_modifications,
        attachments: this.sequence_based_macromolecule.attachments,
      },
    };
    return serialized;
  }

  serializeForCopy() {
    const serialized = {
      collection_id: this.collection_id,
      type: 'sequence_based_macromolecule_sample',
      name: this.name,
      short_label: this.short_label,
      activity_value: this.activity_value,
      activity_unit: this.activity_unit,
      amount_as_used_mol_value: this.amount_as_used_mol_value,
      amount_as_used_mol_unit: this.amount_as_used_mol_unit,
      amount_as_used_mass_value: this.amount_as_used_mass_value,
      amount_as_used_mass_unit: this.amount_as_used_mass_unit,
      concentration_value: this.concentration_value,
      concentration_unit: this.concentration_unit,
      concentration_rt_value: this.concentration_rt_value,
      concentration_rt_unit: this.concentration_rt_unit,
      container: this.container,
      function_or_application: this.function_or_application,
      molarity_value: this.molarity_value,
      molarity_unit: this.molarity_unit,
      activity_per_mass_value: this.activity_per_mass_value,
      activity_per_mass_unit: this.activity_per_mass_unit,
      activity_per_volume_value: this.activity_per_volume_value,
      activity_per_volume_unit: this.activity_per_volume_unit,
      volume_as_used_value: this.volume_as_used_value,
      volume_as_used_unit: this.volume_as_used_unit,
      sequence_based_macromolecule: this.sequence_based_macromolecule,
      heterologous_expression: this.heterologous_expression,
      localisation: this.localisation,
      organism: this.organism,
      strain: this.strain,
      taxon_id: this.taxon_id,
      tissue: this.tissue,
      obtained_by: this.obtained_by,
      supplier: this.supplier,
      formulation: this.formulation,
      purity: this.purity,
      purity_detection: this.purity_detection,
      purification_method: this.purification_method,
      errors: {},
    };
    return serialized;
  }

  static buildNewShortLabel() {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return 'NEW SEQUENCE BASED MACROMOLECULE'; }
    return `${currentUser.initials}-sbmmS${currentUser.sequence_based_macromolecule_samples_count + 1}`;
  }

  static copyFromSequenceBasedMacromoleculeSampleAndCollectionId(sequence_based_macromolecule_sample, collection_id) {
    const newSequenceBasedMacromoleculeSample = sequence_based_macromolecule_sample.buildCopy();
    newSequenceBasedMacromoleculeSample.collection_id = collection_id;
    if (sequence_based_macromolecule_sample.name) { newSequenceBasedMacromoleculeSample.name = sequence_based_macromolecule_sample.name; }

    return newSequenceBasedMacromoleculeSample;
  }

  title() {
    const short_label = this.short_label ? this.short_label : '';
    return !this.name && !short_label ? 'New sbmm sample' : (this.name ? `${short_label} ${this.name}` : short_label);
  }

  sbmmShortLabel() {
    if (!this.sequence_based_macromolecule?.id) { return ''; }

    return `sbmm-${this.sequence_based_macromolecule.id}`;
  }

  sbmmShortLabelForHeader(withShortName = false) {
    const sbmmShortLabel = this.sbmmShortLabel();
    const sbmmShortName = withShortName ? ` ${this.sequence_based_macromolecule.short_name}` : '';
    const spacer = this.title() || !withShortName ? ' - ' : '';

    return sbmmShortLabel ? `${spacer}${sbmmShortLabel}${sbmmShortName}` : '';
  }

  get attachmentCount() {
    if (this.attachments) { return this.attachments.length; }
    return this.attachment_count;
  }

  getAttachmentByIdentifier(identifier) {
    return this.attachments
      .filter((attachment) => attachment.identifier === identifier)[0];
  }

  buildCopy() {
    const sequenceBasedMacromoleculeSample = super.buildCopy();
    sequenceBasedMacromoleculeSample.short_label = SequenceBasedMacromoleculeSample.buildNewShortLabel();
    sequenceBasedMacromoleculeSample.container = Container.init();
    sequenceBasedMacromoleculeSample.can_copy = false;
    sequenceBasedMacromoleculeSample.attachments = [];
    if (sequenceBasedMacromoleculeSample.sequence_based_macromolecule.uniprot_derivation == 'uniprot_modified') {
      sequenceBasedMacromoleculeSample.sequence_based_macromolecule.parent_identifier =
        sequenceBasedMacromoleculeSample.sequence_based_macromolecule.parent.id;
    }
    return sequenceBasedMacromoleculeSample;
  }

  buildChildWithoutCounter() {
    const splitSbmm = this.clone();

    splitSbmm.parent_id = this.id; // Set parent relationship
    splitSbmm.id = Element.buildID(); // New temporary ID
    splitSbmm.created_at = null;
    splitSbmm.updated_at = null;
    splitSbmm.is_split = true;
    splitSbmm.is_new = true;

    // Build split short label with -NaN suffix (like starting_materials)
    // For SBMM samples, use -NaN suffix to match starting_materials format
    splitSbmm.short_label = `${this.short_label || ''}-NaN`;

    // Initialize container
    splitSbmm.container = Container.init();

    // Calculate concentration_rt if amount_mol and volume are available
    // This ensures the Conc field displays the correct value when dropped into reaction
    if (splitSbmm.base_amount_as_used_mol_value && splitSbmm.base_volume_as_used_value) {
      splitSbmm.calculateConcentrationRt();
    }

    return splitSbmm;
  }

  serializeSbmmMaterial() {
    const params = this.serialize();
    const extra_params = {
      position: this.position,
      show_label: this.show_label || false,
      parent_id: this.parent_id,
      is_new: this.is_new,
      is_split: this.is_split,
    };
    return Object.assign(params, extra_params);
  }
}
