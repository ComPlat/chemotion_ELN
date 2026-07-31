import { isSbmmSample } from 'src/utilities/ElementUtils';
import { debounce } from 'lodash';
import { getMetricMolConc } from 'src/utilities/MetricsUtils';
import { permitOn } from 'src/components/common/uis';
import { metPreConv } from 'src/utilities/metricPrefix';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import { formatDisplayValue, correctPrefix, validDigit } from 'src/utilities/MathUtils';
import { aviatorNavigation } from 'src/utilities/routesUtils';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import {
  calculateFeedstockMoles, convertTemperature, convertTime, convertTurnoverFrequency
} from 'src/utilities/UnitsConversion';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import ComponentModel from 'src/models/Component';

export default class MaterialHandler {
  constructor({
                variations = [],
                material,
                reaction,
                materialGroup,
                onChange,
                setFieldToShow,
                fieldToShow,
                mixtureComponents,
                setMixtureComponents,
                lockEquivColumn
              } = {}) {
    this._handler = null;
    this._material = material;
    this._reaction = reaction;
    this._isSbmm = null;
    this.materialGroup = materialGroup;
    this.onChange = onChange;
    this.setFieldToShow = setFieldToShow;
    this.fieldToShow = fieldToShow;
    this.setMixtureComponents = setMixtureComponents;
    this.mixtureComponents = mixtureComponents;
    this.lockEquivColumn = lockEquivColumn;
    this.variations = variations;
  }

  get reaction() {
    return this._reaction;
  }

  get material() {
    return this._material;
  }

  get isSbmm() {
    if (this._isSbmm === null) {
      this._isSbmm = isSbmmSample(this.material);
    }
    return this._isSbmm;
  }

  updateSbmm() {
    this._isSbmm = isSbmmSample(this.material);
  }

  gasTypeValue() {
    const { material, isSbmmGasSchemeUnavailable } = this;
    let gasTypeValue = material.gas_type || 'off';
    let tooltipText = 'This material is currently marked as non gaseous type';
    if (material.gas_type === 'gas') {
      gasTypeValue = 'gas';
      tooltipText = 'Gas';
    } else if (material.gas_type === 'feedstock') {
      gasTypeValue = 'FES';
      tooltipText = 'Feedstock reference';
    } else if (material.gas_type === 'catalyst') {
      gasTypeValue = 'CAT';
      tooltipText = 'Catalyst reference';
    }
    if (isSbmmGasSchemeUnavailable) {
      tooltipText = 'SBMM samples cannot be marked as gaseous type';
    }

    const gasTypes = ['feedstock', 'catalyst', 'gas'];
    const gasTypeStatus = gasTypes.includes(material?.gas_type);
    const isGasTypeActive = gasTypeStatus && !isSbmmGasSchemeUnavailable;

    return { gasTypeValue, tooltipText, isGasTypeActive, isSbmmGasSchemeUnavailable };
  }

  get metricMolConc() {
    return getMetricMolConc(this.material);
  }

  get isProduct() {
    return this.materialGroup === 'products';
  }

  get isConcentrationDisabled() {
    return !permitOn(this.reaction)
      || this.isProduct
      || this.reaction.weight_percentage;
  }

  get isAmountDisabledByWeightPercentage() {
    const { reaction, material } = this;
    return reaction.weight_percentage
    && material.weight_percentage > 0 && !this.isProduct && !material.weight_percentage_reference;
  }

  get isSbmmGasSchemeUnavailable() {
    const { materialGroup } = this;
    return this.isSbmm && (materialGroup === 'reactants' || materialGroup === 'starting_materials');
  }

  // For SBMM samples, use concentration_rt_value directly (automatically calculated)
  get concentrationValue() {
    return this.isSbmm
      ? this.material.concentration_rt_value
      : this.material.concn;
  }

