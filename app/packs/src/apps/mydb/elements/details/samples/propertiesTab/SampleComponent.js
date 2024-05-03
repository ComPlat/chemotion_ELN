import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  OverlayTrigger,
  Tooltip,
} from 'react-bootstrap';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import SampleName from 'src/components/common/SampleName';
import Sample from 'src/models/Sample';
import { permitCls, permitOn } from 'src/components/common/uis';

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

class SampleComponent extends Component {
  constructor(props) {
    super(props);
  
    this.handleAmountChange = this.handleAmountChange.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
  }

  handleAmountChange(e, value, concType) {
    if (e.value === value) return;
      
    if (this.props.onChange && e) {
      const event = {
        amount: e,
        type: 'amountChanged',
        materialGroup: this.props.materialGroup,
        sampleID: this.componentId(),
        concType: concType,

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

  generateMolecularWeightTooltipText(sample) {
    const molecularWeight = sample.decoupled ?
      (sample.molecular_mass) : (sample.molecule && sample.molecule.molecular_weight);
    return `molar mass: ${molecularWeight} g/mol`;
  }

  componentId() {
    return this.component().id;
  }

  component() {
    return this.props.material;
  }


  materialNameWithIupac(material) { 
    let materialName = '';
    let moleculeIupacName = '';
    const iupacStyle = {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%'
    };

    moleculeIupacName = material.molecule_iupac_name;
      const materialDisplayName = material.title() === ''
        ? <SampleName sample={material} />
        : material.title();

    materialName = (<a><span>{materialDisplayName}</span></a>);
  
    if (material.isNew) { materialName = materialDisplayName; }

    let br = <br />;
    if (moleculeIupacName === '') {
      iupacStyle.display = 'none';
      br = '';
    }
    return (
        <div style={{ display: 'inline-block', maxWidth: '100%' }}>
          <div className="inline-inside">
            {materialName}
          </div>
          <span style={iupacStyle}>
            {moleculeIupacName}
          </span>
        </div>
    );

  }

  materialVolume(material) {
    if (material.contains_residues) { return notApplicableInput(); }
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[1]) > -1) ? material.metrics[1] : 'm';

    return (
      <td style={{ verticalAlign: 'bottom' }}>
        <div>
          <NumeralInputWithUnitsCompo
            key={material.id}
            value={material.amount_l}
            unit="l"
            metricPrefix={metric}
            metricPrefixes={metricPrefixes}
            precision={3}
            disabled={!permitOn(this.props.sample) || this.props.lockAmountColumn}
            onChange={e => this.handleAmountChange(e, material.amount_l)}
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
      }>
      <div>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.amount_g}
          unit="g"
          metricPrefix={metric}
          metricPrefixes={metricPrefixes}
          precision={4}
          disabled={!permitOn(this.props.sample) || this.props.lockAmountColumn }
          onChange={e => this.handleAmountChange(e, material.amount_g)}
          onMetricsChange={this.handleMetricsChange}
          bsStyle={material.error_mass ? 'error' : massBsStyle}
          name="molecular-weight"
        />
      </div>
    </OverlayTrigger>
    )
  }

  componentMol(material, metricMol, metricPrefixesMol) {
    return (
      <NumeralInputWithUnitsCompo
            key={material.id}
            value={material.amount_mol}
            unit="mol"
            metricPrefix={metricMol}
            metricPrefixes={metricPrefixesMol}
            precision={4}
            disabled={!permitOn(this.props.sample) || this.props.lockAmountColumn }
            onChange={e => this.handleAmountChange(e, material.amount_mol)}
            onMetricsChange={this.handleMetricsChange}
            bsStyle={material.amount_unit === 'mol' ? 'success' : 'default'}
          />
    )
  }

  componentConc(material, metricMolConc, metricPrefixesMolConc) {
    return (
      <td>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.concn}
          unit="mol/l"
          metricPrefix={metricMolConc}
          metricPrefixes={metricPrefixesMolConc}
          precision={4}
          disabled={!permitOn(this.props.sample) || !this.props.lockAmountColumn}
          onChange={e => this.handleAmountChange(e, material.concn)}
          onMetricsChange={this.handleMetricsChange}
        />
      </td>
    )
  }

  componentStockConc(material, metricMolConc, metricPrefixesMolConc) {
    return (
      <td>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.stock_molarity_value}
          unit="mol/l"
          metricPrefix={metricMolConc}
          metricPrefixes={metricPrefixesMolConc}
          precision={4}
          disabled={!permitOn(this.props.sample) || !this.props.lockAmountColumn}
          onChange={e => this.handleAmountChange(e, material.stockConc, 'stockConc')}
          onMetricsChange={this.handleMetricsChange}
        />
      </td>
    )
  }

  mixtureComponent(props, style) {
    const { sample, material, deleteMaterial, connectDragSource, connectDropTarget } = props;
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[0]) > -1) ? material.metrics[0] : 'm';
    const metricPrefixesMol = ['m', 'n'];
    const metricMol = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[2]) > -1) ? material.metrics[2] : 'm';
    const metricPrefixesMolConc = ['m', 'n'];
    const metricMolConc = (material.metrics && material.metrics.length > 3 && metricPrefixes.indexOf(material.metrics[3]) > -1) ? material.metrics[3] : 'm';
    const massBsStyle = material.amount_unit === 'g' ? 'success' : 'default';

    return (
      <tr className="general-material">
        {compose(connectDragSource, connectDropTarget)(
          <td className={`drag-source ${permitCls(sample)}`} style={style}>
            <span className="text-info fa fa-arrows" />
          </td>,
          { dropEffect: 'copy' }
        )}

        <td style={{ width: '22%', maxWidth: '50px' }}>
          {this.materialNameWithIupac(material)}
        </td>
        
        <td style={{ verticalAlign: 'bottom' }}>
          {this.componentMass(material, metric, metricPrefixes, massBsStyle)}
        </td>

        {this.materialVolume(material)}

        <td style={{ verticalAlign: 'bottom' }}>
          {this.componentMol(material, metricMol, metricPrefixesMol)}
        </td>

        {this.componentConc(material, metricMolConc, metricPrefixesMolConc)}
        {this.componentStockConc(material, metricMolConc, metricPrefixesMolConc)}

        <td>
          <NumeralInputWithUnitsCompo
            precision={4}
            value={material.equivalent}
            disabled={true}
          />
        </td>

        <td>
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

  render() {
    const {
      isDragging, canDrop, isOver,
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

    return this.mixtureComponent(this.props, style);
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