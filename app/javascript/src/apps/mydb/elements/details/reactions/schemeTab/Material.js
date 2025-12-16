import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Accordion,
  Form,
  Button,
  InputGroup,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { debounce } from 'lodash';
import MaterialCalculations from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialCalculations';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import SampleName from 'src/components/common/SampleName';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { UrlSilentNavigation, SampleCode } from 'src/utilities/ElementUtils';
import { formatDisplayValue, correctPrefix, validDigit } from 'src/utilities/MathUtils';
import {
  getMetricMol, metricPrefixesMol, metricPrefixesMolConc, getMetricMolConc
} from 'src/utilities/MetricsUtils';
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import { permitOn } from 'src/components/common/uis';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import { calculateFeedstockMoles } from 'src/utilities/UnitsConversion';
import cs from 'classnames';
import DragHandle from 'src/components/common/DragHandle';
import DeleteButton from 'src/components/common/DeleteButton';
import { metPreConv } from 'src/utilities/metricPrefix';
import ReactionMaterialComponentsGroup
  from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionMaterialComponentsGroup';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import ComponentModel from 'src/models/Component';
import FieldValueSelector from 'src/apps/mydb/elements/details/FieldValueSelector';

const notApplicableInput = (className) => (
  <div>
    <Form.Control
      size="sm"
      type="text"
      value="n/a"
      disabled
      className={`text-align-center ${className}`}
    />
  </div>
);

const iupacNameTooltip = material => (
  <Tooltip id="iupac_name_tooltip" className="left_tooltip">
    <div>
      <div className="d-flex">
        <div>IUPAC&#58;&nbsp;</div>
        <div style={{ wordBreak: 'break-all' }}>{material.molecule.iupac_name || ''}</div>
      </div>
      <div className="d-flex">
        <div>Name&#58;&nbsp;</div>
        <div style={{ wordBreak: 'break-all' }}>{material.name || ''}</div>
      </div>
      <div className="d-flex">
        <div>Ext.Label&#58;&nbsp;</div>
        <div style={{ wordBreak: 'break-all' }}>{material.external_label || ''}</div>
      </div>
      <div className="d-flex">
        <div>Short Label&#58;&nbsp;</div>
        <div style={{ wordBreak: 'break-all' }}>{material.short_label || ''}</div>
      </div>
    </div>
  </Tooltip>
);

const refreshSvgTooltip = (
  <Tooltip id="refresh_svg_tooltip">Refresh reaction diagram</Tooltip>
);

const AddtoDescToolTip = (
  <Tooltip id="tp-spl-code" className="left_tooltip">
    Add to description or additional information for publication and purification details
  </Tooltip>
);

