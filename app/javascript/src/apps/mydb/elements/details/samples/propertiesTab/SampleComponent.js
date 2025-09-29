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
import UIActions from 'src/stores/alt/actions/UIActions';
import {
  getMetricMol,
  getMetricMolConc,
  metricPrefixesMol,
  metricPrefixesMolConc
} from 'src/utilities/MetricsUtils';

/**
 * Drag source specification for material drag-and-drop.
 * @type {Object}
 */
const matSource = {
  /**
   * Called when drag starts for a material component.
   * @param {Object} props - The component props
   * @returns {Object} The props to be used as drag item
   */
  beginDrag(props) {
    return props;
  },
};

/**
 * Drop the target specification for material drag-and-drop.
 * @type {Object}
 */
const matTarget = {
  /**
   * Handles drop event for drag-and-drop of materials/samples/molecules.
   * @param {Object} tagProps - The target component props
   * @param {Object} monitor - The drag-and-drop monitor
   */
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
  /**
   * Determines if the dragged item can be dropped on this target.
   * @param {Object} tagProps - The target component props
   * @param {Object} monitor - The drag-and-drop monitor
   * @returns {boolean} True if drop is allowed
   */
  canDrop(tagProps, monitor) {
    const srcType = monitor.getItemType();
    const isCorrectType = srcType === DragDropItemTypes.MATERIAL
    || srcType === DragDropItemTypes.SAMPLE
    || srcType === DragDropItemTypes.MOLECULE;
    return isCorrectType;
  },
};

/**
 * Collects drag source props for react-dnd.
 * @param {Object} connect - The drag source connector
 * @param {Object} monitor - The drag source monitor
 * @returns {Object} Drag source props
 */
const matSrcCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

