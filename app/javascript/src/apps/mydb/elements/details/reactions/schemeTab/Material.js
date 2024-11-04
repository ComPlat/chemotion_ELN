import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Radio,
  FormControl,
  Button,
  InputGroup,
  OverlayTrigger,
  Tooltip,
  Checkbox,
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
import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import { permitCls, permitOn } from 'src/components/common/uis';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import { calculateFeedstockMoles } from 'src/utilities/UnitsConversion';

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
    <FormControl
      bsClass="bs-form--compact form-control"
      bsSize="small"
      style={{ textAlign: 'center' }}
      type="text"
      value="n/a"
      disabled
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
      </tbody>
    </table>
  </Tooltip>);

const refreshSvgTooltip = <Tooltip id="refresh_svg_tooltip">Refresh reaction diagram</Tooltip>;

const AddtoDescToolTip = <Tooltip id="tp-spl-code" className="left_tooltip">Add to description or additional information for publication and purification details</Tooltip>;

const solvConcentration = (material, solventVolume) => {
  const concn = ((material.amount_l / solventVolume) * 100).toFixed(1);
  if (isNaN(concn) || !isFinite(concn)) { return 'n.d.'; }
  return `${concn}%`;
};

class Material extends Component {
  constructor(props) {
    super(props);

    this.createParagraph = this.createParagraph.bind(this);
    this.handleAmountUnitChange = this.handleAmountUnitChange.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
    this.gasFieldsUnitsChanged = this.gasFieldsUnitsChanged.bind(this);
    this.handleCoefficientChange = this.handleCoefficientChange.bind(this);
    this.debounceHandleAmountUnitChange = debounce(this.handleAmountUnitChange, 500);
  }

  handleMaterialClick(sample) {
    const { reaction } = this.props;
    UrlSilentNavigation(sample);
    sample.updateChecksum();
    ElementActions.showReactionMaterial({ sample, reaction });
  }