class Material extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showComponents: false,
      mixtureComponents: [],
      mixtureComponentsLoading: false,
      equivalentWeightPercentageFieldChange: 'molar mass',
      fieldToShow: 'molar mass',
    };

    this.createParagraph = this.createParagraph.bind(this);
    this.handleAmountUnitChange = this.handleAmountUnitChange.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
    this.gasFieldsUnitsChanged = this.gasFieldsUnitsChanged.bind(this);
    this.handleCoefficientChange = this.handleCoefficientChange.bind(this);
    this.debounceHandleAmountUnitChange = debounce(this.handleAmountUnitChange, 500);
    this.yieldOrConversionRate = this.yieldOrConversionRate.bind(this);
    this.toggleComponentsAccordion = this.toggleComponentsAccordion.bind(this);
  }

  componentDidMount() {
    const { material } = this.props;
    this.fetchMixtureComponentsIfNeeded(material);
    this.restoreAccordionState(material);
  }

  componentDidUpdate(prevProps) {
    const { material } = this.props;
    if (prevProps.material.id !== material.id) {
      this.fetchMixtureComponentsIfNeeded(material);
      this.restoreAccordionState(material);
    }
  }

  componentDidMount() {
    const { material } = this.props;
    const isEmpty = (v) => (v === null || v === undefined || Number.isNaN(v) || v === 0);

    // Determine initial field based on data
    let initialField;
    if (!isEmpty(material.weight_percentage)) {
      initialField = 'weight percentage';
    } else {
      initialField = 'molar mass';
    }

    this.setState({
      fieldToShow: initialField,
    });
  }

  handleMaterialClick(sample) {
    const { reaction } = this.props;
    UrlSilentNavigation(sample);
    sample.updateChecksum();
    ElementActions.showReactionMaterial({ sample, reaction });
  }

  materialLoading(material, showLoadingColumn) {
    if (!showLoadingColumn) {
      return false;
    }
    if (!material.contains_residues) {
      return notApplicableInput('reaction-material__loading-data');
    }

    return (
      <NumeralInputWithUnitsCompo
        className="reaction-material__loading-data"
        value={material.loading}
        unit="mmol/g"
        metricPrefix="n"
        metricPrefixes={['n']}
        variant={material.error_loading ? 'error' : 'primary'}
        size="sm"
        precision={3}
        disabled={
          !permitOn(this.props.reaction)
            || (this.props.materialGroup === 'products'
            || (!material.reference && this.props.lockEquivColumn))
        }
        onChange={(loading) => this.handleLoadingChange(loading)}
      />
    );
  }

  /**
   * Renders the concentration field for a material.
   * For mixtures, it finds the reference component and uses its concentration.
   * For regular materials, it uses the material's own concentration value.
   *
   * @param {Sample} material - The material sample to display concentration for
   * @returns {JSX.Element} A table cell containing the concentration input component
   */
  materialConcentration(material) {
    const metricMolConc = getMetricMolConc(material);

    return (
      <NumeralInputWithUnitsCompo
        value={material.concn}
        className="reaction-material__concentration-data"
        unit="mol/l"
        metricPrefix={metricMolConc}
        metricPrefixes={metricPrefixesMolConc}
        precision={4}
        disabled
        onChange={(e) => this.handleAmountUnitChange(e, material.concn)}
        onMetricsChange={this.handleMetricsChange}
        size="sm"
      />
    );
  }

  materialRef(material) {
    const { materialGroup, reaction } = this.props;

    return (
      <div>
        {
          materialGroup === 'products'
            ? this.renderProductReference(material, reaction)
            : (
              <div>
                {reaction.weight_percentage ? (
                  this.renderNestedReferenceRadios(material, reaction)
                ) : (
                  <Form.Check
                    type="radio"
                    disabled={!permitOn(reaction)}
                    name="reference"
                    checked={material.reference}
                    onChange={(e) => this.handleReferenceChange(e)}
                    size="sm"
                    className="m-1"
                  />
                )}
              </div>
            )
        }
      </div>
    );
  }

  materialShowLabel(material) {
    return (
      <Button
        className="p-1 ms-1"
        onClick={e => this.handleShowLabelChange(e)}
        variant={material.show_label ? 'primary' : 'light'}
        size="sm"
        title={material.show_label ? 'Switch to structure' : 'Switch to label'}
      >
        {material.show_label ? 'l' : 's'}
      </Button>
    );
  }

  // eslint-disable-next-line class-methods-use-this
  recalculateYieldForGasProduct(material, reaction) {
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

  calculateYield(material, reaction) {
    const refMaterial = reaction.getReferenceMaterial();
    let calculateYield;
    const isNumeric = (v) => {
      const n = Number(v);
      return Number.isFinite(n);
    };
    if (material.gas_type === 'gas') {
      calculateYield = this.recalculateYieldForGasProduct(material, reaction);
    } else if (reaction.hasPolymers()) {
      if (isNumeric(material.equivalent)) {
        const eq = material.equivalent <= 1 ? material.equivalent : 1;
        calculateYield = `${(eq * 100).toFixed(0)}%`;
      }
    } else if (refMaterial && (refMaterial.decoupled || material.decoupled)) {
      calculateYield = 'n.a.';
    } else if (material.purity < 1 && isNumeric(material.equivalent) && material.equivalent > 1) {
      const stoichiometryCoeff = (material.coefficient || 1.0) / (refMaterial?.coefficient || 1.0);
      const maxAmount = (refMaterial.amount_mol || 0) * stoichiometryCoeff * material.molecule_molecular_weight;
      const eq = maxAmount !== 0 ? (material.amount_g * (material.purity || 1)) / maxAmount : 0;
      calculateYield = `${(eq * 100).toFixed(1)}%`;
    } else if (isNumeric(material.equivalent)) {
      const eq = material.equivalent <= 1 ? material.equivalent : 1;
      calculateYield = `${((eq || 0) * 100).toFixed(0)}%`;
    }
    return calculateYield;
  }

  conversionRateField(material) {
    const { reaction } = this.props;
    const condition = material.conversion_rate / 100 > 1;
    const allowedConversionRateValue = material.conversion_rate && condition
      ? 100
      : material.conversion_rate;
    return (
      <NumeralInputWithUnitsCompo
        className="reaction-material__yield-data"
        precision={4}
        value={allowedConversionRateValue || 'n.d.'}
        unit="%"
        disabled={!permitOn(reaction)}
        onChange={(e) => this.handleConversionRateChange(e)}
        size="sm"
      />
    );
  }

  // eslint-disable-next-line react/sort-comp
  handleOnValueChange(e, equivalentField) {
    if (equivalentField) {
      const value = { value: e };
      this.handleEquivalentChange(value);
    } else {
      this.handleWeightPercentageChange(e);
    }
  }

  yieldOrConversionRate(material) {
    const { reaction, displayYieldField } = this.props;
    const yieldMessage = (
      <>
        The final yield value calculated upon saving the reaction
        is based on the real amount field value of this product.
      </>
    );
    if (displayYieldField === true || displayYieldField === null) {
      return (
        <div>
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="yield-tooltip">
                {yieldMessage}
              </Tooltip>
            )}
          >
            <Form.Control
              className="reaction-material__yield-data"
              name="yield"
              type="text"
              bsClass="bs-form--compact form-control"
              size="sm"
              value={this.calculateYield(material, reaction) || 'n.d.'}
              disabled
            />
          </OverlayTrigger>
        </div>
      );
    }
    return this.conversionRateField(material);
  }

  equivalentOrYield(material) {
    const { materialGroup, reaction, lockEquivColumn } = this.props;
    if (materialGroup === 'products') {
      return this.yieldOrConversionRate(material);
    }
    return (reaction.weight_percentage ? this.customFieldValueSelector()
      : (
        <NumeralInputWithUnitsCompo
          className="reaction-material__equivalent-input"
          size="sm"
          precision={4}
          value={material.equivalent}
          disabled={
            !permitOn(reaction) || ((((material.reference || false)
            && material.equivalent) !== false) || lockEquivColumn)
          }
          onChange={(e) => this.handleEquivalentChange(e)}
        />
      )
    );
  }

  /**
   * Renders a dual-purpose field selector/input for equivalent or weight percentage values.
   *
   * This component allows users to switch between two modes:
   * 1. Molar mass mode: Shows and edits the material's equivalent value
   * 2. Weight percentage mode: Shows and edits the material's weight percentage value
   *
   * Weight percentage field is conditionally disabled when:
   * - No weight percentage reference material is set in the reaction
   * - Target amount weight percentage reference materialis invalid (NaN or 0)
   * - Current material is itself the weight percentage reference
   *
   * @returns {JSX.Element} FieldValueSelector component with mode switching capability
   */
  customFieldValueSelector() {
    const { material, reaction, lockEquivColumn } = this.props;
    const { fieldToShow } = this.state;
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

    return (
      <FieldValueSelector
        className="reaction-material__equivalent-input"
        fieldOptions={['molar mass', 'weight percentage']}
        onFirstRenderField={fieldToShow}
        value={valueToShow}
        onChange={(e) => { this.handleOnValueChange(e, equivalentField); }}
        onFieldChange={(field) => this.handleEquivalentWeightPercentageChange(material, field)}
        disableSpecificField={disableWeightPercentageField}
        disabled={
          !permitOn(reaction) || material.reference || lockEquivColumn
        }
        weightPercentageReference={material.weight_percentage_reference}
      />
    );
  }

  gaseousInputFields(field, material) {
    const gasPhaseData = material.gas_phase_data || {};
    const { value, unit } = this.getFieldData(field, gasPhaseData);
    const readOnly = this.isFieldReadOnly(field);

    const updateValue = this.getFormattedValue(value);
    const message = 'Unit switch only active with valid values';
    const noSwitchUnits = ['ppm', 'TON'];

    const inputComponent = (
      <NumeralInputWithUnitsCompo
        size="sm"
        precision={4}
        variant="primary"
        value={updateValue}
        disabled={readOnly}
        onMetricsChange={(e) => this.gasFieldsUnitsChanged(e, field)}
        onChange={(e) => this.handleGasFieldsChange(field, e, value)}
        unit={unit}
      />
    );

    return (
      (value === 'n.d' || !value) && !noSwitchUnits.includes(unit) ? (
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id={`${field}-tooltip`}>{message}</Tooltip>}
        >
          <div>{inputComponent}</div>
        </OverlayTrigger>
      ) : (
        inputComponent
      )
    );
  }

  // eslint-disable-next-line class-methods-use-this
  getFieldData(field, gasPhaseData) {
    switch (field) {
      case 'turnover_number':
        return {
          value: gasPhaseData.turnover_number,
          unit: 'TON',
          isTimeField: false,
        };
      case 'part_per_million':
        return {
          value: gasPhaseData.part_per_million,
          unit: 'ppm',
          isTimeField: false,
        };
      case 'time':
        return {
          value: gasPhaseData.time?.value,
          unit: gasPhaseData.time?.unit,
          isTimeField: true,
        };
      default:
        return {
          value: gasPhaseData[field]?.value,
          unit: gasPhaseData[field]?.unit,
          isTimeField: false,
        };
    }
  }

  // eslint-disable-next-line class-methods-use-this
  isFieldReadOnly(field) {
    return field === 'turnover_frequency' || field === 'turnover_number';
  }

  // eslint-disable-next-line class-methods-use-this
  getFormattedValue(value) {
    if (value == null || value === '') return 'n.d';

    const num = Number(value);
    if (Number.isNaN(num)) return 'n.d';

    return num;
  }

  gaseousProductRow(material) {
    return (
      <div className="reaction-material__gaseous-fields-data">
        <div className="reaction-material__ref-data" />
        {this.gaseousInputFields('time', material)}
        {this.gaseousInputFields('temperature', material)}
        {this.gaseousInputFields('part_per_million', material)}
        {this.gaseousInputFields('turnover_number', material)}
        {this.gaseousInputFields('turnover_frequency', material)}
      </div>
    );
  }

  handleExternalLabelChange(event) {
    const value = event.target.value;
    if (this.props.onChange) {
      const e = {
        type: 'externalLabelChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        externalLabel: value,
      };
      this.props.onChange(e);
    }
  }

  handleExternalLabelCompleted() {
    if (this.props.onChange) {
      const event = {
        type: 'externalLabelCompleted',
      };
      this.props.onChange(event);
    }
  }

  handleReferenceChange(e, type = null) {
    const { materialGroup, onChange } = this.props;
    const value = e.target.value;
    if (onChange) {
      const event = {
        type: type ? 'weightPercentageReferenceChanged' : 'referenceChanged',
        materialGroup,
        sampleID: this.materialId(),
        value,
      };
      onChange(event);
      this.setState({ fieldToShow: 'molar mass' });
    }
  }

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
  handleComponentReferenceChange = (changeEvent) => {
    if (changeEvent.type === 'componentReferenceChanged') {
      const { mixtureComponents } = this.state;
      const { onChange, material, materialGroup } = this.props;

      // Update the reference directly on the ComponentModel instances
      mixtureComponents.forEach((comp) => {
        const isReference = comp.id === changeEvent.componentId;
        if (comp.reference !== isReference) {
          comp.reference = isReference;
        }
      });

      // Trigger re-render with updated components
      this.setState({ mixtureComponents: [...mixtureComponents] });

      // Propagate the change up to notify the reaction that it has changed
      if (onChange) {
        onChange({
          ...changeEvent,
          sampleID: material.id,
          materialGroup
        });
      }
    }
  };

  handleComponentMetricsChange = (changeEvent) => {
    const { onChange, material, materialGroup } = this.props;
    if (onChange) {
      onChange({
        ...changeEvent,
        sampleID: material.id,
        materialGroup
      });
    }
  };

  materialVolume(material, className) {
    const { reaction, materialGroup, lockEquivColumn } = this.props;
    if (material.contains_residues) {
      return notApplicableInput(className);
    }
    const {
      density, molarity_value, molarity_unit, has_density, has_molarity
    } = material;
    const tooltip = has_density || has_molarity ? (
      <Tooltip id="density_info">
        {has_density
          ? `density: ${density}`
          : `molarity = ${molarity_value} ${molarity_unit}`}
      </Tooltip>
    ) : (
      <Tooltip id="density_info">no density or molarity defined</Tooltip>
    );

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[1]) > -1)
      ? material.metrics[1]
      : 'm';
    const isAmountDisabledByWeightPercentage = reaction.weight_percentage
      && material.weight_percentage > 0;

    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <div>
          <NumeralInputWithUnitsCompo
            className={className}
            value={material.amount_l}
            unit="l"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={3}
            disabled={!permitOn(reaction)
              || isAmountDisabledByWeightPercentage
              || ((materialGroup !== 'products')
                && !material.reference && lockEquivColumn)
              || material.gas_type === 'gas'}
            onChange={(e) => this.handleAmountUnitChange(e, material.amount_l)}
            onMetricsChange={this.handleMetricsChange}
            variant={material.amount_unit === 'l' ? 'primary' : 'light'}
            size="sm"
          />
        </div>
      </OverlayTrigger>
    );
  }

  materialAmountMol(material) {
    const { reaction, materialGroup, lockEquivColumn } = this.props;
    const metricMol = getMetricMol(material);

    const isAmountDisabledByWeightPercentage = reaction.weight_percentage
      && material.weight_percentage > 0;

    const isDisabled = !permitOn(reaction)
      || isAmountDisabledByWeightPercentage
      || (materialGroup === 'products'
      || (!material.reference && lockEquivColumn));

    return (
      <NumeralInputWithUnitsCompo
        value={material.amount_mol}
        className="reaction-material__molarity-data"
        unit="mol"
        metricPrefix={metricMol}
        metricPrefixes={metricPrefixesMol}
        precision={4}
        disabled={isDisabled}
        onChange={(e) => this.handleAmountUnitChange(e, material.amount_mol)}
        onMetricsChange={this.handleMetricsChange}
        variant={material.amount_unit === 'mol' ? 'primary' : 'light'}
        size="sm"
      />
    );
  }

  toggleComponentsAccordion() {
    this.setState((prevState, props) => {
      const nextOpen = !prevState.showComponents;
      try {
        const key = this.accordionStorageKey(props.material?.id);
        if (key) { window.localStorage.setItem(key, nextOpen ? 'true' : 'false'); }
      } catch (e) { /* ignore storage errors */ }
      return { showComponents: nextOpen };
    });
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
  fetchMixtureComponentsIfNeeded(material) {
    if (!material || !(material.isMixture && material.isMixture())) {
      this.setState({ mixtureComponents: [], mixtureComponentsLoading: false });
      return;
    }

    const existingComponents = Array.isArray(material.components) ? material.components : [];

    if (existingComponents.length > 0) {
      // Use existing components, deserializing if needed
      const componentsList = existingComponents.map((comp) => (
        comp instanceof ComponentModel ? comp : ComponentModel.deserializeData(comp)
      ));

      this.setState({
        mixtureComponents: componentsList,
        mixtureComponentsLoading: false,
      });
    } else if (typeof material.id === 'number') {
      // Fetch components for saved material
      this.setState({ mixtureComponentsLoading: true });

      ComponentsFetcher.fetchComponentsBySampleId(material.id)
        .then((components) => {
          const componentsList = components.map(ComponentModel.deserializeData);
          this.setState({
            mixtureComponents: componentsList,
            mixtureComponentsLoading: false,
          });
        })
        .catch((error) => {
          console.error('Error fetching components:', error);
          this.setState({ mixtureComponentsLoading: false });
        });
    } else {
      // No components and no ID, clear state
      this.setState({
        mixtureComponents: [],
        mixtureComponentsLoading: false,
      });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  accordionStorageKey(materialId) {
    if (!materialId) { return null; }
    return `mixture_components_accordion_open:${materialId}`;
  }

  restoreAccordionState(material) {
    try {
      const key = this.accordionStorageKey(material?.id);
      if (!key) { return; }
      const saved = window.localStorage.getItem(key);
      if (saved === 'true' || saved === 'false') {
        const showComponents = saved === 'true';
        if (this.state.showComponents !== showComponents) {
          this.setState({ showComponents });
        }
      }
    } catch (e) { /* ignore storage errors */ }
  }

  handleAmountTypeChange(e) {
    if (this.props.onChange && e) {
      const event = {
        amountType: e,
        type: 'amountTypeChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
      };
      this.props.onChange(event);
    }
  }

  handleCoefficientChange(e) {
    const { onChange, materialGroup } = this.props;
    const coefficient = e.value;
    if (onChange) {
      const event = {
        coefficient,
        type: 'coefficientChanged',
        materialGroup,
        sampleID: this.materialId(),
      };
      onChange(event);
    }
  }

  handleAmountUnitChange(e, value, amountType = null) {
    if (e.value === value) return;

    if (onChange && e) {
      const event = {
        amount: e,
        type: 'amountUnitChanged',
        materialGroup,
        sampleID: this.materialId(),
        amountType,
      };
      onChange(event);
    }
  }

  handleMetricsChange(e) {
    const { materialGroup, onChange } = this.props;
    if (onChange && e) {
      const event = {
        metricUnit: e.metricUnit,
        metricPrefix: e.metricPrefix,
        type: 'MetricsChanged',
        materialGroup,
        sampleID: this.materialId(),
      };
      onChange(event);
    }
  }

  gasFieldsUnitsChanged(e, field) {
    const { materialGroup, onChange } = this.props;
    if (onChange && e) {
      const event = {
        unit: e.metricUnit,
        value: e.value === '' ? 0 : e.value,
        field,
        type: 'gasFieldsUnitsChanged',
        materialGroup,
        sampleID: this.materialId(),
      };
      onChange(event);
    }
  }

  handleLoadingChange(newLoading) {
    this.props.material.residues[0].custom_info.loading = newLoading.value;

    // just recalculate value in mg using the new loading value
    if (this.props.onChange) {
      const event = {
        type: 'amountChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        amount: this.props.material.amount,
      };
      this.props.onChange(event);
    }
  }

  handleEquivalentChange(e) {
    const { onChange, materialGroup } = this.props;
    const equivalent = e.value;
    if (onChange && e) {
      const event = {
        type: 'equivalentChanged',
        materialGroup,
        sampleID: this.materialId(),
        equivalent,
      };
      onChange(event);
    }
  }

  handleEquivalentWeightPercentageChange(material, field) {
    this.setState({ fieldToShow: field });
    if (field === 'weight percentage') {
      if (material.reference) {
        this.handleEquivalentChange({ value: 1 });
      } else if (!material.weight_percentage_reference) {
        this.handleEquivalentChange({ value: 0 });
      }
    } else if (field === 'molar mass') {
      if (!material.reference) {
        if (material.weight_percentage_reference) {
          this.handleWeightPercentageChange(1);
        } else {
          this.handleWeightPercentageChange(null);
        }
      }
    }
  }

  handleWeightPercentageChange(e) {
    const { onChange, materialGroup } = this.props;
    const weightPercentage = e;
    if (onChange) {
      const event = {
        type: 'weightPercentageChanged',
        materialGroup,
        sampleID: this.materialId(),
        weightPercentage
      };
      onChange(event);
    }
  }

  handleConversionRateChange(e) {
    const { onChange, materialGroup } = this.props;
    const conversionRate = e.value;
    if (onChange && e) {
      const event = {
        type: 'conversionRateChanged',
        materialGroup,
        sampleID: this.materialId(),
        conversionRate,
      };
      onChange(event);
    }
  }

  handleGasFieldsChange(field, e, currentValue) {
    const { materialGroup, onChange } = this.props;
    if (
      onChange
      && e.value !== undefined
      && e.unit !== undefined
      && e.value !== currentValue
    ) {
      const event = {
        type: 'gasFieldsChanged',
        materialGroup,
        sampleID: this.materialId(),
        value: e.value,
        unit: e.unit,
        field,
      };
      onChange(event);
    }
  }

  createParagraph(m) {
    const { materialGroup } = this.props;
    let molName = m.molecule_name_hash.label;
    if (!molName) { molName = m.molecule.iupac_name; }
    if (!molName) { molName = m.molecule.sum_formular; }

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

  handleAddToDesc(material) {
    const { onChange } = this.props;

    if (onChange) {
      const event = {
        type: 'addToDesc',
        paragraph: this.createParagraph(material),
      };
      onChange(event);
    }
  }

  handleDrySolventChange(event) {
    const value = event.target.checked;
    const { onChange, materialGroup } = this.props;

    if (onChange) {
      const e = {
        type: 'drysolventChanged',
        materialGroup,
        sampleID: this.materialId(),
        dry_solvent: value,
      };
      onChange(e);
    }
  }

  materialId() {
    return this.material().id;
  }

  material() {
    const { material } = this.props;

    return material;
  }

  massField(material, metricPrefixes, reaction, massBsStyle, metric) {
    const { lockEquivColumn, materialGroup } = this.props;

    const tooltip = (
      <Tooltip id="molecular-weight-info">
        {'molar mass: '}
        {this.molarWeightValue(material, reaction)}
      </Tooltip>
    );

    const isAmountDisabledByWeightPercentage = reaction.weight_percentage
      && material.weight_percentage > 0 && !material.weight_percentage_reference;
    return (
      <OverlayTrigger
        delay="100"
        placement="top"
        overlay={tooltip}
      >
        <div>
          <NumeralInputWithUnitsCompo
            className="reaction-material__mass-data"
            value={material.amount_g}
            unit="g"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={4}
            disabled={
              isAmountDisabledByWeightPercentage
              || !permitOn(reaction)
              || (materialGroup !== 'products' && !material.reference && lockEquivColumn)
              || material.gas_type === 'feedstock'
              || material.gas_type === 'gas'
            }
            onChange={(e) => this.debounceHandleAmountUnitChange(e, material.amount_g, material.amountType)}
            onMetricsChange={this.handleMetricsChange}
            variant={material.error_mass ? 'error' : massBsStyle}
            size="sm"
            name="molecular-weight"
          />
        </div>
      </OverlayTrigger>
    );
  }

  dragHandle() {
    const { dragRef } = this.props;

    return (
      <DragHandle ref={dragRef} />
    );
  }

  rowClassNames() {
    const { isDragging, isOver, canDrop } = this.props;
    return cs(
      'reaction-material pseudo-table__row',
      {
        'draggable-list-item--is-dragging': isDragging,
        'draggable-list-item--is-over': isOver,
        'draggable-list-item--can-drop': canDrop,
      }
    );
  }

  generalMaterial() {
    const {
      material,
      materialGroup,
      deleteMaterial,
      showLoadingColumn,
      reaction,
      dropRef,
    } = this.props;

    const massBsStyle = material.amount_unit === 'g' ? 'primary' : 'light';
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (
      material.metrics
      && material.metrics.length > 2
      && metricPrefixes.indexOf(material.metrics[0]) > -1
    ) ? material.metrics[0] : 'm';

    const { showComponents, mixtureComponentsLoading } = this.state;
    const isMixture = material.isMixture && material.isMixture();
    // Always get fresh components from material, syncing with state
    const existingComponents = Array.isArray(material.components) ? material.components : [];
    const currentComponents = existingComponents.map((comp) => (
      comp instanceof ComponentModel
        ? comp
        : ComponentModel.deserializeData(comp)
    ));
    const mixtureComponents = currentComponents;
    const hasComponents = mixtureComponents && mixtureComponents.length > 0;

    const materialRow = (
      <div ref={dropRef} className={this.rowClassNames()}>
        {this.dragHandle()}
        {this.materialNameWithIupac(material)}
        <div className="d-flex flex-column gap-1 py-1">
          {/* Flex container with flex-column because products can display extra rows */}
          <div className="d-flex gap-2 align-items-start">
            {this.materialRef(material)}
            {this.switchTargetReal()}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="reaction-coefficient-info"> Reaction Coefficient </Tooltip>}
            >
              <div>
                <NumeralInputWithUnitsCompo
                  className="reaction-material__coefficient-data"
                  size="sm"
                  value={material.coefficient ?? 1}
                  onChange={this.handleCoefficientChange}
                  name="coefficient"
                />
              </div>
            </OverlayTrigger>
            <div className="reaction-material__amount-data">
              {this.massField(material, metricPrefixes, reaction, massBsStyle, metric)}
              {this.materialVolume(material, 'reaction-material__volume-data')}
              {this.materialAmountMol(material)}
            </div>
            <div className="reaction-material__molar-mass-data">
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip id="molar-weight-details">{this.molarWeightValue(material, reaction)}</Tooltip>}
              >
                <span>{this.molarWeightValue(material, reaction, true)}</span>
              </OverlayTrigger>
            </div>
            <div className="reaction-material__density-data">
              {material.has_density ? material.density : 'undefined'}
            </div>
            <div className="reaction-material__purity-data">
              {material.purity}
            </div>
            {this.materialLoading(material, showLoadingColumn)}
            {this.materialConcentration(material)}
            {this.equivalentOrYield(material)}
            <div className="reaction-material__delete-data">
              <DeleteButton
                disabled={!permitOn(reaction)}
                onClick={() => deleteMaterial(material)}
              />
            </div>
          </div>
          {materialGroup === 'products' && (
            <>
              {material.gas_type === 'gas' && reaction.gaseous && this.gaseousProductRow(material)}
              {material.adjusted_loading && material.error_mass && <MaterialCalculations material={material} />}
            </>
          )}
        </div>
      </div>
    );

    return (
      <>
        {materialRow}

        {isMixture && hasComponents && (
          <Accordion
            className="mixture-components-accordion"
            activeKey={showComponents ? 'components' : null}
            onSelect={this.toggleComponentsAccordion}
          >
            <Accordion.Item eventKey="components">
              <Accordion.Header className="normal-text-width">Components</Accordion.Header>
              <Accordion.Body>
                <div className="mixture-components-row">
                  {mixtureComponentsLoading ? (
                    <div className="text-center">Loading components...</div>
                  ) : (
                    <ReactionMaterialComponentsGroup
                      components={mixtureComponents}
                      solvents={material.solvent}
                      sampleId={material.id}
                      onComponentReferenceChange={this.handleComponentReferenceChange}
                      onComponentMetricsChange={this.handleComponentMetricsChange}
                    />
                  )}
                </div>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        )}
      </>
    );
  }

  molarWeightValue(sample, reaction, formatted = false) {
    const isProduct = reaction.products.includes(sample);
    let molecularWeight = sample.decoupled
      ? sample.molecular_mass
      : (sample.molecule && sample.molecule.molecular_weight);
    if (sample.isMixture() && sample.reference_relative_molecular_weight) {
      molecularWeight = sample.reference_relative_molecular_weight.toFixed(4);
    }
    let theoreticalMassPart = '';
    if (isProduct && sample.maxAmount) {
      theoreticalMassPart = `, max theoretical mass: ${Math.round(sample.maxAmount * 10000) / 10} mg`;
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

  toggleTarget(isTarget) {
    // allow switching target/real for all materials
    this.handleAmountTypeChange(!isTarget ? 'target' : 'real');
  }

  solventMaterial() {
    const {
      material,
      deleteMaterial,
      reaction,
      materialGroup,
      dropRef,
    } = this.props;

    const mw = material.molecule && material.molecule.molecular_weight;
    const drySolvTooltip = <Tooltip>Dry Solvent</Tooltip>;
    return (
      <div ref={dropRef} className={this.rowClassNames()}>
        {this.dragHandle()}
        {this.materialNameWithIupac(material)}
        <div className="reaction-material__dry-solvent-data">
          <OverlayTrigger placement="top" overlay={drySolvTooltip}>
            <Form.Check
              type="checkbox"
              checked={material.dry_solvent}
              onChange={(event) => this.handleDrySolventChange(event)}
              className="ms-1"
            />
          </OverlayTrigger>
        </div>
        {this.switchTargetReal()}
        <InputGroup className="reaction-material__solvent-label-data">
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="molecular-weight-info">
                {material.amount_g}
                g -
                {mw}
                g/mol
              </Tooltip>
            )}
          >
            <Form.Control
              disabled={!permitOn(reaction)}
              type="text"
              size="sm"
              value={material.external_label}
              placeholder={material.molecule.iupac_name}
              onChange={(event) => this.handleExternalLabelChange(event)}
            />
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={refreshSvgTooltip}>
            <Button
              disabled={materialGroup === 'purification_solvents' || !permitOn(reaction)}
              onClick={(e) => this.handleExternalLabelCompleted(e)}
              size="sm"
            >
              <i className="fa fa-refresh" />
            </Button>
          </OverlayTrigger>
        </InputGroup>
        {this.materialVolume(material, 'reaction-material__solvent-volume-data')}
        <Form.Control
          className="reaction-material__volume-ratio-data"
          type="text"
          size="sm"
          value={reaction.volumeRatioByMaterialId(material.id)}
          disabled
        />
        <DeleteButton
          disabled={!permitOn(reaction)}
          onClick={() => deleteMaterial(material)}
        />
      </div>
    );
  }

  switchTargetReal() {
    const { reaction, material } = this.props;
    const isTarget = material.amountType === 'target';
    const isDisabled = !permitOn(reaction);

    return (
      <Button
        className="reaction-material__target-data"
        disabled={isDisabled}
        onClick={() => this.toggleTarget(isTarget)}
        variant={isTarget ? 'primary' : 'light'}
        size="sm"
      >
        {isTarget ? 'T' : 'R'}
      </Button>
    );
  }

  handleGasTypeChange(gasType, value) {
    const { materialGroup, onChange } = this.props;
    if (onChange) {
      const event = {
        type: gasType,
        materialGroup,
        sampleID: this.materialId(),
        value,
      };
      onChange(event);
    }
  }

  gasType(material) {
    let gasTypeValue = material.gas_type || 'off';
    let tooltipText = 'This material is currently marked as non gaseous type';
    if (material.gas_type === 'off') {
      gasTypeValue = 'off';
    } else if (material.gas_type === 'gas') {
      gasTypeValue = 'gas';
      tooltipText = 'Gas';
    } else if (material.gas_type === 'feedstock') {
      gasTypeValue = 'FES';
      tooltipText = 'Feedstock reference';
    } else if (material.gas_type === 'catalyst') {
      gasTypeValue = 'CAT';
      tooltipText = 'Catalyst reference';
    }
    const gasTypes = ['feedstock', 'catalyst', 'gas'];
    const gasTypeStatus = gasTypes.includes(material?.gas_type);
    const feedstockStatus = gasTypeStatus ? '#009a4d' : 'grey';
    const tooltip = <Tooltip id="feedstockGas">{tooltipText}</Tooltip>;
    return (
      <div className="pe-1">
        <OverlayTrigger placement="bottom" overlay={tooltip}>
          <Button
            variant="primary"
            size="xsm"
            onClick={() => this.handleGasTypeChange('gasType', gasTypeValue)}
            disabled={false}
            style={{ backgroundColor: feedstockStatus }}
          >
            {gasTypeValue}
          </Button>
        </OverlayTrigger>
      </div>
    );
  }

  materialNameWithIupac(material) {
    const { index, materialGroup, reaction } = this.props;

    // Check if the material is a mixture
    const isMixture = material.isMixture();

    // Skip shortLabel for reactants and solvents/purification_solvents, and mixtures
    const skipIupacName = (
      materialGroup === 'reactants'
      || materialGroup === 'solvents'
      || materialGroup === 'purification_solvents'
      || isMixture
    );

    let materialName = '';
    let moleculeIupacName = '';

    const idCheck = /^\d+$/;
    let linkDisplayName = true;
    let materialDisplayName = '';

    if (skipIupacName) {
      if (isMixture) {
        // For mixtures, show the sample name or short label directly
        materialDisplayName = material.name || material.short_label;
      } else {
        materialDisplayName = material.molecule_iupac_name || material.name;
        if (materialGroup === 'solvents' || materialGroup === 'purification_solvents') {
          materialDisplayName = material.external_label || materialDisplayName;
        }
      }

      if (materialDisplayName === null || materialDisplayName === '') {
        materialDisplayName = (
          <SampleName sample={material} />
        );
      }
      linkDisplayName = !!idCheck.test(material.id)
    } else {
      moleculeIupacName = material.molecule_iupac_name;
      materialDisplayName = material.title() === ''
        ? <SampleName sample={material} />
        : material.title();
      materialName = (
        <a
          role="link"
        >
          <span>{materialDisplayName}</span>
        </a>
      );

      linkDisplayName = !material.isNew;
    }
    materialName = linkDisplayName ? (
      <a
        role="link"
        tabIndex={0}
        onClick={() => this.handleMaterialClick(material)}
      >
        {materialDisplayName}
      </a>
    ) : materialDisplayName;

    const serialCode = SampleCode(index, materialGroup);

    const addToDesc = (e) => {
      e.stopPropagation();
      this.handleAddToDesc(material);
    };

    return (
      <div className="pseudo-table__cell pseudo-table__cell-title align-self-start">
        <div>
          <div className="d-flex align-items-center">
            {reaction.gaseous && materialGroup !== 'solvents'
              ? this.gasType(material) : null}
            <OverlayTrigger placement="top" overlay={AddtoDescToolTip}>
              <Button variant="light" size="xsm" className="me-1" onClick={addToDesc} disabled={!permitOn(reaction)}>
                {serialCode}
              </Button>
            </OverlayTrigger>
            <OverlayTrigger placement="bottom" overlay={iupacNameTooltip(material)}>
              <div className="reaction-material__link">
                {materialName}
              </div>
            </OverlayTrigger>
          </div>
          {moleculeIupacName !== '' && (
            <div className="reaction-material__iupac-name">
              {moleculeIupacName}
            </div>
          )}
        </div>
      </div>
    );
  }

  /**
   * Renders a radio button for selecting this product material as the weight percentage reference.
   *
   * This radio button appears only when weight percentage mode is enabled for the reaction.
   * When checked, this material becomes the reference product used for weight percentage calculations.
   *
   * @param {Object} material - The current material to render the reference radio for
   * @param {Object} reaction - The parent reaction object
   * @returns {JSX.Element} Radio button with tooltip or empty div if weight percentage mode is disabled
   */
  renderProductReference(material, reaction) {
    return (
      reaction.weight_percentage ? (
        <div>
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="weight-percentage-reference-tooltip">
                Select as reference product for weight percentage
              </Tooltip>
            )}
          >
            <Form.Check
              type="radio"
              disabled={!permitOn(reaction)}
              name="weightPercentageReference"
              checked={material.weight_percentage_reference}
              onChange={(e) => this.handleReferenceChange(e, 'weightPercentageReferenceChanged')}
              size="sm"
              className="reaction-material__custom-radio m-1"
            />
          </OverlayTrigger>
        </div>
      ) : <div aria-label="Empty cell" />
    );
  }

  /**
   * Renders a nested dual-radio system for selecting material and weight percentage references.
   *
   * This creates a two-level radio button structure:
   * - Outer radio: Selects this material as the weight percentage reference
   * - Inner radio: Selects this material as the limiting reagent reference (standard reference)
   *
   * Visual hierarchy:
   * - Outer circle: Weight percentage reference selection (affects amount calculations)
   * - Inner circle: Standard reference selection (affects amount calculations)
   *
   * Interaction:
   * - Clicking outer radio: Sets weight percentage reference
   * - Clicking inner radio: Sets standard reference (prevents event propagation to outer)
   * - Supports keyboard navigation (Enter/Space keys)
   *
   * Styling:
   * - Dynamic class names based on checked state and disabled state
   * - Outer gets 'checked' class when material.weight_percentage_reference is true
   * - Inner gets 'checked' class when material.reference is true
   *
   * @param {Object} material - The current material to render reference radios for
   * @param {Object} reaction - The parent reaction object
   * @returns {JSX.Element} Nested radio button structure with accessibility support
   */
  renderNestedReferenceRadios(material, reaction) {
    const isDisabled = !permitOn(reaction);

    const outerClassNames = [
      'reaction-material__nested-radio-outer',
      material.weight_percentage_reference ? 'checked' : '',
      isDisabled ? 'disabled' : ''
    ].filter(Boolean).join(' ');

    const innerClassNames = [
      'reaction-material__nested-radio-inner',
      material.reference ? 'checked' : '',
      isDisabled ? 'disabled' : ''
    ].filter(Boolean).join(' ');

    const handleOuterClick = (e) => {
      e.preventDefault();
      if (isDisabled) {
        return;
      }
      this.handleReferenceChange(e, 'weightPercentageReferenceChanged');
    };

    const handleInnerClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDisabled) {
        return;
      }
      this.handleReferenceChange(e, null);
    };

    const handleKeyDown = (handler) => (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handler(e);
      }
    };

    return (
      <OverlayTrigger
        placement="top"
        overlay={(
          <Tooltip id="nested-reference-tooltip">
            Outer Circle: Select Weight % Reference
            <br />
            Inner Circle: Select Molar Reference
          </Tooltip>
        )}
      >
        <div className="reaction-material__nested-radio-container m-1">
          <div
            className={outerClassNames}
            onClick={handleOuterClick}
            onKeyDown={handleKeyDown(handleOuterClick)}
            tabIndex={0}
            role="radio"
            aria-checked={material.weight_percentage_reference}
            aria-label="Weight percentage reference"
          />
          <div
            className={innerClassNames}
            onClick={handleInnerClick}
            onKeyDown={handleKeyDown(handleInnerClick)}
            tabIndex={0}
            role="radio"
            aria-checked={material.reference}
            aria-label="Molar reference"
          />
        </div>
      </OverlayTrigger>
    );
  }

  render() {
    const { materialGroup } = this.props;

    const sp = materialGroup === 'solvents' || materialGroup === 'purification_solvents';
    return sp
      ? this.solventMaterial()
      : this.generalMaterial();
  }
}

export default Material;

Material.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  material: PropTypes.instanceOf(Sample).isRequired,
  materialGroup: PropTypes.string.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.bool.isRequired,
  index: PropTypes.number.isRequired,
  lockEquivColumn: PropTypes.bool.isRequired,
  displayYieldField: PropTypes.bool,
  dragRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
  dropRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) })
  ]).isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  isDragging: PropTypes.bool.isRequired,
};

Material.defaultProps = {
  lockEquivColumn: false,
  displayYieldField: false,
  isDragging: false,
  canDrop: false,
  isOver: false,
};