/**
 * Collects drop target props for react-dnd.
 * @param {Object} connect - The drop target connector
 * @param {Object} monitor - The drop target monitor
 * @returns {Object} Drop target props
 */
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
      UIActions.setRedirectedFromMixture(true);
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

  /**
   * Returns the material component for this instance.
   * @returns {Object} The material component
   */
  component() {
    const { material } = this.props;

    return material;
  }

  /**
   * Returns the ID of the material component.
   * @returns {number|string} The component ID
   */
  componentId() {
    return this.component().id;
  }

  /**
   * Generates tooltip text for molecular weight.
   * @param {Object} material - The material object
   * @returns {string} Tooltip text
   */
  generateMolecularWeightTooltipText(material) {
    const molecularWeight = material.decoupled
      ? (material.molecular_mass) : (material.molecule && material.molecule.molecular_weight);

    let tooltipText = molecularWeight ? `molar mass: ${molecularWeight.toFixed(6)} g/mol` : 'molar mass: N/A';

    // Add relative molecular weight if available
    const relativeMolecularWeight = material.component_properties?.relative_molecular_weight;
    if (relativeMolecularWeight && relativeMolecularWeight > 0) {
      tooltipText += `\nrelative molecular weight: ${relativeMolecularWeight.toFixed(6)} g/mol`;
    }

    return tooltipText;
  }

  /**
   * Renders a disabled input for N/A fields.
   * @returns {JSX.Element} The N/A input
   */
  notApplicableInput() {
    return (
      <td className="pt-4 px-1">
        <Form.Control type="text" value="N / A" disabled />
      </td>
    );
  }

  /**
   * Renders the volume input for a material.
   * @param {Object} material - The material object
   * @returns {JSX.Element} The volume input cell
   */
  materialVolume(material) {
    if (material.contains_residues) { return this.notApplicableInput(); }

    const { sample, enableComponentPurity } = this.props;
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[1]) > -1) ? material.metrics[1] : 'm';

    return (
      <td
        style={enableComponentPurity === false ? { verticalAlign: 'bottom' } : null}
      >
        <NumeralInputWithUnitsCompo
          key={material.id}
          value={material.amount_l}
          unit="l"
          metricPrefix={metric}
          metricPrefixes={metricPrefixes}
          precision={3}
          disabled={!permitOn(sample)}
          onChange={(e) => this.handleAmountChange(e, material.amount_l, '', false)}
          onMetricsChange={this.handleMetricsChange}
          variant={material.amount_unit === 'l' ? 'success' : 'light'}
        />
      </td>
    );
  }

  /**
   * Renders the mass input for a solid component.
   * @param {Object} material - The material object
   * @param {string} metric - The metric prefix
   * @param {Array<string>} metricPrefixes - Allowed metric prefixes
   * @param {string} massBsStyle - Bootstrap style for the input
   * @returns {JSX.Element} The mass input cell
   */
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
            onChange={(e) => this.handleAmountChange(e, material.amount_g, '', lockAmountColumnSolids)}
            onMetricsChange={this.handleMetricsChange}
            variant={material.error_mass ? 'danger' : massBsStyle}
            name="molecular-weight"
          />
        </div>
      </OverlayTrigger>
    );
  }

  /**
   * Renders the mol input for a component.
   * @param {Object} material - The material object
   * @param {string} metricMol - The metric prefix for mol
   * @param {Array<string>} metricPrefixesMol - Allowed metric prefixes for mol
   * @returns {JSX.Element} The mol input cell
   */
  componentMol(material, metricMol, metricPrefixesMol) {
    const { sample, enableComponentPurity } = this.props;

    return (
      <td
        style={enableComponentPurity === false ? { verticalAlign: 'bottom' } : null}
      >
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
              value={material.amount_mol}
              unit="mol"
              metricPrefix={metricMol}
              metricPrefixes={metricPrefixesMol}
              precision={4}
              disabled={!permitOn(sample)}
              onChange={(e) => this.handleAmountChange(e, material.amount_mol, '', false)}
              onMetricsChange={this.handleMetricsChange}
              variant={material.amount_unit === 'mol' ? 'success' : 'light'}
            />
          </div>
        </OverlayTrigger>
      </td>
    );
  }

  /**
   * Renders the ratio input for a component.
   * @param {Object} material - The material object
   * @returns {JSX.Element} The ratio input cell
   */
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

  /**
   * Renders the concentration input for a component.
   * @param {Object} material - The material object
   * @param {string} metricMolConc - The metric prefix for concentration
   * @param {Array<string>} metricPrefixesMolConc - Allowed metric prefixes for concentration
   * @returns {JSX.Element} The concentration input cell
   */
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

  /**
   * Renders the starting concentration input for a component.
   * @param {Object} material - The material object
   * @param {string} metricMolConc - The metric prefix for concentration
   * @param {Array<string>} metricPrefixesMolConc - Allowed metric prefixes for concentration
   * @returns {JSX.Element} The starting concentration input cell
   */
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

  /**
   * Renders the reference radio button for a material.
   * @param {Object} material - The material object
   * @returns {JSX.Element} The reference radio input
   */
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

  /**
   * Renders the density input for a component.
   * @param {Object} material - The material object
   * @returns {JSX.Element} The density input cell
   */
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
   * @param {Object} sample - The sample object
   * @param {Object} material - The material object
   * @returns {boolean} True if purity should be disabled
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

  /**
   * Renders a table row for a mixture (liquid) component.
   * @param {Object} props - The component props
   * @param {Object} style - The style object
   * @returns {JSX.Element} The table row
   */
  mixtureComponent(props, style) {
    const {
      sample, material, deleteMaterial, connectDragSource, connectDropTarget, activeTab, enableComponentPurity
    } = props;
    const metricMol = getMetricMol(material);
    const metricMolConc = getMetricMolConc(material);

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
   * Renders a table row for a solid component.
   * @param {Object} props - The component props
   * @param {Object} style - The style object
   * @returns {JSX.Element} The table row
   */
  solidComponent(props, style) {
    const {
      sample, material, deleteMaterial, connectDragSource, connectDropTarget, enableComponentPurity
    } = props;
    const metricPrefixes = ['m', 'n', 'u'];
    const metric = (material.metrics && material.metrics.length > 2 && metricPrefixes.indexOf(material.metrics[0]) > -1) ? material.metrics[0] : 'm';
    const metricMol = getMetricMol(material);
    const massBsStyle = material.amount_unit === 'g' ? 'success' : 'light';
    const metricMolConc = getMetricMolConc(material);

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
          style={enableComponentPurity === false ? { verticalAlign: 'bottom' } : null}
        >
          {this.componentMass(material, metric, metricPrefixes, massBsStyle)}
        </td>

        {this.componentMol(material, metricMol, metricPrefixesMol)}

        {this.componentRatio(material)}

        {this.materialRef(material)}

        {this.componentConc(material, metricMolConc, metricPrefixesMolConc)}

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

  /**
   * Renders the lock/unlock button for concentration.
   * @param {Object} material - The material object
   * @param {boolean} lockConc - Whether the concentration is locked
   * @param {Function} handleConcentrationLockToggle - Handler for lock toggle
   * @returns {JSX.Element} The lock button
   */
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

  /**
   * Renders the component row (liquid or solid) with drag-and-drop styling.
   * @returns {JSX.Element} The rendered row
   */
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
