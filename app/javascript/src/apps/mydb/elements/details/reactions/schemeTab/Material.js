import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Form,
  Button,
  InputGroup,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { debounce } from 'lodash';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import SampleName from 'src/components/common/SampleName';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { UrlSilentNavigation, SampleCode } from 'src/utilities/ElementUtils';
import { correctPrefix, validDigit } from 'src/utilities/MathUtils';
import { getMetricMol, metricPrefixesMol } from 'src/utilities/MetricsUtils';
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import { permitCls, permitOn } from 'src/components/common/uis';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import { calculateFeedstockMoles } from 'src/utilities/UnitsConversion';
import ReactionMaterialComponentsGroup
  from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionMaterialComponentsGroup';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import ComponentModel from 'src/models/Component';

const matSource = {
  beginDrag(props) {
    return props;
  },
};

const matTarget = {
  drop(tagProps, monitor) {
    const { dropSample, dropMaterial } = tagProps;
    const srcItem = monitor.getItem();
    const srcType = monitor.getItemType();

    if (srcType === DragDropItemTypes.SAMPLE) {
      dropSample(
        srcItem.element,
        tagProps.material,
        tagProps.materialGroup,
      );
    } else if (srcType === DragDropItemTypes.MOLECULE) {
      dropSample(
        srcItem.element,
        tagProps.material,
        tagProps.materialGroup,
        null,
        true,
      );
    } else if (srcType === DragDropItemTypes.MATERIAL) {
      dropMaterial(
        srcItem.material,
        srcItem.materialGroup,
        tagProps.material,
        tagProps.materialGroup,
      );
    }
  },
  canDrop(tagProps, monitor) {
    const srcType = monitor.getItemType();
    const isCorrectType = srcType === DragDropItemTypes.MATERIAL
      || srcType === DragDropItemTypes.SAMPLE
      || srcType === DragDropItemTypes.MOLECULE;
    return isCorrectType;
  },
};

const matSrcCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

const matTagCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
});

const notApplicableInput = () => (
  <td>
    <Form.Control
      size="sm"
      type="text"
      value="n/a"
      disabled
      className="text-align-center"
    />
  </td>
);

const iupacNameTooltip = material => (
  <Tooltip id="iupac_name_tooltip" className="left_tooltip">
    <table>
      <tbody>
      <tr><td>IUPAC&#58;&nbsp;</td><td style={{ wordBreak: 'break-all' }}>{material.molecule.iupac_name || ''}</td></tr>
      <tr><td>Name&#58;&nbsp;</td><td style={{ wordBreak: 'break-all' }}>{material.name || ''}</td></tr>
      <tr><td>Ext.Label&#58;&nbsp;</td><td style={{ wordBreak: 'break-all' }}>{material.external_label || ''}</td></tr>
      <tr><td>Short Label&#58;&nbsp;</td><td style={{ wordBreak: 'break-all' }}>{material.short_label || ''}</td></tr>
      </tbody>
    </table>
  </Tooltip>);

const refreshSvgTooltip = (
  <Tooltip id="refresh_svg_tooltip">Refresh reaction diagram</Tooltip>
);

const AddtoDescToolTip = (
  <Tooltip id="tp-spl-code" className="left_tooltip">
    Add to description or additional information for publication and purification
    details
  </Tooltip>
);