  get molecularWeight() {
    if (this.material.isMixture?.() && this.material.reference_relative_molecular_weight) {
      return this.material.reference_relative_molecular_weight.toFixed(4);
    }

    if (this.isSbmm) {
      // SBMM samples have molecular_weight in sequence_based_macromolecule
      return this.material.sequence_based_macromolecule?.molecular_weight;
    } else if (this.material.decoupled) {
      return this.material.molecular_mass;
    }

    return this.material.molecule?.molecular_weight;
  }

  /**
   * Fetches mixture components for a given material if it's a mixture.
   * This method handles three scenarios:
   * 1. If material is not a mixture, clears the components state
   * 2. If material has existing components in memory, deserializes and uses them
   * 3. If material is saved (has numeric ID) but no components in memory, fetches from API
   *
   * @param {Sample} material - The material sample to check for mixture components
   * @returns {void}
   */
  fetchMixtureComponentsIfNeeded() {
    const { material, setMixtureComponents } = this;
    if (!material || !(material.isMixture && material.isMixture())) {
      setMixtureComponents([]);
      return;
    }

    const existingComponents = Array.isArray(material.components) ? material.components : [];

    if (existingComponents.length > 0) {
      // Use existing components, deserializing if needed
      const componentsList = existingComponents.map((comp) => (
        comp instanceof ComponentModel ? comp : ComponentModel.deserializeData(comp)
      ));

      setMixtureComponents(componentsList);
    } else if (typeof material.id === 'number') {
      // Fetch components for saved material
      ComponentsFetcher.fetchComponentsBySampleId(material.id)
        .then((components) => {
          const componentsList = components.map(ComponentModel.deserializeData);
          // Initialize components on the material object so they persist
          material.initialComponents(componentsList);
          setMixtureComponents(componentsList);
        })
        .catch((error) => {
          console.error('Error fetching components:', error);
        });
    } else {
      // No components and no ID, clear state
      setMixtureComponents([]);
    }
  }

  molarWeightValue(formatted = false) {
    const isProduct = this.reaction.products.includes(this.material);
    const { molecularWeight } = this;
    let theoreticalMassPart = '';
    if (isProduct && this.material.maxAmount) {
      theoreticalMassPart = `, max theoretical mass: ${Math.round(this.material.maxAmount * 10000) / 10} mg`;
    }
    // Define metricPrefix and currentPrecision
    const metricPrefix = 'n';
    const currentPrecision = 4;
    const formattedValue = formatDisplayValue(
      metPreConv(molecularWeight, metricPrefix, metricPrefix),
      currentPrecision
    );
    return `${formatted ? formattedValue : molecularWeight} g/mol${formatted ? '' : theoreticalMassPart}`;
  }

  findMinMayUnit = ( defaultUnit, valueGetter) => {
    const { material, variations, materialGroup } = this;
    if (variations.length > 0) {
      const defaultMatValue =  valueGetter(material);
      const values = variations.map((v) => {
        const vMat = v.data[materialGroup]?.find((m) => m.id === material.id);
        return vMat ? valueGetter(vMat) : null;
      }).filter((x) => x !== null);
      const min = Math.min(...values);
      const max = Math.max(...values);
      return { min, max, unit: defaultUnit, isRangeField: min !== max || min !== defaultMatValue };
    }
    return { min: null, max: null, unit: defaultUnit, isRangeField: false };
  };

  // eslint-disable-next-line class-methods-use-this
  recalculateYieldForGasProduct() {
    const { material, reaction } = this;
    const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
    const refMaterial = reaction.findFeedstockMaterial();
    if (!refMaterial) {
      return null;
    }
    const purity = refMaterial?.purity || 1;
    const feedstockMolValue = calculateFeedstockMoles(vesselVolume, purity);
    const result = material.amount_mol / feedstockMolValue;
    if (!result) return 'n.a.';
    return result > 1 ? '100%' : `${(result * 100).toFixed(0)}%`;
  }