  materialVolume(material) {
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
              onChange={e => this.handleAmountUnitChange(e, material.amount_l)}
              onMetricsChange={this.handleMetricsChange}
              bsStyle={material.amount_unit === 'l' ? 'success' : 'default'}
            />
          </div>
        </OverlayTrigger>
      </td>
    );
  }

  materialLoading(material, showLoadingColumn) {
    if (!showLoadingColumn) {
      return false;
    } else if (!material.contains_residues) {
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
          bsStyle={material.error_loading ? 'error' : 'success'}
          precision={3}
          disabled={!permitOn(this.props.reaction) || (this.props.materialGroup === 'products' || (!material.reference && this.props.lockEquivColumn))}
          onChange={loading => this.handleLoadingChange(loading)}
        />
      </td>
    );
  }

  materialRef(material) {
    return (
      this.props.materialGroup === 'products'
        ? <td />
        : <td>
          <Radio
            disabled={!permitOn(this.props.reaction)}
            name="reference"
            checked={material.reference}
            onChange={e => this.handleReferenceChange(e)}
            bsSize="xsmall"
            style={{ margin: 0 }}
          />
        </td>
    );
  }

  materialShowLabel(material, style = { padding: '5px 4px', width: '16px' }) {
    return (
      <Button
        active
        style={style}
        onClick={e => this.handleShowLabelChange(e)}
        bsStyle={material.show_label ? 'success' : 'primary'}
        bsSize="small"
        title={material.show_label ? 'Switch to structure' : 'Switch to label'}
      >{material.show_label ? 'l' : 's'}
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

  equivalentOrYield(material) {
    const { reaction, materialGroup } = this.props;
    if (materialGroup === 'products') {
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
      return (
        <div>
          <FormControl
            name="yield"
            type="text"
            bsClass="bs-form--compact form-control"
            bsSize="small"
            value={calculateYield || 'n.d.'}
            disabled
          />
        </div>
      );
    }
    return (
      <NumeralInputWithUnitsCompo
        precision={4}
        value={material.equivalent}
        disabled={!permitOn(this.props.reaction) || ((((material.reference || false) && material.equivalent) !== false) || this.props.lockEquivColumn)}
        onChange={e => this.handleEquivalentChange(e)}
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

    return (
      <td colSpan={colSpan} style={style}>
        <NumeralInputWithUnitsCompo
          precision={4}
          bsStyle="success"
          value={updateValue}
          disabled={readOnly}
          onMetricsChange={(e) => this.gasFieldsUnitsChanged(e, field)}
          onChange={(e) => this.handleGasFieldsChange(field, e, value)}
          unit={unit}
        />
      </td>
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

  handleShowLabelChange(e) {
    const value = e.target.checked;
    if (this.props.onChange) {
      const event = {
        type: 'showLabelChanged',
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
    const solVol = vol.substr(0, vol.length - 2);
    const mol = molUnit ? `${molUnit}mol, ` : '';
    const mlt = m.molarity_value === 0.0 ?
      '' : `${validDigit(m.molarity_value, 3)}${m.molarity_unit}, `;
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
            key={material.id}
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
            bsStyle={material.error_mass ? 'error' : massBsStyle}
            name="molecular-weight"
          />
        </div>
      </OverlayTrigger>
    );
  }

  generalMaterial(props, style) {
    const { material, deleteMaterial, connectDragSource, connectDropTarget,
      showLoadingColumn, reaction } = props;
    const isTarget = material.amountType === 'target';
    const massBsStyle = material.amount_unit === 'g' ? 'success' : 'default';
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

    const inputsStyle = {
      paddingRight: 2,
      paddingLeft: 2,
    };

    return (
      <tbody>
        <tr className="general-material">
          {compose(connectDragSource, connectDropTarget)(
            <td className={`drag-source ${permitCls(reaction)}`} style={style}>
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
              overlay={<Tooltip id="reaction-coefficient-info"> Reaction Coefficient </Tooltip>}>
              <div>
                <NumeralInputWithUnitsCompo
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

          <td>
            <NumeralInputWithUnitsCompo
              key={material.id}
              value={material.amount_mol}
              unit="mol"
              metricPrefix={metricMol}
              metricPrefixes={metricPrefixes}
              precision={4}
              disabled={!permitOn(reaction) || (this.props.materialGroup === 'products' || (!material.reference && this.props.lockEquivColumn))}
              onChange={e => this.handleAmountUnitChange(e, material.amount_mol)}
              onMetricsChange={this.handleMetricsChange}
              bsStyle={material.amount_unit === 'mol' ? 'success' : 'default'}
            />
          </td>

          {this.materialLoading(material, showLoadingColumn)}

          <td style={{ maxWidth: '4%' }}>
            <NumeralInputWithUnitsCompo
              key={material.id}
              value={material.concn}
              unit="mol/l"
              metricPrefix={metricMolConc}
              metricPrefixes={metricPrefixesMolConc}
              precision={4}
              disabled
              onChange={(e) => this.handleAmountUnitChange(e, material.concn)}
              onMetricsChange={this.handleMetricsChange}
            />
          </td>

          <td style={{ minWidth: '35px' }}>
            {this.equivalentOrYield(material)}
          </td>
          <td>
            <Button
              disabled={!permitOn(reaction)}
              bsStyle="danger"
              bsSize="small"
              onClick={() => deleteMaterial(material)}
            >
              <i className="fa fa-trash-o" />
            </Button>
          </td>
        </tr>
        {material.gas_type === 'gas'
        && reaction.gaseous ? this.gaseousProductRow(material) : null}
      </tbody>
    );
  }

  generateMolecularWeightTooltipText(sample, reaction) {
    const isProduct = reaction.products.includes(sample)
    let molecularWeight = sample.decoupled ?
      (sample.molecular_mass) : (sample.molecule && sample.molecule.molecular_weight);

    if (sample.sample_type === 'Mixture' && sample.reference_molecular_weight) {
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

  solventMaterial(props, style) {
    const { material, deleteMaterial, connectDragSource,
      connectDropTarget, reaction } = props;
    const isTarget = material.amountType === 'target';
    const mw = material.molecule && material.molecule.molecular_weight;
    const drySolvTooltip = <Tooltip>Dry Solvent</Tooltip>;
    return (
      <tr className="solvent-material">
        {compose(connectDragSource, connectDropTarget)(
          <td className={`drag-source ${permitCls(reaction)}`} style={style}>
            <span className="text-info fa fa-arrows" />
          </td>,
          { dropEffect: 'copy' }
        )}

        <td style={{ width: '25%', maxWidth: '50px' }}>
          {this.materialNameWithIupac(material)}
        </td>
        <td>
          <OverlayTrigger placement="top" overlay={drySolvTooltip}>
            <Checkbox
              checked={material.dry_solvent}
              onChange={(event) => this.handleDrySolventChange(event)}
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
              <div>
                <FormControl
                  disabled={!permitOn(reaction)}
                  type="text"
                  bsClass="bs-form--compact form-control"
                  bsSize="small"
                  value={material.external_label}
                  placeholder={material.molecule.iupac_name}
                  onChange={event => this.handleExternalLabelChange(event)}
                />
              </div>
            </OverlayTrigger>
            <InputGroup.Button>
              <OverlayTrigger placement="bottom" overlay={refreshSvgTooltip}>
                <Button
                  disabled={!permitOn(reaction)}
                  active
                  onClick={e => this.handleExternalLabelCompleted(e)}
                  bsSize="small"
                ><i className="fa fa-refresh" /></Button>
              </OverlayTrigger>
            </InputGroup.Button>
          </InputGroup>
        </td>

        {this.materialVolume(material)}

        <td>
          <FormControl
            type="text"
            bsClass="bs-form--compact form-control"
            bsSize="small"
            value={solvConcentration(material, props.reaction.purificationSolventVolume)}
            disabled
          />
        </td>

        <td>
          <Button
            disabled={!permitOn(reaction)}
            bsStyle="danger"
            bsSize="small"
            onClick={() => deleteMaterial(material)}
          ><i className="fa fa-trash-o" /></Button>
        </td>
      </tr>
    );
  }

  switchTargetReal(isTarget, style = { padding: '5px 4px', width: '16px' }) {
    return (
      <Button
        disabled={!permitOn(this.props.reaction)}
        active
        style={style}
        onClick={() => this.toggleTarget(isTarget)}
        bsStyle={isTarget ? 'success' : 'primary'}
        bsSize="small"
      >{isTarget ? 't' : 'r'}</Button>
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
      <div style={{ paddingRight: '3px' }}>
        <OverlayTrigger placement="bottom" overlay={tooltip}>
          <Button
            bsStyle="primary"
            bsSize="xsmall"
            onClick={() => this.handleGasTypeChange('gasType', gasTypeValue)}
            disabled={false}
            style={{ backgroundColor: feedstockStatus, width: '35px' }}
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
      maxWidth: '100%'
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
            style={{ cursor: 'pointer' }}
          ><span>{materialDisplayName}</span></a>
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
          style={{ cursor: 'pointer' }}
        ><span>{materialDisplayName}</span></a>
      );

      if (material.isNew) { materialName = materialDisplayName; }
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
      <div style={{ display: 'inline-block', maxWidth: '100%' }}>
        <div className="inline-inside">
          {reaction.gaseous && materialGroup !== 'solvents'
            ? this.gasType(material) : null}
          <OverlayTrigger placement="top" overlay={AddtoDescToolTip}>
            <Button bsStyle="primary" bsSize="xsmall" onClick={addToDesc} disabled={!permitOn(reaction)}>
              {serialCode}
            </Button>
          </OverlayTrigger>
          &nbsp;
          <OverlayTrigger placement="bottom" overlay={iupacNameTooltip(material)}>
            <div className={'reaction-material-link'}>
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
      material, isDragging, canDrop, isOver, materialGroup
    } = this.props;
    const style = { padding: '0' };
    if (isDragging) { style.opacity = 0.3; }
    if (canDrop) {
      style.borderStyle = 'dashed';
      style.borderWidth = 2;
    }
    if (isOver) {
      style.borderColor = '#337ab7';
      style.opacity = 0.6;
      style.backgroundColor = '#337ab7';
    }

    if (this.props.materialGroup === 'products') {
      material.amountType = 'real'; // always take real amount for product
    }
    const sp = materialGroup === 'solvents' || materialGroup === 'purification_solvents';
    const component = sp ?
      this.solventMaterial(this.props, style) :
      this.generalMaterial(this.props, style);

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
};
