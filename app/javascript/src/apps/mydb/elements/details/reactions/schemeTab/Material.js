import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
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
import { correctPrefix, validDigit } from 'src/utilities/MathUtils';
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import { permitCls, permitOn } from 'src/components/common/uis';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import { calculateFeedstockMoles } from 'src/utilities/UnitsConversion';
import cs from 'classnames';
import DragHandle from 'src/components/common/DragHandle';

const notApplicableInput = () => (
  <div>
    <Form.Control
      size="sm"
      type="text"
      value="n/a"
      disabled
      className='text-align-center'
    />
  </div>
);

const iupacNameTooltip = material => (
  <Tooltip id="iupac_name_tooltip" className="left_tooltip">
    <table>
      <div>
        <div><div>IUPAC&#58;&nbsp;</div><div style={{ wordBreak: 'break-all' }}>{material.molecule.iupac_name || ''}</div></div>
        <div><div>Name&#58;&nbsp;</div><div style={{ wordBreak: 'break-all' }}>{material.name || ''}</div></div>
        <div><div>Ext.Label&#58;&nbsp;</div><div style={{ wordBreak: 'break-all' }}>{material.external_label || ''}</div></div>
        <div><div>Short Label&#58;&nbsp;</div><div style={{ wordBreak: 'break-all' }}>{material.short_label || ''}</div></div>
      </div>
    </table>
  </Tooltip>);

const refreshSvgTooltip = <Tooltip id="refresh_svg_tooltip">Refresh reaction diagram</Tooltip>;

const AddtoDescToolTip = <Tooltip id="tp-spl-code" className="left_tooltip">Add to description or additional information for publication and purification details</Tooltip>;


class Material extends Component {
  constructor(props) {
    super(props);

    this.createParagraph = this.createParagraph.bind(this);
    this.handleAmountUnitChange = this.handleAmountUnitChange.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
    this.gasFieldsUnitsChanged = this.gasFieldsUnitsChanged.bind(this);
    this.handleCoefficientChange = this.handleCoefficientChange.bind(this);
    this.debounceHandleAmountUnitChange = debounce(this.handleAmountUnitChange, 500);
    this.yieldOrConversionRate = this.yieldOrConversionRate.bind(this);
  }

  handleMaterialClick(sample) {
    const { reaction } = this.props;
    UrlSilentNavigation(sample);
    sample.updateChecksum();
    ElementActions.showReactionMaterial({ sample, reaction });
  }