  preparationCustomField() {
    const { material, reaction, lockEquivColumn, fieldToShow } = this;
    const equivalentField = fieldToShow === 'molar mass';
    const valueToShow = equivalentField ? material.equivalent : material.weight_percentage;
    let disableWeightPercentageField = false;
    const weightPercentageIsSelected = fieldToShow === 'weight percentage';
    if (weightPercentageIsSelected) {
      const weightPercentageReference = reaction.findWeightPercentageReferenceMaterial();
      const weightPercentageReferenceMaterial = weightPercentageReference?.weightPercentageReference;
      const targetAmountIsNotValid = Number.isNaN(weightPercentageReference?.targetAmount?.value)
        || weightPercentageReference?.targetAmount?.value === 0;
      disableWeightPercentageField = !weightPercentageReferenceMaterial
        || targetAmountIsNotValid
        || material.weight_percentage_reference;
    }
    return {
      material,
      reaction,
      lockEquivColumn,
      fieldToShow,
      equivalentField,
      valueToShow,
      disableWeightPercentageField
    };
  }

  calculateYield() {
    const { material, reaction } = this;
    const refMaterial = reaction.getReferenceMaterial();
    let calculateYield;
    const isNumeric = (v) => {
      const n = Number(v);
      return Number.isFinite(n);
    };
    if (material.gas_type === 'gas') {
      calculateYield = this.recalculateYieldForGasProduct();
    } else if (reaction.hasPolymers()) {
      if (isNumeric(material.equivalent)) {
        const eq = material.equivalent <= 1 ? material.equivalent : 1;
        calculateYield = `${(eq * 100).toFixed(0)}%`;
      }
    } else if (refMaterial && (refMaterial.decoupled || material.decoupled)) {
      calculateYield = 'n.a.';
    } else if (material.purity < 1 && isNumeric(material.equivalent) && material.equivalent > 1) {
      const stoichiometryCoeff = (material.coefficient || 1.0) / (refMaterial?.coefficient || 1.0);
      const molecularWeight = this.isSbmm
        ? material.sequence_based_macromolecule?.molecular_weight
        : material.molecule_molecular_weight;
      const maxAmount = (refMaterial.amount_mol || 0) * stoichiometryCoeff * molecularWeight;
      const eq = maxAmount !== 0 ? (material.amount_g * (material.purity || 1)) / maxAmount : 0;
      calculateYield = `${(eq * 100).toFixed(1)}%`;
    } else if (isNumeric(material.equivalent)) {
      const eq = material.equivalent <= 1 ? material.equivalent : 1;
      calculateYield = `${((eq || 0) * 100).toFixed(0)}%`;
    }
    return calculateYield;
  }