class Material extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showComponents: false,
      mixtureComponents: [],
      mixtureComponentsLoading: false,
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
  }

  componentDidUpdate(prevProps) {
    const { material } = this.props;
    if (prevProps.material.id !== material.id) {
      this.fetchMixtureComponentsIfNeeded(material);
    }
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
      return notApplicableInput();
    }

    return (
      <td>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.loading}
          unit="mmol/g"
          metricPrefix="n"
          metricPrefixes={['n']}
          variant={material.error_loading ? 'error' : 'primary'}
          size="sm"
          precision={3}
          disabled={!permitOn(this.props.reaction) || (this.props.materialGroup === 'products' || (!material.reference && this.props.lockEquivColumn))}
          onChange={(loading) => this.handleLoadingChange(loading)}
        />
      </td>
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
    const { mixtureComponents } = this.state;

    const metricPrefixesMolConc = ['m', 'n'];
    const metricMolConc = (
      material.metrics
      && material.metrics.length > 3
      && metricPrefixesMolConc.indexOf(material.metrics[3]) > -1
    )
      ? material.metrics[3]
      : 'm';

    const isMixture = material.isMixture && material.isMixture();

    let value;
    if (isMixture) {
      // For mixtures, find the reference component and use its concentration
      const referenceComponent = mixtureComponents.find((component) => component.reference);
      value = referenceComponent ? referenceComponent.concn : 'n.d';
    } else {
      value = material.concn;
    }

    return (
      <td className="text-nowrap">
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={value}
          unit="mol/l"
          metricPrefix={metricMolConc}
          metricPrefixes={metricPrefixesMolConc}
          precision={4}
          disabled
          onChange={(e) => this.handleAmountUnitChange(e, material.concn)}
          onMetricsChange={this.handleMetricsChange}
          size="sm"
          className="w-100"
        />
      </td>
    );
  }

  materialRef(material) {
    const { materialGroup } = this.props;

    return (
      materialGroup === 'products'
        ? <td />
        : (
          <td>
            <Form.Check
              type="radio"
              disabled={!permitOn(this.props.reaction)}
              name="reference"
              value={material.id}
              checked={material.reference}
              onChange={(e) => this.handleReferenceChange(e)}
              size="sm"
              className="m-1"
            />
          </td>
        )
    );
  }

  materialShowLabel(material) {
    return (
      <Button
        className="p-1 ms-1"
        onClick={(e) => this.handleShowLabelChange(e)}
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
    let calculateYield = material.equivalent;
    if (material.gas_type === 'gas') {
      calculateYield = this.recalculateYieldForGasProduct(material, reaction);
    } else if (reaction.hasPolymers()) {
      calculateYield = `${((material.equivalent || 0) * 100).toFixed(0)}%`;
    } else if (refMaterial && (refMaterial.decoupled || material.decoupled)) {
      calculateYield = 'n.a.';
    } else if (material.purity < 1 && material.equivalent > 1) {
      calculateYield = `${((material.purity / 100 * (material.amount_g * 1000)) * 100).toFixed(1)}%`;
    } else {
      calculateYield = `${((material.equivalent <= 1 ? material.equivalent || 0 : 1) * 100).toFixed(0)}%`;
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
      <div>
        <NumeralInputWithUnitsCompo
          precision={4}
          value={allowedConversionRateValue || 'n.d.'}
          unit="%"
          disabled={!permitOn(reaction)}
          onChange={(e) => this.handleConversionRateChange(e)}
          size="sm"
        />
      </div>
    );
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
    // For mixtures, set the initial value to 1 if no value is provided
    const isMixture = material.isMixture && material.isMixture();
    let value = material.equivalent;
    if (isMixture) {
      value = 1;
    }
    return (
      <NumeralInputWithUnitsCompo
        size="sm"
        precision={4}
        value={value}
        disabled={
          !permitOn(reaction)
          || (((material.reference || false) && value) !== false)
          || lockEquivColumn
        }
        onChange={(e) => this.handleEquivalentChange(e)}
      />
    );
  }

  gaseousInputFields(field, material) {
    const gasPhaseData = material.gas_phase_data || {};
    const { value, unit, isTimeField } = this.getFieldData(field, gasPhaseData);

    const style = { maxWidth: '5px', paddingRight: '3px' };
    const colSpan = isTimeField ? '2' : '1';
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
      <td colSpan={colSpan} style={style}>
        <div>
          {(value === 'n.d' || !value) && !noSwitchUnits.includes(unit) ? (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id={`${field}-tooltip`}>{message}</Tooltip>}
            >
              <div>{inputComponent}</div>
            </OverlayTrigger>
          ) : (
            <div>{inputComponent}</div>
          )}
        </div>
      </td>
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
    if (!value && value !== 0) {
      return 'n.d';
    }
    return value || 0;
  }

  // eslint-disable-next-line class-methods-use-this
  pseudoField() {
    return (
      <td>
        <span style={{ opacity: 0 }} />
      </td>
    );
  }

  gaseousProductRow(material) {
    const { materialGroup } = this.props;
    if (materialGroup === 'products') {
      return (
        <tr style={{ width: '100%' }}>
          {this.pseudoField()}
          {this.pseudoField()}
          {this.pseudoField()}
          {this.pseudoField()}
          {this.gaseousInputFields('time', material)}
          {this.gaseousInputFields('temperature', material)}
          {this.gaseousInputFields('part_per_million', material)}
          {this.gaseousInputFields('turnover_number', material)}
          {this.gaseousInputFields('turnover_frequency', material)}
        </tr>
      );
    }
    return null;
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

  handleReferenceChange(e) {
    const value = e.target.value;
    if (this.props.onChange) {
      const event = {
        type: 'referenceChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        value,
      };
      this.props.onChange(event);
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

      const updatedComponents = mixtureComponents.map((comp) => {
        const isReference = comp.id === changeEvent.componentId;
        if (comp.reference !== isReference) {
          comp.reference = isReference; // Preserve instance, avoid unnecessary mutation
        }
        return comp;
      });

      this.setState({ mixtureComponents: [...updatedComponents] });

      // Optionally, propagate up:
      // if (this.props.onChange) {
      //   this.props.onChange(changeEvent);
      // }
    }
  };

  materialVolume(material) {
    if (material.contains_residues) {
      return notApplicableInput();
    }
    const {
      density, molarity_value, molarity_unit, has_density, has_molarity
    } = material;
    const tooltip = has_density || has_molarity ? (
      <Tooltip id="density_info">
        {has_density
          ? `density = ${density}`
          : `molarity = ${molarity_value} ${molarity_unit}`}
      </Tooltip>
    ) : (
      <Tooltip id="density_info">no density or molarity defined</Tooltip>
    );

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[1]) > -1)
      ? material.metrics[1]
      : 'm';

    return (
      <td>
        <OverlayTrigger placement="top" overlay={tooltip}>
          <div>
            <NumeralInputWithUnitsCompo
              key={material.id}
              value={material.amount_l}
              unit="l"
              metricPrefix={metric}
              metricPrefixes={metricPrefixes}
              precision={3}
              disabled={!permitOn(this.props.reaction)
                || ((this.props.materialGroup !== 'products')
                  && !material.reference && this.props.lockEquivColumn)
                || material.gas_type === 'gas'}
              onChange={(e) => this.handleAmountUnitChange(e, material.amount_l)}
              onMetricsChange={this.handleMetricsChange}
              variant={material.amount_unit === 'l' ? 'primary' : 'light'}
              size="sm"
            />
          </div>
        </OverlayTrigger>
      </td>
    );
  }

  materialAmountMol(material) {
    const { reaction, materialGroup, lockEquivColumn } = this.props;
    const metricMol = getMetricMol(material);

    const isDisabled = !permitOn(reaction)
      || (materialGroup === 'products'
      || (!material.reference && lockEquivColumn)
      || (material.isMixture && material.isMixture()));

    return (
      <td>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.amount_mol}
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
      </td>
    );
  }

  toggleComponentsAccordion() {
    this.setState((prevState) => ({ showComponents: !prevState.showComponents }));
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

  handleShowLabelChange(e) {
    const value = e.target.checked;
    if (this.props.onChange) {
      const event = {
        type: 'showLabelChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        value,
      };
      this.props.onChange(event);
    }
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

  handleAmountUnitChange(e, value) {
    if (e.value === value) return;
    if (this.props.onChange && e) {
      const event = {
        amount: e,
        type: 'amountUnitChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
      };
      this.props.onChange(event);
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
    const equivalent = e.value;
    if (this.props.onChange && e) {
      const event = {
        type: 'equivalentChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        equivalent,
      };
      this.props.onChange(event);
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
    if (!molName) {
      molName = m.molecule.iupac_name;
    }
    if (!molName) {
      molName = m.molecule.sum_formular;
    }

    const gUnit = correctPrefix(m.amount_g, 3);
    const lUnit = correctPrefix(m.amount_l, 3);
    const molUnit = correctPrefix(m.amount_mol, 3); // ELN issue#829

    const grm = gUnit ? `${gUnit}g, ` : '';
    const vol = lUnit ? `${lUnit}L, ` : '';
    const solVol = vol.slice(0, -2);
    const mol = molUnit ? `${molUnit}mol, ` : '';
    const mlt = m.molarity_value === 0.0 ? '' : `${validDigit(m.molarity_value, 3)} ${m.molarity_unit}, `;
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
    if (this.props.onChange) {
      const event = {
        type: 'addToDesc',
        paragraph: this.createParagraph(material),
      };
      this.props.onChange(event);
    }
  }

  handleDrySolventChange(event) {
    const value = event.target.checked;
    if (this.props.onChange) {
      const e = {
        type: 'drysolventChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
        dry_solvent: value,
      };
      this.props.onChange(e);
    }
  }

  materialId() {
    return this.material().id;
  }

  material() {
    return this.props.material;
  }

  amountField(material, metricPrefixes, reaction, massBsStyle, metric) {
    const { lockEquivColumn, materialGroup } = this.props;

    const tooltip = (
      <Tooltip id="molecular-weight-info">
        {this.generateMolecularWeightTooltipText(material, reaction)}
      </Tooltip>
    );

    return (
      <OverlayTrigger
        delay={100}
        placement="top"
        overlay={tooltip}
      >
        <div>
          <NumeralInputWithUnitsCompo
            key={material.id}
            value={material.amount_g}
            unit="g"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={4}
            disabled={
              !permitOn(reaction)
              || (materialGroup !== 'products' && !material.reference && lockEquivColumn)
              || material.gas_type === 'feedstock'
              || material.gas_type === 'gas'
            }
            onChange={(e) => this.debounceHandleAmountUnitChange(e, material.amount_g)}
            onMetricsChange={this.handleMetricsChange}
            variant={material.error_mass ? 'danger' : massBsStyle}
            size="sm"
            name="molecular-weight"
          />
        </div>
      </OverlayTrigger>
    );
  }

  generalMaterial(props, className) {
    const {
      material,
      deleteMaterial,
      connectDragSource,
      connectDropTarget,
      showLoadingColumn,
      reaction,
    } = this.props;
    const isTarget = material.amountType === 'target';
    const massBsStyle = material.amount_unit === 'g' ? 'primary' : 'light';

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[0]) > -1) ? material.metrics[0] : 'm';
    const metricPrefixesMol = ['m', 'n'];
    const metricMol = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[2]) > -1) ? material.metrics[2] : 'm';

    const inputsStyle = {
      paddingRight: 2,
      paddingLeft: 2,
    };

    const { showComponents, mixtureComponents, mixtureComponentsLoading } = this.state;
    const isMixture = material.isMixture && material.isMixture();
    const hasComponents = mixtureComponents && mixtureComponents.length > 0;

    return (
      <tbody>
        <tr className="m-1 p-1">
          {compose(connectDragSource, connectDropTarget)(
            <td className={`drag-source ${permitCls(reaction)} ${className}`}>
              <span className="text-info fa fa-arrows" />
            </td>,
            { dropEffect: 'copy' }
          )}

          <td style={{ width: '22%', maxWidth: '50px' }}>
            {this.materialNameWithIupac(material)}
          </td>

          {this.materialRef(material)}

          <td style={{ inputsStyle }}>
            {this.materialShowLabel(material)}
          </td>

          <td style={{ minWidth: '30px', inputsStyle }}>
            {this.switchTargetReal(isTarget)}
          </td>

          <td style={{ minWidth: '35px' }}>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="reaction-coefficient-info"> Reaction Coefficient </Tooltip>}
            >
              <div>
                <NumeralInputWithUnitsCompo
                  size="sm"
                  key={material.id}
                  value={material.coefficient ?? 1}
                  onChange={this.handleCoefficientChange}
                  name="coefficient"
                />
              </div>
            </OverlayTrigger>
          </td>

          <td>
            {this.amountField(material, metricPrefixes, reaction, massBsStyle, metric)}
          </td>

          {this.materialVolume(material)}

          {this.materialAmountMol(material)}

          {this.materialLoading(material, showLoadingColumn)}

          {this.materialConcentration(material)}

          <td>
            {this.equivalentOrYield(material)}
          </td>
          <td>
            <Button
              disabled={!permitOn(reaction)}
              variant="danger"
              size="sm"
              onClick={() => deleteMaterial(material)}
            >
              <i className="fa fa-trash-o" />
            </Button>
          </td>
        </tr>

        {/* Add a new row for the arrow button if mixture with components */}
        {isMixture && hasComponents && (
          <tr className="mixture-arrow-row">
            <td
              colSpan="14"
              style={{
                textAlign: 'center',
                background: '#f8f9fa',
                padding: '0',
                height: '22px',
              }}
            >
              <OverlayTrigger
                placement="top"
                overlay={(
                  <Tooltip id="mixture-components-tooltip">
                    {showComponents ? 'Hide the components' : 'See the components'}
                  </Tooltip>
                )}
              >
                <Button
                  variant="light"
                  size="sm"
                  style={{
                    fontSize: '1.05em',
                    color: '#007bff',
                    lineHeight: 1,
                    height: '20px',
                    minHeight: 'unset',
                    padding: '0 6px',
                  }}
                  onClick={this.toggleComponentsAccordion}
                  aria-label={showComponents ? 'Hide the components' : 'See the components'}
                >
                  <i className={`fa fa-angle-double-${showComponents ? 'up' : 'down'} text-primary`} />
                </Button>
              </OverlayTrigger>
            </td>
          </tr>
        )}

        {/* row for mixture components */}
        {isMixture && hasComponents && showComponents && (
          <tr className="mixture-components-row">
            <td colSpan="14" style={{ padding: 0, background: '#f8f9fa' }}>
              {mixtureComponentsLoading && (
                <div className="text-center">Loading components...</div>
              )}
              {!mixtureComponentsLoading && mixtureComponents.length > 0 && (
                <ReactionMaterialComponentsGroup
                  components={mixtureComponents}
                  reaction={reaction}
                  sampleId={`${material.id}`}
                  onComponentReferenceChange={this.handleComponentReferenceChange}
                />
              )}
              {!mixtureComponentsLoading && mixtureComponents.length === 0 && (
                <div className="text-center">
                  No components found for this mixture.
                </div>
              )}
            </td>
          </tr>
        )}
        {material.gas_type === 'gas' && reaction.gaseous && this.gaseousProductRow(material)}
      </tbody>
    );
  }

  generateMolecularWeightTooltipText(sample, reaction) {
    const isProduct = reaction.products.includes(sample);
    let molecularWeight = sample.decoupled
      ? sample.molecular_mass
      : sample.molecule && sample.molecule.molecular_weight;

    if (sample.isMixture() && sample.reference_molecular_weight) {
      molecularWeight = sample.reference_molecular_weight.toFixed(4);
    }

    let tooltip = `molar mass: ${molecularWeight} g/mol`;

    if (sample.isMixture() && sample.density != null && sample.density > 0) {
      tooltip += `, density: ${sample.density.toFixed(4)} g/mL`;
    }

    if (isProduct && sample.maxAmount) {
      const theoreticalMass = Math.round(sample.maxAmount * 10000) / 10;
      tooltip += `, max theoretical mass: ${theoreticalMass} mg`;
    }

    return tooltip;
  }

  toggleTarget(isTarget) {
    if (this.props.materialGroup !== 'products') {
      this.handleAmountTypeChange(!isTarget ? 'target' : 'real');
    }
  }

  solventMaterial(props, className) {
    const {
      material,
      deleteMaterial,
      connectDragSource,
      connectDropTarget,
      reaction,
      materialGroup,
    } = props;
    const isTarget = material.amountType === 'target';
    const mw = material.molecule && material.molecule.molecular_weight;
    const drySolvTooltip = <Tooltip>Dry Solvent</Tooltip>;
    return (
      <tr className="m-1 p-1">
        {compose(connectDragSource, connectDropTarget)(
          <td className={`drag-source ${permitCls(reaction)} ${className}`}>
            <span className="text-info fa fa-arrows" />
          </td>,
          { dropEffect: 'copy' }
        )}

        <td style={{ width: '22%', maxWidth: '50px' }}>
          {this.materialNameWithIupac(material)}
        </td>
        <td>
          <OverlayTrigger placement="top" overlay={drySolvTooltip}>
            <Form.Check
              type="checkbox"
              checked={material.dry_solvent}
              onChange={(event) => this.handleDrySolventChange(event)}
              className="ms-1"
            />
          </OverlayTrigger>
        </td>
        <td>
          {this.switchTargetReal(isTarget)}
        </td>

        <td>
          <InputGroup>
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="molecular-weight-info">{material.amount_g} g - {mw} g/mol</Tooltip>}
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
        </td>

        {this.materialVolume(material)}
        <td>
          <Form.Control
            type="text"
            size="sm"
            value={reaction.volumeRatioByMaterialId(material.id)}
            disabled
          />
        </td>
        <td>
          <Button
            disabled={!permitOn(reaction)}
            variant="danger"
            size="sm"
            onClick={() => deleteMaterial(material)}
          >
            <i className="fa fa-trash-o" />
          </Button>
        </td>
      </tr>
    );
  }

  switchTargetReal(isTarget) {
    return (
      <Button
        disabled={!permitOn(this.props.reaction)}
        className="p-1 ms-1"
        onClick={() => this.toggleTarget(isTarget)}
        variant={isTarget ? 'primary' : 'light'}
        size="sm"
      >
        {isTarget ? 't' : 'r'}
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
    // Skip shortLabel for reactants and solvents/purification_solvents
    const skipIupacName = (
      materialGroup === 'reactants' ||
      materialGroup === 'solvents' ||
      materialGroup === 'purification_solvents'
    );
    let materialName = '';
    let moleculeIupacName = '';
    const iupacStyle = {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%',
    };

    const idCheck = /^\d+$/;

    if (skipIupacName) {
      let materialDisplayName = material.molecule_iupac_name || material.name;
      if (materialGroup === 'solvents' || materialGroup === 'purification_solvents') {
        materialDisplayName = material.external_label || materialDisplayName;
      }
      if (materialDisplayName === null || materialDisplayName === '') {
        materialDisplayName = (
          <span>
            <SampleName sample={material} />
          </span>
        );
      }

      if (idCheck.test(material.id)) {
        materialName = (
          <a
            role="link"
            tabIndex={0}
            onClick={() => this.handleMaterialClick(material)}
          >
            <span>{materialDisplayName}</span>
          </a>
        );
      } else {
        materialName = <span>{materialDisplayName}</span>;
      }
    } else {
      moleculeIupacName = material.molecule_iupac_name;
      const materialDisplayName = material.title() === ''
        ? <SampleName sample={material} />
        : material.title();
      materialName = (
        <a
          role="link"
          tabIndex={0}
          onClick={() => this.handleMaterialClick(material)}
        >
          <span>{materialDisplayName}</span>
        </a>
      );

      if (material.isNew) {
        materialName = materialDisplayName;
      }
    }
    let br = <br />;
    if (moleculeIupacName === '') {
      iupacStyle.display = 'none';
      br = '';
    }
    const serialCode = SampleCode(index, materialGroup);

    const addToDesc = (e) => {
      e.stopPropagation();
      this.handleAddToDesc(material);
    };

    return (
      <div className="d-inline-block mw-100">
        <div className="inline-inside">
          {reaction.gaseous && materialGroup !== 'solvents'
            ? this.gasType(material)
            : null}
          <OverlayTrigger placement="top" overlay={AddtoDescToolTip}>
            <Button
              variant="light"
              size="xsm"
              className="me-1"
              onClick={addToDesc}
              disabled={!permitOn(reaction)}
            >
              {serialCode}
            </Button>
          </OverlayTrigger>
          <OverlayTrigger placement="bottom" overlay={iupacNameTooltip(material)}>
            <div className="reaction-material-link">
              {materialName}
            </div>
          </OverlayTrigger>
        </div>
        <span style={iupacStyle}>
          {moleculeIupacName}
        </span>
      </div>
    );
  }

  render() {
    const {
      material,
      isDragging,
      canDrop,
      isOver,
      materialGroup,
    } = this.props;
    let className = 'text-center';
    if (isDragging) {
      className += ' dnd-dragging';
    }
    if (canDrop) {
      className += ' border-3 border-dashed';
      if (isOver) {
        className += ' dnd-zone-over';
      }
    }

    if (this.props.materialGroup === 'products') {
      material.amountType = 'real'; // always take real amount for product
    }
    const sp = materialGroup === 'solvents' || materialGroup === 'purification_solvents';
    const component = sp
      ? this.solventMaterial(this.props, className)
      : this.generalMaterial(this.props, className);

    return component;
  }
}

export default compose(
  DragSource(
    DragDropItemTypes.MATERIAL,
    matSource,
    matSrcCollect,
  ),
  DropTarget(
    [DragDropItemTypes.SAMPLE, DragDropItemTypes.MOLECULE, DragDropItemTypes.MATERIAL],
    matTarget,
    matTagCollect,
  ),
)(Material);

Material.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  material: PropTypes.instanceOf(Sample).isRequired,
  materialGroup: PropTypes.string.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  showLoadingColumn: PropTypes.bool.isRequired,
  index: PropTypes.number,
  isDragging: PropTypes.bool,
  canDrop: PropTypes.bool,
  isOver: PropTypes.bool,
  lockEquivColumn: PropTypes.bool.isRequired,
  displayYieldField: PropTypes.bool,
};

Material.defaultProps = {
  lockEquivColumn: false,
  displayYieldField: false,
  isDragging: false,
  canDrop: false,
  isOver: false,
};