  materialVolume(material, className) {
    if (material.contains_residues) { return notApplicableInput(); }
    const { density, molarity_value, molarity_unit, has_density, has_molarity } = material;
    const tooltip = has_density || has_molarity ?
      (
        <Tooltip id="density_info">
          {has_density ? `density = ${density}` : `molarity = ${molarity_value} ${molarity_unit}`}
        </Tooltip>
      )
      : <Tooltip id="density_info">no density or molarity defined</Tooltip>;

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[1]) > -1) ? material.metrics[1] : 'm';
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
            disabled={!permitOn(this.props.reaction)
              || ((this.props.materialGroup !== 'products')
              && !material.reference && this.props.lockEquivColumn)
              || material.gas_type === 'gas'}
            onChange={e => this.handleAmountUnitChange(e, material.amount_l)}
            onMetricsChange={this.handleMetricsChange}
            variant={material.amount_unit === 'l' ? 'primary' : 'light'}
            size="sm"
          />
        </div>
      </OverlayTrigger>
    );
  }

  materialLoading(material, showLoadingColumn) {
    if (!showLoadingColumn) {
      return false;
    }
    if (!material.contains_residues) {
      return notApplicableInput();
    }

    return (
      <NumeralInputWithUnitsCompo
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
        onChange={loading => this.handleLoadingChange(loading)}
      />
    );
  }

  materialRef(material) {
    const { materialGroup, reaction } = this.props;
    return (
      <div className="reaction-material__ref-input">
        {materialGroup !== 'products'
          && (
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
      ? 100 : material.conversion_rate;
    return (
      <NumeralInputWithUnitsCompo
        precision={4}
        value={allowedConversionRateValue || 'n.d.'}
        unit="%"
        disabled={!permitOn(reaction)}
        onChange={(e) => this.handleConversionRateChange(e)}
        size="sm"
      />
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
              className="reaction-material__yield-input"
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
    return (
      <NumeralInputWithUnitsCompo
        className="reaction-material__equivalent-input"
        size="sm"
        precision={4}
        value={material.equivalent}
        disabled={!permitOn(reaction)
          || ((((material.reference
          || false) && material.equivalent) !== false)
          || lockEquivColumn)}
        onChange={e => this.handleEquivalentChange(e)}
      />
    );
  }

  gaseousInputFields(field, material) {
    const gasPhaseData = material.gas_phase_data || {};
    const { value, unit, isTimeField } = this.getFieldData(field, gasPhaseData);
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
        return { value: gasPhaseData.turnover_number, unit: 'TON', isTimeField: false };
      case 'part_per_million':
        return { value: gasPhaseData.part_per_million, unit: 'ppm', isTimeField: false };
      case 'time':
        return { value: gasPhaseData.time?.value, unit: gasPhaseData.time?.unit, isTimeField: true };
      default:
        return { value: gasPhaseData[field]?.value, unit: gasPhaseData[field]?.unit, isTimeField: false };
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

  gaseousProductRow(material) {
    return (
      <div className="reaction-material__gaseous-fields-input">
        <div className="reaction-material__ref-input" />
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
        externalLabel: value
      };
      this.props.onChange(e);
    }
  }

  handleExternalLabelCompleted() {
    if (this.props.onChange) {
      const event = {
        type: 'externalLabelCompleted'
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
        value
      };
      this.props.onChange(event);
    }
  }

  handleAmountChange(e) {
    if (this.props.onChange && e) {
      const event = {
        amount: e,
        type: 'amountChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.materialId(),
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
        sampleID: this.materialId()
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
        amount: this.props.material.amount
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
        equivalent
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
        conversionRate
      };
      onChange(event);
    }
  }

  handleGasFieldsChange(field, e, currentValue) {
    const { materialGroup, onChange } = this.props;
    if (onChange && e.value !== undefined && e.unit !== undefined && e.value !== currentValue) {
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
    const mlt = m.molarity_value === 0.0 ?
      '' : `${validDigit(m.molarity_value, 3)} ${m.molarity_unit}, `;
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
        dry_solvent: value
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
    return (
      <OverlayTrigger
        delay="100"
        placement="top"
        overlay={
          <Tooltip id="molecular-weight-info">{this.generateMolecularWeightTooltipText(material, reaction)}</Tooltip>
        }
      >
        <div>
          <NumeralInputWithUnitsCompo
            className="reaction-material__mass-input"
            value={material.amount_g}
            unit="g"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={4}
            disabled={
              !permitOn(reaction)
              || (materialGroup !== 'products' && !material.reference && lockEquivColumn)
              || material.gas_type === 'feedstock' || material.gas_type === 'gas'
            }
            onChange={(e) => this.debounceHandleAmountUnitChange(e, material.amount_g)}
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
    const mol = material.amount_mol;
    //const concn = mol / reaction.solventVolume;
    const mw = material.decoupled ?
      (material.molecular_mass) : (material.molecule && material.molecule.molecular_weight);

    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[0]) > -1) ? material.metrics[0] : 'm';
    const metricPrefixesMol = ['m', 'n'];
    const metricMol = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[2]) > -1) ? material.metrics[2] : 'm';
    const metricPrefixesMolConc = ['m', 'n'];
    const metricMolConc = (material.metrics && material.metrics.length > 3 && metricPrefixes.indexOf(material.metrics[3]) > -1) ? material.metrics[3] : 'm';

    return (
      <div ref={dropRef} className={this.rowClassNames()}>
        {this.dragHandle()}
        {this.materialNameWithIupac(material)}
        <div className="d-flex gap-2 flex-column py-1">
          <div className="d-flex gap-2 align-items-start">
            {this.materialRef(material)}
            {this.switchTargetReal()}
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="reaction-coefficient-info"> Reaction Coefficient </Tooltip>}
            >
              <div>
                <NumeralInputWithUnitsCompo
                  className="reaction-material__coefficient-input"
                  size="sm"
                  value={material.coefficient ?? 1}
                  onChange={this.handleCoefficientChange}
                  name="coefficient"
                />
              </div>
            </OverlayTrigger>
            <div className="reaction-material__amount-input">
              {this.amountField(material, metricPrefixes, reaction, massBsStyle, metric)}
              {this.materialVolume(material, 'reaction-material__volume-input')}
              <NumeralInputWithUnitsCompo
                value={material.amount_mol}
                className="reaction-material__molarity-input"
                unit="mol"
                metricPrefix={metricMol}
                metricPrefixes={metricPrefixes}
                precision={4}
                disabled={!permitOn(reaction)
                  || (this.props.materialGroup === 'products'
                  || (!material.reference && this.props.lockEquivColumn))}
                onChange={e => this.handleAmountUnitChange(e, material.amount_mol)}
                onMetricsChange={this.handleMetricsChange}
                variant={material.amount_unit === 'mol' ? 'primary' : 'light'}
                size="sm"
              />
            </div>
            <NumeralInputWithUnitsCompo
              value={material.concn}
              className="reaction-material__concentration-input"
              unit="mol/l"
              metricPrefix={metricMolConc}
              metricPrefixes={metricPrefixesMolConc}
              precision={4}
              disabled
              onChange={e => this.handleAmountUnitChange(e, material.concn)}
              onMetricsChange={this.handleMetricsChange}
              size="sm"
            />
            {this.equivalentOrYield(material)}
            <Button
              className="reaction-material__delete-input"
              disabled={!permitOn(reaction)}
              variant="danger"
              size="sm"
              onClick={() => deleteMaterial(material)}
            >
              <i className="fa fa-trash-o" />
            </Button>
          </div>
        </div>
        {materialGroup === 'products' && (
          <>
            {material.gas_type === 'gas' && reaction.gaseous && this.gaseousProductRow(material)}
            {material.adjusted_loading && material.error_mass && <MaterialCalculations material={material} />}
          </>
        )}
      </div>
    );
  }

  generateMolecularWeightTooltipText(sample, reaction) {
    const isProduct = reaction.products.includes(sample);
    let molecularWeight = sample.decoupled ?
      (sample.molecular_mass) : (sample.molecule && sample.molecule.molecular_weight);

    if (sample.isMixture() && sample.reference_molecular_weight) {
      molecularWeight = sample.reference_molecular_weight.toFixed(4);
    }
    let theoreticalMassPart = "";
    if (isProduct && sample.maxAmount) {
      theoreticalMassPart = `, max theoretical mass: ${Math.round(sample.maxAmount * 10000) / 10} mg`;
    }
    return `molar mass: ${molecularWeight} g/mol` + theoreticalMassPart;
  }

  toggleTarget(isTarget) {
    if (this.props.materialGroup !== 'products') {
      this.handleAmountTypeChange(!isTarget ? 'target' : 'real');
    }
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
        <div className="reaction-material__dry-solvent-input">
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
        <InputGroup className="reaction-material__solvent-label-input">
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
        {this.materialVolume(material, 'reaction-material__solvent-volume-input')}
        <Form.Control
          className="reaction-material__volume-ratio-input"
          type="text"
          size="sm"
          value={reaction.volumeRatioByMaterialId(material.id)}
          disabled
        />
        <Button
          className="reaction-material__delete-input"
          disabled={!permitOn(reaction)}
          variant="danger"
          size="sm"
          onClick={() => deleteMaterial(material)}
        >
          <i className="fa fa-trash-o" />
        </Button>
      </div>
    );
  }

  switchTargetReal() {
    const { reaction, material, materialGroup } = this.props;
    const isProduct = materialGroup === 'products';
    const isTarget = !isProduct && material.amountType === 'target';
    const isDisabled = isProduct || !permitOn(reaction);

    return (
      <Button
        className="reaction-material__target-input"
        disabled={isDisabled}
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

    const idCheck = /^\d+$/;
    let linkDisplayName = true;
    let materialDisplayName = '';

    if (skipIupacName) {
      materialDisplayName = material.molecule_iupac_name || material.name;
      if (materialGroup === 'solvents' || materialGroup === 'purification_solvents') {
        materialDisplayName = material.external_label || materialDisplayName;
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
      <div className="pseudo-table__cell pseudo-table__cell-title">
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