  createParagraph(m) {
    const { materialGroup } = this;
    let molName;
    if (this.isSbmm) {
      molName = m.name || m.short_label;
    } else {
      molName = m.molecule_name_hash.label;
      if (!molName) {
        molName = m.molecule.iupac_name;
      }
      if (!molName) {
        molName = m.molecule.sum_formular;
      }
    }

    const gUnit = correctPrefix(m.amount_g, 3);
    const lUnit = correctPrefix(m.amount_l, 3);
    const molUnit = correctPrefix(m.amount_mol, 3); // ELN issue#829

    const grm = gUnit ? `${gUnit}g, ` : '';
    const vol = lUnit ? `${lUnit}L, ` : '';
    const solVol = vol.slice(0, -2);
    const mol = molUnit ? `${molUnit}mol, ` : '';
    const mlt = m.molarity_value === 0.0
      ? ''
      : `${validDigit(m.molarity_value, 3)} ${m.molarity_unit}, `;
    const eqv = `${validDigit(m.equivalent, 3)}`;
    const yld = `${Math.round(m.equivalent * 100)}%`;

    if (m.gas_type === 'gas') {
      const ton = `TON: ${validDigit(m.gas_phase_data.turnover_number, 3)}, `;
      const tofUnit = (m.gas_phase_data.turnover_frequency.unit).split('TON')[1];
      const tofValue = m.gas_phase_data.turnover_frequency.value;
      const tof = `TOF: ${validDigit(tofValue, 3)}${tofUnit}, `;
      return `${molName} (${mol}${ton}${tof}${yld})`;
    }

    switch (materialGroup) {
      case 'purification_solvents':
      case 'solvents': {
        return `${molName} (${solVol})`;
      }
      case 'products': {
        return `${molName} (${grm}${vol}${mol}${mlt}${yld} yield)`;
      }
      default: {
        return `${molName} (${grm}${vol}${mol}${mlt}${eqv} equiv)`;
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getFieldData(field, gasPhaseData, unit = null) {
    let currentUnit = gasPhaseData[field]?.unit;
    let currentValue = gasPhaseData[field]?.value;
    let whileMaxLoops = 6;
    switch (field) {
      case 'turnover_number':
        return {
          value: gasPhaseData.turnover_number,
          unit: 'TON',
          isTimeField: false,
          variationKey: 'turnoverNumber'
        };
      case 'part_per_million':
        return {
          value: gasPhaseData.part_per_million,
          unit: 'ppm',
          isTimeField: false,
          variationKey: 'concentration'
        };
      case 'time':
        while (whileMaxLoops > 0 && unit && unit !== currentUnit) {
          whileMaxLoops--;
          const [convertedValue, convertedUnit] = convertTime(currentValue, currentUnit);
          currentUnit = convertedUnit;
          currentValue = convertedValue;
        }
        return {
          value: currentValue,
          unit: currentUnit,
          isTimeField: true,
          variationKey: 'duration'
        };
      case 'turnover_frequency':
        while (whileMaxLoops > 0 && unit && unit !== currentUnit) {
          whileMaxLoops--;
          const [convertedValue, convertedUnit] = convertTurnoverFrequency(currentValue, currentUnit);
          currentUnit = convertedUnit;
          currentValue = convertedValue;
        }
        return {
          value: currentValue,
          unit: currentUnit,
          isTimeField: false,
          variationKey: 'turnoverFrequency'
        };
      case 'temperature':
        while (whileMaxLoops > 0 && unit && unit !== currentUnit) {
          whileMaxLoops--;
          const [convertedValue, convertedUnit] = convertTemperature(currentValue, currentUnit);
          currentUnit = convertedUnit;
          currentValue = convertedValue;
        }
        return {
          value: currentValue,
          unit: currentUnit,
          isTimeField: false,
          variationKey: 'temperature'
        };
      default:
        return {
          value: gasPhaseData[field]?.value,
          unit: gasPhaseData[field]?.unit,
          isTimeField: false,
        };
    }
  }

  get handler() {
    if (this._handler === null) {
      this._handler = this.prepareHandler();
    }

    return this._handler;
  }

  prepareHandler() {
    const amountTypeChange = (e) => {
      const { onChange, materialGroup, material } = this;
      if (onChange && e) {
        const event = {
          amountType: e,
          type: 'amountTypeChanged',
          materialGroup,
          sampleID: material.id,
        };
        onChange(event);
      }
    };
    const equivalentChange = (e) => {
      const { onChange, materialGroup } = this;
      const equivalent = e.value;
      if (onChange && e) {
        const event = {
          type: 'equivalentChanged',
          materialGroup,
          sampleID: this.material.id,
          isSbmm: this.isSbmm,
          equivalent,
          weightPercentageField: e.weightPercentageField || false,
        };
        onChange(event);
      }
    };

    const weightPercentageChange = (e) => {
      const { onChange, materialGroup } = this;
      const weightPercentage = e;
      if (onChange) {
        const event = {
          type: 'weightPercentageChanged',
          materialGroup,
          sampleID: this.material.id,
          weightPercentage
        };
        onChange(event);
      }
    };

    const amountUnitChange = (e, value, amountType = null) => {
      const { materialGroup, onChange } = this;
      if (e.value === value) return;

      if (onChange && e) {
        const event = {
          amount: e,
          type: 'amountUnitChanged',
          materialGroup,
          sampleID: this.material.id,
          amountType,
          isSbmm: this.isSbmm,
        };
        onChange(event);
      }
    };

    return {
      equivalentChange,
      amountTypeChange,
      weightPercentageChange,
      amountUnitChange,
      debounceHandleAmountUnitChange: debounce(amountUnitChange, 500),

      /**
       * Handles changes to a material's concentration value.
       * Emits a 'concentrationChanged' event to trigger recalculation of material amounts.
       *
       * @param {Object} e - The change event containing new concentration value
       * @param {number} currentValue - Current concentration value for comparison
       */
      concentrationChange: (e, currentValue) => {
        const { materialGroup, onChange, material } = this;
        if (!onChange || !e) return;
        if (e.value === currentValue) return;

        const event = {
          concentration: e,
          type: 'concentrationChanged',
          materialGroup,
          sampleID: material.id,
          isSbmm: this.isSbmm,
        };
        onChange(event);
      },

      valueChange: (e, equivalentField) => {
        if (equivalentField) {
          const value = { value: e };
          equivalentChange(value);
        } else {
          weightPercentageChange(e);
        }
      },

      coefficientChange: (e) => {
        const { onChange, materialGroup } = this;
        const coefficient = e.value;
        if (onChange) {
          const event = {
            coefficient,
            type: 'coefficientChanged',
            materialGroup,
            sampleID: this.material.id,
          };
          onChange(event);
        }
      },
      conversionRateChange: (e) => {
        const { onChange, materialGroup } = this;
        const conversionRate = e.value;
        if (onChange && e) {
          const event = {
            type: 'conversionRateChanged',
            materialGroup,
            sampleID: this.material.id,
            conversionRate,
          };
          onChange(event);
        }
      },
      referenceChange: (e, type = null) => {
        const { materialGroup, onChange } = this;
        const { value } = e.target;
        if (onChange) {
          const event = {
            type: type ? 'weightPercentageReferenceChanged' : 'referenceChanged',
            materialGroup,
            sampleID: this.material.id,
            value,
            isSbmm: this.isSbmm,
          };
          onChange(event);
          this.setFieldToShow('molar mass');
        }
      },
      drySolventChange: (event) => {
        const value = event.target.checked;
        const { onChange, materialGroup } = this;

        if (onChange) {
          const e = {
            type: 'drysolventChanged',
            materialGroup,
            sampleID: this.material.id,
            dry_solvent: value,
          };
          onChange(e);
        }
      },
      toggleTarget: () => {
        const isTarget = this.material.amountType === 'target';
        // allow switching target/real for all materials
        amountTypeChange(!isTarget ? 'target' : 'real');
      },
      gasTypeChange: (gasType, value) => {
        const { materialGroup, onChange } = this;
        if (onChange) {
          const event = {
            type: gasType,
            materialGroup,
            sampleID: this.material.id,
            value,
          };
          onChange(event);
        }
      },
      addToDesc: () => {
        const { onChange, material } = this;

        if (onChange) {
          const event = {
            type: 'addToDesc',
            paragraph: this.createParagraph(material),
          };
          onChange(event);
        }
      },
      materialClick: () => {
        const { reaction, material } = this;

        aviatorNavigation(material.type, material.id, true, false);
        if (this.isSbmm) {
          ElementActions.fetchSequenceBasedMacromoleculeSampleById(material.id);
        } else {
          material.updateChecksum();
          ElementActions.showReactionMaterial({ sample: material, reaction });
        }
      },
      loadingChange: (newLoading) => {
        const { material, materialGroup, onChange } = this;
        material.residues[0].custom_info.loading = newLoading.value;

        // just recalculate value in mg using the new loading value
        if (onChange) {
          const event = {
            type: 'amountChanged',
            materialGroup,
            sampleID: material.id,
            amount: material.amount,
          };
          onChange(event);
        }
      },

      equivalentWeightPercentageChange: (field) => {
        const { material, setFieldToShow } = this;
        setFieldToShow(field);
        if (field === 'weight percentage') {
          if (material.reference) {
            equivalentChange({ value: 1 });
          } else if (!material.weight_percentage_reference) {
            equivalentChange({ value: 0, weightPercentageField: true });
          }
        } else if (field === 'molar mass') {
          if (!material.reference) {
            if (material.weight_percentage_reference) {
              weightPercentageChange(1);
            } else {
              weightPercentageChange(null);
            }
          }
        }
      },

      externalLabelChange: (event)=> {
        const { value } = event.target;
        const { materialGroup, onChange } = this;
        if (onChange) {
          const e = {
            type: 'externalLabelChanged',
            materialGroup,
            sampleID: this.material.id,
            externalLabel: value,
          };
          onChange(e);
        }
      },

      externalLabelCompleted: () => {
        const { onChange } = this;
        if (onChange) {
          const event = {
            type: 'externalLabelCompleted',
          };
          onChange(event);
        }
      },

      /**
       * Handles changes to component reference selection within mixture components.
       * This function processes reference change events from mixture components and
       * propagates them up to the parent component through the onChange callback.
       *
       * @param {Object} changeEvent - The change event object from component reference selection
       * @param {string} changeEvent.type - Should be 'componentReferenceChanged'
       * @param {string|number} changeEvent.componentId - The ID of the component being changed
       * @param {boolean} changeEvent.checked - Whether the component is being set as reference
       * @returns {void}
       */
      componentReferenceChange: (changeEvent) => {
        if (changeEvent.type === 'componentReferenceChanged') {
          const {
            onChange,
            material,
            materialGroup,
            mixtureComponents,
            setMixtureComponents
          } = this;

          // Update the reference directly on the ComponentModel instances
          mixtureComponents.forEach((comp) => {
            const isReference = comp.id === changeEvent.componentId;
            if (comp.reference !== isReference) {
              comp.reference = isReference;
            }
          });

          // Trigger re-render with updated components
          setMixtureComponents([...mixtureComponents]);

          // Propagate the change up to notify the reaction that it has changed
          if (onChange) {
            onChange({
              ...changeEvent,
              sampleID: material.id,
              materialGroup
            });
          }
        }
      },

      componentMetricsChange: (changeEvent) => {
        const { onChange, material, materialGroup } = this;
        if (onChange) {
          onChange({
            ...changeEvent,
            sampleID: material.id,
            materialGroup
          });
        }
      },
      metricsChange: (e) => {
        const { materialGroup, onChange } = this;

        if (onChange && e) {
          const event = {
            metricUnit: e.metricUnit,
            metricPrefix: e.metricPrefix,
            type: 'MetricsChanged',
            materialGroup,
            sampleID: this.material.id,
            isSbmm: this.isSbmm,
          };
          onChange(event);
        }
      },

      gasFieldsUnitsChanged: (e, field) => {
        const { materialGroup, onChange } = this;
        if (onChange && e) {
          const event = {
            unit: e.metricUnit,
            value: e.value === '' ? 0 : e.value,
            field,
            type: 'gasFieldsUnitsChanged',
            materialGroup,
            sampleID: this.material.id,
          };
          onChange(event);
        }
      },

      gasFieldsChange: (field, e, currentValue) => {
        const { materialGroup, onChange } = this;
        if (
          onChange
          && e.value !== undefined
          && e.unit !== undefined
          && e.value !== currentValue
        ) {
          const event = {
            type: 'gasFieldsChanged',
            materialGroup,
            sampleID: this.material.id,
            value: e.value,
            unit: e.unit,
            field,
          };
          onChange(event);
        }
      }

    };
  }

}