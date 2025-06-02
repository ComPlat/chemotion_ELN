import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  OverlayTrigger,
  Tooltip,
  Form,
} from 'react-bootstrap';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import Sample from 'src/models/Sample';
import { permitCls, permitOn } from 'src/components/common/uis';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { UrlSilentNavigation } from 'src/utilities/ElementUtils';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import ComponentActions from 'src/stores/alt/actions/ComponentActions';
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

/**
 * SampleComponent represents a single component within a sample mixture.
 * It handles the display and interaction of individual components in both liquid and solid states.
 * @class SampleComponent
 * @extends React.Component
 */
class SampleComponent extends Component {
  /**
   * Creates an instance of SampleComponent.
   * @param {Object} props - Component props
   * @param {Sample} props.sample - The parent sample object
   * @param {Sample} props.material - The component material
   * @param {string} props.materialGroup - The group type ('liquid' or 'solid')
   * @param {Function} props.deleteMaterial - Callback for deleting the component
   * @param {Function} props.onChange - Callback for component changes
   */
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
    this.handleMaterialClick = this.handleMaterialClick.bind(this);
  }

  componentDidMount() {
    ComponentStore.listen(this.onComponentStoreChange);
  }

  componentWillUnmount() {
    ComponentStore.unlisten(this.onComponentStoreChange);
  }

  /**
   * Handles click events on material components.
   * If the material has a parent_id, navigates to the parent sample view.
   * @param {Object} material - The material component that was clicked
   */
  handleMaterialClick(material) {
    if (material.parent_id) {
      const parentSample = new Sample({ id: material.parent_id, type: 'sample' });
      UrlSilentNavigation(parentSample);
      ElementActions.fetchSampleById(material.parent_id);
    }
  }

  /**
   * Handles changes to the component's amount.
   * @param {Object} e - The change event
   * @param {number} value - The current value
   * @param {string} concType - The concentration type
   * @param {boolean} lockColumn - Whether the column is locked
   */
  handleAmountChange(e, value, concType, lockColumn) {
    if (e.value === value) return;

    const { materialGroup, onChange } = this.props;

    if (onChange && e) {
      const event = {
        amount: e,
        type: 'amountChanged',
        materialGroup,
        sampleID: this.componentId(),
        concType,
        lockColumn,
      };
      onChange(event);
    }
  }

  /**
   * Handles changes to the component's metrics (units).
   * @param {Object} e - The change event containing metric information
   */
  handleMetricsChange(e) {
    const { materialGroup, onChange } = this.props;

    if (onChange && e) {
      const event = {
        metricUnit: e.metricUnit,
        metricPrefix: e.metricPrefix,
        type: 'MetricsChanged',
        materialGroup,
        sampleID: this.componentId(),
      };
      onChange(event);
    }
  }

  /**
   * Handles changes to the component's density.
   * @param {Object} e - The change event
   * @param {number} value - The current density value
   * @param {boolean} lockColumn - Whether the column is locked
   */
  handleDensityChange(e, value, lockColumn) {
    if (e.value === value) return;

    const { materialGroup, onChange } = this.props;

    if (onChange && e) {
      const event = {
        amount: e,
        type: 'densityChanged',
        materialGroup,
        sampleID: this.componentId(),
        lockColumn,
      };
      onChange(event);
    }
  }

  /**
   * Handles changes to the component's purity.
   * @param {Object} e - The change event
   * @param {number} value - The current purity value
   */
  handlePurityChange(e, value) {
    if (e.value === value) return;

    const { materialGroup, onChange } = this.props;

    if (e.value < 0 || e.value > 1) {
      e.value = 1;
      NotificationActions.add({
        message: 'Purity value should be >= 0 and <=1',
        level: 'error'
      });
    }

    if (onChange && e) {
      const event = {
        amount: e,
        type: 'purityChanged',
        materialGroup,
        sampleID: this.componentId(),
      };
      onChange(event);
    }
  }

  /**
   * Handles changes to the component's name.
   * @param {Object} e - The change event
   * @param {string} value - The current name value
   */
  handleNameChange(e, value) {
    if (e.value === value) return;

    const { onChange } = this.props;

    if (onChange && e) {
      const event = {
        newName: e.target.value,
        type: 'nameChanged',
        sampleID: this.componentId(),

      };
      onChange(event);
    }
  }

  /**
   * Handles changes to the component's ratio.
   * @param {Object} e - The change event
   * @param {number} value - The current ratio value
   */
  handleRatioChange(e, value) {
    if (e.value === value) return;

    const { materialGroup, onChange } = this.props;

    if (onChange && e) {
      const event = {
        newRatio: e.value,
        type: 'ratioChanged',
        sampleID: this.componentId(),
        materialGroup,
      };
      onChange(event);
    }
  }

  /**
   * Handles changes to the component's reference status.
   * @param {Object} e - The change event
   */
  handleReferenceChange(e) {
    const { value } = e.target;

    const { materialGroup, onChange } = this.props;

    if (onChange) {
      const event = {
        type: 'referenceChanged',
        materialGroup,
        sampleID: this.componentId(),
        value
      };
      onChange(event);
    }
  }

  /**
   * Toggles the concentration lock state for a component.
   * @param {Object} material - The material component
   * @param {boolean} lockConc - The new lock state
   */
  handleConcentrationLockToggle(material, lockConc) {
    // Trigger the action to toggle the component's lock state
    ComponentActions.toggleComponentLock(material.id, lockConc);
  }

  /**
   * Updates the component store state.
   * @param {Object} state - The new component store state
   */
  onComponentStoreChange(state) {
    this.setState({ ...state });
  }

   /**
   * Renders the material name with IUPAC information and optional parent sample link.
   * @param {Object} material - The material component to display
   * @returns {JSX.Element} The rendered material name component
   */
  materialNameWithIupac(material) {
    let moleculeIupacName = '';
    const iupacStyle = {
      display: 'block',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%'
    };

    const displayName = material.molecule_iupac_name || material.molecule?.sum_formular || '';

    // Only make it clickable if it has a parent_id
    moleculeIupacName = material.parent_id ? (
      <a
        role="link"
        tabIndex={0}
        onClick={() => this.handleMaterialClick(material)}
        style={{
          cursor: 'pointer',
          textDecoration: 'underline'
        }}
        title="Click to view parent sample"
      >
        <span>{displayName}</span>
      </a>
    ) : (
      <span>{displayName}</span>
    );

    return (
      <div
        className={material.parent_id ? 'reaction-material-link' : ''}
        style={{ display: 'inline-block', maxWidth: '100%' }}>
        <span style={iupacStyle}>
          {this.svgPreview(material, moleculeIupacName)}
        </span>
      </div>
    );
  }

  nameInput(material) {
    const { sample } = this.props;

    return (
      <Form.Group size="sm">
        <Form.Control
          type="text"
          value={material.name || ''}
          onChange={(e) => this.handleNameChange(e, material.name)}
          disabled={!permitOn(sample)}
        />
      </Form.Group>
    );
  }

  component() {
    const { material } = this.props;

    return material;
  }

  componentId() {
    return this.component().id;
  }

  generateMolecularWeightTooltipText(sample) {
    const molecularWeight = sample.decoupled
      ? (sample.molecular_mass) : (sample.molecule && sample.molecule.molecular_weight);
    return `molar mass: ${molecularWeight} g/mol`;
  }

  notApplicableInput() {
    return (
      <td className="pt-4 px-1">
        <Form.Control type="text" value="N / A" disabled />
      </td>
    );
  }

  materialVolume(material) {
    if (material.contains_residues) { return this.notApplicableInput(); }

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
          variant={material.amount_unit === 'l' ? 'success' : 'light'}
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
            variant={material.error_mass ? 'danger' : massBsStyle}
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
          variant={material.amount_unit === 'mol' ? 'success' : 'light'}
        />
      </td>
    );
  }

  componentRatio(material) {
    const { sample } = this.props;
    // Only disable if user cannot edit, concentration is locked, or the material has a truthy reference
    const isDisabled = !permitOn(sample) || material.isComponentConcentrationLocked() || !!material.reference;

    return (
      <td style={{ verticalAlign: 'top' }}>
        <NumeralInputWithUnitsCompo
          precision={4}
          value={material.equivalent || 0}
          disabled={isDisabled}
          onChange={(e) => this.handleRatioChange(e, material.equivalent)}
        />
      </td>
    );
  }

  componentConc(material, metricMolConc, metricPrefixesMolConc) {
    const { sample } = this.props;
    const { lockedComponents } = this.state;

    const isConcentrationLocked = lockedComponents.includes(material.id);

    return (
      <td style={{ verticalAlign: 'top', display: 'flex', alignItems: 'center' }}>
        {this.renderLockButton(
          material,
          isConcentrationLocked,
          () => this.handleConcentrationLockToggle(material, isConcentrationLocked)
        )}

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
    const { sample } = this.props;

    return (
      <td>
        <Form.Check
          type="radio"
          disabled={!permitOn(sample)}
          name="reference"
          checked={material.reference}
          onChange={(e) => this.handleReferenceChange(e)}
          size="xsm"
          className="m-0"
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

  /**
   * Returns true if the purity field should be disabled for a material.
   * Disabled if user cannot edit or if starting molarity value is set and not zero.
   */
  isPurityDisabled(sample, material) {
    return (
      !permitOn(sample)
      || (
        material.material_group === 'liquid'
        && material.starting_molarity_value
        && material.starting_molarity_value !== 0
      )
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
            variant="danger"
            size="sm"
            onClick={() => deleteMaterial(material)}
          >
            <i className="fa fa-trash-o" />
          </Button>
        </td>

        {activeTab === 'concentration' && this.componentStartingConc(material, metricMolConc, metricPrefixesMolConc)}
        {activeTab === 'density' && this.componentDensity(material)}

        {this.materialVolume(material)}

        {this.componentMol(material, metricMol, metricPrefixesMol)}

        {this.componentRatio(material)}

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
                disabled={this.isPurityDisabled(sample, material)}
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
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[0]) > -1) ? material.metrics[0] : 'm';
    const metricPrefixesMol = ['m', 'n'];
    const metricMol = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[2]) > -1) ? material.metrics[2] : 'm';
    const massBsStyle = material.amount_unit === 'g' ? 'success' : 'light';
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
            variant="danger"
            size="sm"
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

        {this.componentRatio(material)}

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
                disabled={this.isPurityDisabled(sample, material)}
                onChange={(e) => this.handlePurityChange(e, material.purity)}
              />
            </td>
          )
        }
      </tr>
    );
  }

  /**
   * Renders a preview of the molecule with SVG and popover.
   * @param {Object} material - The material to preview
   * @param {string} moleculeIupacName - The IUPAC name to display
   * @returns {JSX.Element} The SVG preview component
   */
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

  renderLockButton(material, lockConc, handleConcentrationLockToggle) {
    const isDisabled = material.concn === 0;

    const tooltip = (
      <Tooltip id="switch-concentration">
        <span style={{ display: 'block' }}>
          {isDisabled ? 'Total Conc. is 0, cannot lock/unlock' : 'Lock/unlock'}
        </span>
      </Tooltip>
    );

    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <div>
          <Button
            onClick={handleConcentrationLockToggle}
            size="sm"
            variant={lockConc ? 'warning' : 'light'}
            className="ms-1"
            disabled={isDisabled}
          >
            <i className={lockConc ? 'fa fa-lock' : 'fa fa-unlock'} />
          </Button>
        </div>
      </OverlayTrigger>
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

/**
 * PropTypes for SampleComponent
 * @type {Object}
 */
SampleComponent.propTypes = {
  sample: PropTypes.object.isRequired,
  material: PropTypes.instanceOf(Sample).isRequired,
  materialGroup: PropTypes.string.isRequired,
  deleteMaterial: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  isDragging: PropTypes.bool,
  canDrop: PropTypes.bool,
  isOver: PropTypes.bool,
  enableComponentLabel: PropTypes.bool.isRequired,
  enableComponentPurity: PropTypes.bool.isRequired,
};

SampleComponent.defaultProps = {
  isDragging: false,
  canDrop: false,
  isOver: false,
};
