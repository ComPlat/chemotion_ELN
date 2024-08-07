import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  OverlayTrigger,
  Tooltip,
  FormGroup,
  FormControl,
  Radio
} from 'react-bootstrap';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import Sample from 'src/models/Sample';
import { permitCls, permitOn } from 'src/components/common/uis';
import SvgWithPopover from 'src/components/common/SvgWithPopover';

const matSource = {
  beginDrag(props) {
    return props;
  },
};

const matTarget = {
  drop(tagProps, monitor) {
    const { dropSample, showModalWithMaterial } = tagProps;
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
      showModalWithMaterial(
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

class SampleComponent extends Component {
  constructor(props) {
    super(props);

    this.handleAmountChange = this.handleAmountChange.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
    this.handleDensityChange = this.handleDensityChange.bind(this);
    this.handlePurityChange = this.handlePurityChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleRatioChange = this.handleRatioChange.bind(this);
    this.handleReferenceChange = this.handleReferenceChange.bind(this);
  }

  handleAmountChange(e, value, concType, lockColumn) {
    if (e.value === value) return;

    if (this.props.onChange && e) {
      const event = {
        amount: e,
        type: 'amountChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.componentId(),
        concType,
        updateVolume: !lockColumn,

      };
      this.props.onChange(event);
    }
  }

  handleDensityChange(e, value, lockColumn) {
    if (e.value === value) return;

    if (this.props.onChange && e) {
      const event = {
        amount: e,
        type: 'densityChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.componentId(),
        updateVolume: lockColumn,

      };
      this.props.onChange(event);
    }
  }

  handlePurityChange(e, value) {
    if (e.value === value) return;

    if (this.props.onChange && e) {
      const event = {
        amount: e,
        type: 'purityChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.componentId(),
      };
      this.props.onChange(event);
    }
  }

  handleMetricsChange(e) {
    if (this.props.onChange && e) {
      const event = {
        metricUnit: e.metricUnit,
        metricPrefix: e.metricPrefix,
        type: 'MetricsChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.componentId(),

      };
      this.props.onChange(event);
    }
  }

  componentId() {
    return this.component().id;
  }

  component() {
    return this.props.material;
  }

  materialNameWithIupac(material) {
    let moleculeIupacName = '';
    const iupacStyle = {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%'
    };

    moleculeIupacName = material.molecule_iupac_name;

    if (moleculeIupacName === '' || !moleculeIupacName) {
      moleculeIupacName = material.molecule.sum_formular;
    }

    return (
      <div style={{ display: 'inline-block', maxWidth: '100%' }}>
        <span style={iupacStyle}>
           {this.svgPreview(material, moleculeIupacName)}
        </span>
      </div>
    );
  }

  nameInput(material) {
    return (
      <FormGroup bsSize="small">
        <FormControl
          type="text"
          value={material.name || ''}
          onChange={(e) => { this.handleNameChange(e, material.name); }}
          disabled={!permitOn(this.props.sample)}
        />
      </FormGroup>
    );
  }

  handleNameChange(e, value) {
    if (e.value === value) return;

    if (this.props.onChange && e) {
      const event = {
        newName: e.target.value,
        type: 'nameChanged',
        sampleID: this.componentId(),

      };
      this.props.onChange(event);
    }
  }

  handleRatioChange(e, value) {
    if (e.value === value) return;

    const adjustAmount = this.props.materialGroup === 'liquid' ? this.props.lockAmountColumn : this.props.lockAmountColumnSolids;

    if (this.props.onChange && e) {
      const event = {
        newRatio: e.value,
        type: 'ratioChanged',
        sampleID: this.componentId(),
        materialGroup: this.props.materialGroup,
        adjustAmount,

      };
      this.props.onChange(event);
    }
  }

  handleReferenceChange(e) {
    const { value } = e.target;
    if (this.props.onChange) {
      const event = {
        type: 'referenceChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.componentId(),
        value
      };
      this.props.onChange(event);
    }
  }

  generateMolecularWeightTooltipText(sample) {
    const molecularWeight = sample.decoupled
      ? (sample.molecular_mass) : (sample.molecule && sample.molecule.molecular_weight);
    return `molar mass: ${molecularWeight} g/mol`;
  }

  materialVolume(material) {
    if (material.contains_residues) { return notApplicableInput(); }
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[1]) > -1) ? material.metrics[1] : 'm';

    return (
      <td>
        <div>
          <NumeralInputWithUnitsCompo
            key={material.id}
            value={material.amount_l}
            unit="l"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={3}
            disabled={!permitOn(this.props.sample) || this.props.lockAmountColumn}
            onChange={(e) => this.handleAmountChange(e, material.amount_l)}
            onMetricsChange={this.handleMetricsChange}
            bsStyle={material.amount_unit === 'l' ? 'success' : 'default'}
          />
        </div>
      </td>
    );
  }

  componentMass(material, metric, metricPrefixes, massBsStyle) {
    return (
      <OverlayTrigger
        delay="100"
        placement="top"
        overlay={
          <Tooltip id="molecular-weight-info">{this.generateMolecularWeightTooltipText(material)}</Tooltip>
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
            disabled={!permitOn(this.props.sample) || this.props.lockAmountColumnSolids}
            onChange={(e) => this.handleAmountChange(e, material.amount_g)}
            onMetricsChange={this.handleMetricsChange}
            bsStyle={material.error_mass ? 'error' : massBsStyle}
            name="molecular-weight"
          />
        </div>
      </OverlayTrigger>
    );
  }

  componentMol(material, metricMol, metricPrefixesMol) {
    const lockColumn = this.props.materialGroup === 'liquid' ? this.props.lockAmountColumn : this.props.lockAmountColumnSolids;
    return (
      <NumeralInputWithUnitsCompo
        key={material.id}
        value={material.amount_mol}
        unit="mol"
        metricPrefix={metricMol}
        metricPrefixes={metricPrefixesMol}
        precision={4}
        disabled={!permitOn(this.props.sample) || lockColumn}
        onChange={(e) => this.handleAmountChange(e, material.amount_mol)}
        onMetricsChange={this.handleMetricsChange}
        bsStyle={material.amount_unit === 'mol' ? 'success' : 'default'}
      />
    );
  }

  componentConc(material, metricMolConc, metricPrefixesMolConc) {
    const lockColumn = this.props.materialGroup === 'liquid' ? this.props.lockAmountColumn : this.props.lockAmountColumnSolids;
    return (
      <td style={{ verticalAlign: 'top' }}>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.concn}
          unit="mol/l"
          metricPrefix={metricMolConc}
          metricPrefixes={metricPrefixesMolConc}
          precision={4}
          disabled={!permitOn(this.props.sample) || !lockColumn}
          onChange={(e) => this.handleAmountChange(e, material.concn, 'targetConc', lockColumn)}
          onMetricsChange={this.handleMetricsChange}
        />
      </td>
    );
  }

  componentStartingConc(material, metricMolConc, metricPrefixesMolConc) {
    const lockColumn = this.props.materialGroup === 'liquid' ? this.props.lockAmountColumn : this.props.lockAmountColumnSolids;
    return (
      <td style={{ verticalAlign: 'top' }}>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.starting_molarity_value}
          unit="mol/l"
          metricPrefix={metricMolConc}
          metricPrefixes={metricPrefixesMolConc}
          precision={4}
          disabled={!permitOn(this.props.sample)}
          onChange={(e) => this.handleAmountChange(e, material.startingConc, 'startingConc', lockColumn)}
          onMetricsChange={this.handleMetricsChange}
        />
      </td>
    );
  }

  materialRef(material) {
    return (
      <td>
        <Radio
          disabled={!permitOn(this.props.sample)}
          name="reference"
          checked={material.reference}
          onChange={(e) => this.handleReferenceChange(e)}
          bsSize="xsmall"
          style={{ margin: 0 }}
        />
      </td>
    );
  }

  componentDensity(material) {
    const lockColumn = this.props.materialGroup === 'liquid' ? this.props.lockAmountColumn : this.props.lockAmountColumnSolids;
    return (
      <td style={{ verticalAlign: 'top' }}>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.density}
          unit="g/ml"
          metricPrefix="n"
          metricPrefixes={['n']}
          precision={4}
          disabled={!permitOn(this.props.sample)}
          onChange={(e) => this.handleDensityChange(e, material.density, lockColumn)}
        />
      </td>
    );
  }

  mixtureComponent(props, style) {
    const {
      sample, material, deleteMaterial, connectDragSource, connectDropTarget, activeTab
    } = props;
    const metricPrefixes = ['m', 'n', 'u'];
    const metricPrefixesMol = ['m', 'n'];
    const metricMol = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[2]) > -1) ? material.metrics[2] : 'm';
    const metricPrefixesMolConc = ['m', 'n'];
    const metricMolConc = (material.metrics && material.metrics.length > 3 && metricPrefixes.indexOf(material.metrics[3]) > -1) ? material.metrics[3] : 'm';

    return (
      <tr className="general-material">
        {compose(connectDragSource, connectDropTarget)(
          <td className={`drag-source ${permitCls(sample)}`} style={style}>
            <span className="text-info fa fa-arrows" />
          </td>,
          { dropEffect: 'copy' }
        )}

        <td style={{ width: '10%', maxWidth: '50px', cursor: 'pointer' }}>
          {this.materialNameWithIupac(material)}
        </td>

        <td>
          {this.nameInput(material)}
        </td>

        {this.materialRef(material)}

        {this.materialVolume(material)}

        <td>
          {this.componentMol(material, metricMol, metricPrefixesMol)}
        </td>

        {activeTab === 'concentration' && this.componentStartingConc(material, metricMolConc, metricPrefixesMolConc)}
        {activeTab === 'density' && this.componentDensity(material)}

        {this.componentConc(material, metricMolConc, metricPrefixesMolConc)}

        <td style={{ verticalAlign: 'top' }}>
          <NumeralInputWithUnitsCompo
            precision={4}
            value={material.purity}
            disabled={!permitOn(this.props.sample)}
            onChange={(e) => this.handlePurityChange(e, material.purity)}
          />
        </td>

        <td style={{ verticalAlign: 'top' }}>
          <NumeralInputWithUnitsCompo
            precision={4}
            value={material.equivalent}
            disabled={!permitOn(this.props.sample) || material.reference}
            onChange={(e) => this.handleRatioChange(e, material.equivalent)}
          />
        </td>

        <td style={{ verticalAlign: 'top' }}>
          <Button
            disabled={!permitOn(sample)}
            bsStyle="danger"
            bsSize="small"
            onClick={() => deleteMaterial(material)}
          >
            <i className="fa fa-trash-o" />
          </Button>
        </td>
      </tr>
    );
  }

  solidComponent(props, style) {
    const {
      sample, material, deleteMaterial, connectDragSource, connectDropTarget
    } = props;
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[0]) > -1) ? material.metrics[0] : 'm';
    const metricPrefixesMol = ['m', 'n'];
    const metricMol = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[2]) > -1) ? material.metrics[2] : 'm';
    const massBsStyle = material.amount_unit === 'g' ? 'success' : 'default';
    const metricPrefixesMolConc = ['m', 'n'];
    const metricMolConc = (material.metrics && material.metrics.length > 3 && metricPrefixes.indexOf(material.metrics[3]) > -1) ? material.metrics[3] : 'm';

    return (
      <tr className="general-material">
        {compose(connectDragSource, connectDropTarget)(
          <td className={`drag-source ${permitCls(sample)}`} style={style}>
            <span className="text-info fa fa-arrows" />
          </td>,
          { dropEffect: 'copy' }
        )}

        <td style={{ width: '10%', maxWidth: '50px' }}>
          {this.materialNameWithIupac(material)}
        </td>

        <td>
          {this.nameInput(material)}
        </td>

        {this.materialRef(material)}

        <td>
          {this.componentMass(material, metric, metricPrefixes, massBsStyle)}
        </td>

        <td>
          {this.componentMol(material, metricMol, metricPrefixesMol)}
        </td>
        {this.componentDensity(material, metricMol, metricPrefixesMol)}
        {this.componentConc(material, metricMolConc, metricPrefixesMolConc)}

        <td style={{ verticalAlign: 'top' }}>
          <NumeralInputWithUnitsCompo
            precision={4}
            value={material.purity}
            disabled={!permitOn(this.props.sample)}
            onChange={(e) => this.handlePurityChange(e, material.purity)}
          />
        </td>

        <td style={{ verticalAlign: 'top' }}>
          <NumeralInputWithUnitsCompo
            precision={4}
            value={material.equivalent}
            disabled={!permitOn(this.props.sample) || material.reference}
            onChange={(e) => this.handleRatioChange(e, material.equivalent)}
          />
        </td>

        <td style={{ verticalAlign: 'top' }}>
          <Button
            disabled={!permitOn(sample)}
            bsStyle="danger"
            bsSize="small"
            onClick={() => deleteMaterial(material)}
          >
            <i className="fa fa-trash-o" />
          </Button>
        </td>
      </tr>
    );
  }

  svgPreview(material, moleculeIupacName) {
    return (
      <SvgWithPopover
        hasPop
        previewObject={{
          txtOnly: moleculeIupacName,
          isSVG: true,
          className: 'component-name',
          src: material.svgPath,
        }}
        popObject={{
          title: moleculeIupacName,
          src: material.svgPath,
          height: '26vh',
          width: '32vw',
        }}
      />
    );
  }

  render() {
    const {
      isDragging, canDrop, isOver, material
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

    if (material.material_group === 'liquid') {
      return this.mixtureComponent(this.props, style);
    }
    return this.solidComponent(this.props, style);
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
)(SampleComponent);

SampleComponent.propTypes = {
  material: PropTypes.instanceOf(Sample).isRequired,
  materialGroup: PropTypes.string.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  index: PropTypes.number,
  isDragging: PropTypes.bool,
  canDrop: PropTypes.bool,
  isOver: PropTypes.bool,
  lockAmountColumn: PropTypes.bool.isRequired
};
