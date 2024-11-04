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
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import ComponentActions from "src/stores/alt/actions/ComponentActions";
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

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

    const componentState = ComponentStore.getState();
    this.state = {
      lockAmountColumn: componentState.lockAmountColumn,
      lockAmountColumnSolids: componentState.lockAmountColumnSolids,
      lockedComponents: componentState.lockedComponents,
    };

    this.onComponentStoreChange = this.onComponentStoreChange.bind(this);
    this.handleAmountChange = this.handleAmountChange.bind(this);
    this.handleMetricsChange = this.handleMetricsChange.bind(this);
    this.handleDensityChange = this.handleDensityChange.bind(this);
    this.handlePurityChange = this.handlePurityChange.bind(this);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleRatioChange = this.handleRatioChange.bind(this);
    this.handleReferenceChange = this.handleReferenceChange.bind(this);
    this.handleConcentrationLockToggle = this.handleConcentrationLockToggle.bind(this);
  }

  componentDidMount() {
    ComponentStore.listen(this.onComponentStoreChange);
  }

  componentWillUnmount() {
    ComponentStore.unlisten(this.onComponentStoreChange);
  }

  onComponentStoreChange(state) {
    this.setState({ ...state });
  }

  handleAmountChange(e, value, concType, lockColumn) {
    if (e.value === value) return;
    const { materialGroup } = this.props;

    if (this.props.onChange && e) {
      const event = {
        amount: e,
        type: 'amountChanged',
        materialGroup,
        sampleID: this.componentId(),
        concType,
        lockColumn,
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
        lockColumn,
      };
      this.props.onChange(event);
    }
  }

  handlePurityChange(e, value) {
    if (e.value === value) return;

    if (e.value < 0 || e.value > 1) {
      e.value = 1;
      NotificationActions.add({
        message: 'Purity value should be >= 0 and <=1',
        level: 'error'
      });
    }

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

    const { materialGroup } = this.props;

    if (this.props.onChange && e) {
      const event = {
        newRatio: e.value,
        type: 'ratioChanged',
        sampleID: this.componentId(),
        materialGroup,
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

  handleConcentrationLockToggle(material, lockConc) {
    // Trigger the action to toggle the component's lock state
    ComponentActions.toggleComponentLock(material.id, lockConc);
  }

  generateMolecularWeightTooltipText(sample) {
    const molecularWeight = sample.decoupled
      ? (sample.molecular_mass) : (sample.molecule && sample.molecule.molecular_weight);
    return `molar mass: ${molecularWeight} g/mol`;
  }

  materialVolume(material) {
    if (material.contains_residues) { return notApplicableInput(); }

    const {
      sample, enableComponentLabel, enableComponentPurity
    } = this.props;
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[1]) > -1) ? material.metrics[1] : 'm';

    return (
      <td
        style={enableComponentLabel === false && enableComponentPurity === false ? { verticalAlign: 'bottom' } : null}
      >
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.amount_l}
          unit="l"
          metricPrefix={metric}
          metricPrefixes={metricPrefixes}
          precision={3}
          disabled={!permitOn(sample)}
          onChange={(e) => this.handleAmountChange(e, material.amount_l)}
          onMetricsChange={this.handleMetricsChange}
          bsStyle={material.amount_unit === 'l' ? 'success' : 'default'}
        />
      </td>
    );
  }

  componentMass(material, metric, metricPrefixes, massBsStyle) {
    const { lockAmountColumnSolids } = this.state;
    const { sample } = this.props;

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
            disabled={!permitOn(sample) || lockAmountColumnSolids}
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
    const {
      sample, enableComponentLabel, enableComponentPurity
    } = this.props;

    return (
      <td
        style={enableComponentLabel === false && enableComponentPurity === false ? { verticalAlign: 'bottom' } : null}
      >
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.amount_mol}
          unit="mol"
          metricPrefix={metricMol}
          metricPrefixes={metricPrefixesMol}
          precision={4}
          disabled={!permitOn(sample)}
          onChange={(e) => this.handleAmountChange(e, material.amount_mol)}
          onMetricsChange={this.handleMetricsChange}
          bsStyle={material.amount_unit === 'mol' ? 'success' : 'default'}
        />
      </td>
    );
  }

  renderLockButton(lockConc, handleConcentrationLockToggle) {
    const tooltip = (
      <Tooltip id="switch-concentration">
        <span style={{ display: 'block' }}>Lock/unlock</span>
      </Tooltip>
    );

    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <Button
          style={{ marginRight: '5px', width: '22px' }}
          bsSize="xsmall"
          bsStyle={lockConc ? 'warning' : 'default'}
          onClick={handleConcentrationLockToggle}
        >
          <i className={lockConc ? 'fa fa-lock' : 'fa fa-unlock'} />
        </Button>
      </OverlayTrigger>
    );
  }

  componentConc(material, metricMolConc, metricPrefixesMolConc) {
    const { sample } = this.props;
    const { lockedComponents } = this.state;

    const isConcentrationLocked = lockedComponents.includes(material.id);

    return (
      <td style={{ verticalAlign: 'top', display: 'flex', alignItems: 'center' }}>
        {this.renderLockButton(isConcentrationLocked, () => this.handleConcentrationLockToggle(material, isConcentrationLocked))}

        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.concn}
          unit="mol/l"
          metricPrefix={metricMolConc}
          metricPrefixes={metricPrefixesMolConc}
          precision={4}
          disabled={!permitOn(sample) || isConcentrationLocked}
          onChange={(e) => this.handleAmountChange(e, material.concn, 'targetConc', isConcentrationLocked)}
          onMetricsChange={this.handleMetricsChange}
        />
      </td>
    );
  }

  componentStartingConc(material, metricMolConc, metricPrefixesMolConc) {
    const { sample } = this.props;
    const { lockAmountColumn } = this.state;

    return (
      <td style={{ verticalAlign: 'top' }}>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.starting_molarity_value}
          unit="mol/l"
          metricPrefix={metricMolConc}
          metricPrefixes={metricPrefixesMolConc}
          precision={4}
          disabled={!permitOn(sample) || lockAmountColumn}
          onChange={(e) => this.handleAmountChange(e, material.startingConc, 'startingConc', lockAmountColumn)}
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
    const { sample, materialGroup } = this.props;
    const { lockAmountColumn, lockAmountColumnSolids } = this.state;
    const lockColumn = materialGroup === 'liquid' ? lockAmountColumn : lockAmountColumnSolids;

    return (
      <td style={{ verticalAlign: 'top' }}>
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.density}
          unit="g/ml"
          metricPrefix="n"
          metricPrefixes={['n']}
          precision={4}
          disabled={!permitOn(sample) || lockColumn}
          onChange={(e) => this.handleDensityChange(e, material.density, lockColumn)}
        />
      </td>
    );
  }

  mixtureComponent(props, style) {
    const {
      sample, material, deleteMaterial, connectDragSource, connectDropTarget, activeTab,
      enableComponentLabel, enableComponentPurity
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

        {activeTab === 'concentration' && this.componentStartingConc(material, metricMolConc, metricPrefixesMolConc)}
        {activeTab === 'density' && this.componentDensity(material)}

        {this.materialVolume(material)}

        {this.componentMol(material, metricMol, metricPrefixesMol)}

        <td style={{ verticalAlign: 'top' }}>
          <NumeralInputWithUnitsCompo
            precision={4}
            value={material.equivalent || 1}
            disabled={!permitOn(sample) || material.reference}
            onChange={(e) => this.handleRatioChange(e, material.equivalent)}
          />
        </td>

        {this.materialRef(material)}

        {this.componentConc(material, metricMolConc, metricPrefixesMolConc)}

        {
          enableComponentLabel && (
            <td>
              {this.nameInput(material)}
            </td>
          )
        }

        {
          enableComponentPurity && (
            <td style={{ verticalAlign: 'top' }}>
              <NumeralInputWithUnitsCompo
                precision={4}
                value={material.purity || 1}
                disabled={!permitOn(sample)}
                onChange={(e) => this.handlePurityChange(e, material.purity)}
              />
            </td>
          )
        }
      </tr>
    );
  }

  solidComponent(props, style) {
    const {
      sample, material, deleteMaterial, connectDragSource, connectDropTarget,
      enableComponentLabel, enableComponentPurity
    } = props;
    const { lockConcentrationSolids } = this.state;
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
        <td />

        <td
          style={enableComponentLabel === false && enableComponentPurity === false ? { verticalAlign: 'bottom' } : null}
        >
          {this.componentMass(material, metric, metricPrefixes, massBsStyle)}
        </td>

        {this.componentMol(material, metricMol, metricPrefixesMol)}

        <td style={{ verticalAlign: 'top' }}>
          <NumeralInputWithUnitsCompo
            precision={4}
            value={material.equivalent || 1}
            disabled={!permitOn(this.props.sample) || material.reference}
            onChange={(e) => this.handleRatioChange(e, material.equivalent)}
          />
        </td>

        {this.materialRef(material)}

        {this.componentConc(material, metricMolConc, metricPrefixesMolConc)}

        {
          enableComponentLabel && (
            <td>
              {this.nameInput(material)}
            </td>
          )
        }

        {
          enableComponentPurity && (
            <td style={{ verticalAlign: 'top' }}>
              <NumeralInputWithUnitsCompo
                precision={4}
                value={material.purity || 1}
                disabled={!permitOn(this.props.sample)}
                onChange={(e) => this.handlePurityChange(e, material.purity)}
              />
            </td>
          )
        }
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
  sample: PropTypes.object.isRequired,
  material: PropTypes.instanceOf(Sample).isRequired,
  materialGroup: PropTypes.string.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  index: PropTypes.number,
  isDragging: PropTypes.bool,
  canDrop: PropTypes.bool,
  isOver: PropTypes.bool,
  enableComponentLabel: PropTypes.bool.isRequired,
  enableComponentPurity: PropTypes.bool.isRequired,
};
