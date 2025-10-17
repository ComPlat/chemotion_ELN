import React from 'react';
import PropTypes from 'prop-types';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';
import SampleDetailsComponentsDnd from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponentsDnd'; // Import the appropriate Dnd component
import UIStore from 'src/stores/alt/stores/UIStore';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import Component from 'src/models/Component';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import { checkComponentVolumeAndNotify } from 'src/utilities/VolumeUtils';
import {
  ListGroup, ListGroupItem, Button, Modal
} from 'react-bootstrap';

/**
 * SampleDetailsComponents manages the display and interaction of components within a sample.
 * It handles both liquid and solid components, including their addition, removal, and modification.
 * @class SampleDetailsComponents
 * @extends React.Component
 */
export default class SampleDetailsComponents extends React.Component {
  /**
   * Creates an instance of SampleDetailsComponents.
   * @param {Object} props - Component props
   * @param {Sample} props.sample - The sample containing the components
   * @param {Function} props.onChange - Callback for sample changes
   * @param {boolean} props.isOver - Whether a drag operation is over the component
   * @param {boolean} props.canDrop - Whether the component can accept drops
   * @param {boolean} props.enableComponentLabel - Whether to show component labels
   * @param {boolean} props.enableComponentPurity - Whether to show component purity
   */
  constructor(props) {
    super(props);

    const { sample } = props;
    this.state = {
      sample,
      showModal: false,
      droppedMaterial: null,
      activeTab: 'concentration',
    };

    this.dropSample = this.dropSample.bind(this);
    this.dropMaterial = this.dropMaterial.bind(this);
    this.deleteMixtureComponent = this.deleteMixtureComponent.bind(this);
    this.onChangeComponent = this.onChangeComponent.bind(this);
    this.updatedSampleForAmountUnitChange = this.updatedSampleForAmountUnitChange.bind(this);
    this.updatedSampleForMetricsChange = this.updatedSampleForMetricsChange.bind(this);
    this.updateComponentName = this.updateComponentName.bind(this);
    this.updateRatio = this.updateRatio.bind(this);
    this.updateSampleForReferenceChanged = this.updateSampleForReferenceChanged.bind(this);
    this.showModalWithMaterial = this.showModalWithMaterial.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalAction = this.handleModalAction.bind(this);
    this.handleTabSelect = this.handleTabSelect.bind(this);
    this.updatePurity = this.updatePurity.bind(this);
  }

  /**
   * Closes the modal dialog and resets the dropped material state.
   */
  handleModalClose() {
    this.setState({ showModal: false, droppedMaterial: null });
  }

  /**
   * Handles modal action (merge or move) for dropped materials.
   * @param {string} action - The action to perform ('merge' or 'move')
   */
  handleModalAction(action) {
    const { droppedMaterial, sample } = this.state;

    if (droppedMaterial) {
      const {
        srcMat, srcGroup, tagMat, tagGroup
      } = droppedMaterial;
      this.dropMaterial(srcMat, srcGroup, tagMat, tagGroup, action);
    }
    this.handleModalClose();
    this.props.onChange(sample);
  }

  /**
   * Handles tab selection in the component view.
   * @param {string} tab - The selected tab name
   */
  handleTabSelect(tab) {
    this.setState({ activeTab: tab });
  }

  /**
   * Updates total volume only if component concentration is locked
   * @param {Object} component - The component to check
   * @param {Sample} sample - The parent sample
   */
  updateTotalVolumeIfConcentrationLocked(component, sample) {
    if (component.isComponentConcentrationLocked()) {
      sample.updateTotalVolume(component.amount_mol, component.concn);
    }
  }

  /**
   * Handles changes to component amount and units.
   * @param {Object} changeEvent - The change event
   * @param {Object} currentComponent - The component being modified
   * @param {Object} referenceComponent - The reference component
   */
  handleAmountUnitChange(changeEvent, currentComponent, referenceComponent) {
    const { sample } = this.props;
    const { amount, concType, lockColumn } = changeEvent;

    const totalVolume = sample.amount_l;

    switch (amount.unit) {
      case 'l':
      case 'g':
        // volume/mass given, update amount
        currentComponent.handleVolumeChange(amount, totalVolume, referenceComponent);
        this.updateTotalVolumeIfConcentrationLocked(currentComponent, sample);
        break;
      case 'mol':
        // amount given, update volume/mass
        currentComponent.handleAmountChange(amount, totalVolume, referenceComponent);
        this.updateTotalVolumeIfConcentrationLocked(currentComponent, sample);
        break;
      case 'mol/l':
        // starting conc./target concentration changes
        currentComponent.handleConcentrationChange(amount, totalVolume, concType, lockColumn, referenceComponent);
        break;
      default:
        break;
    }
  }

  /**
   * Updates reference component based on purity changes.
   * @param {boolean} lockAmountColumnSolids - Whether solid amounts are locked
   * @param {string} materialGroup - The material group type
   */
  handleReferenceComponentUpdateFromPurity(lockAmountColumnSolids, materialGroup) {
    const { sample } = this.props;

    if (materialGroup === 'liquid') {
      sample.updateMixtureComponentEquivalent();
    } else if (materialGroup === 'solid') {
      if (lockAmountColumnSolids) {
        sample.updateMixtureComponentEquivalent();
      } else {
        sample.updateMixtureMolecularWeight();
      }
    }
  }

  /**
   * Handles changes to component properties.
   * @param {Object} changeEvent - The change event containing the type and data
   */
  onChangeComponent(changeEvent) {
    const { sample } = this.state;

    sample.components = sample.components.map((component) => {
      if (!(component instanceof Component)) {
        return new Component(component);
      }
      return component;
    });

    switch (changeEvent.type) {
      case 'amountChanged':
        this.updatedSampleForAmountUnitChange(changeEvent);
        break;
      case 'MetricsChanged':
        this.updatedSampleForMetricsChange(changeEvent);
        break;
      case 'nameChanged':
        this.updateComponentName(changeEvent);
        break;
      case 'ratioChanged':
        this.updateRatio(changeEvent);
        break;
      case 'referenceChanged':
        this.updateSampleForReferenceChanged(changeEvent);
        break;
      case 'purityChanged':
        this.updatePurity(changeEvent);
        break;
      case 'densityChanged':
        this.updateDensity(changeEvent);
        break;
      default:
        break;
    }
    checkComponentVolumeAndNotify(sample);
    this.props.onChange(sample);
  }

  /**
   * Updates sample for amount/unit changes.
   * @param {Object} changeEvent - The change event
   */
  updatedSampleForAmountUnitChange(changeEvent) {
    const { sample } = this.props;
    const { sampleID, amount } = changeEvent;

    const componentIndex = sample.components.findIndex((component) => component.id === sampleID);
    const currentComponent = sample.components[componentIndex];

    const referenceComponent = sample.reference_component;

    // Set active amount unit for highlighting consistency
    if (amount && amount.unit) {
      currentComponent.amount_unit = amount.unit;
    }

    // Handle different units of measurement
    this.handleAmountUnitChange(changeEvent, currentComponent, referenceComponent);

    // Check if the component is the reference component
    if (referenceComponent && referenceComponent.id === sampleID) {
      // Update ratio of other non-reference components
      sample.updateMixtureComponentEquivalent();
    }

    // Update sample total mass for the reaction scheme
    sample.calculateTotalMixtureMass();

    // Calculate relative molecular weight
    currentComponent.calculateRelativeMolecularWeight(sample);
  }

  /**
   * Updates component density.
   * @param {Object} changeEvent - The change event
   */
  updateDensity(changeEvent) {
    const { sample } = this.props;
    const { sampleID, amount, lockColumn } = changeEvent;
    const componentIndex = sample.components.findIndex(
      (component) => component.id === sampleID
    );

    if (componentIndex === -1) {
      console.error('Component not found');
      return;
    }

    const currentComponent = sample.components[componentIndex];
    const totalVolume = sample.amount_l;

    currentComponent.handleDensityChange(amount, lockColumn, totalVolume);

    // update components ratio
    sample.updateMixtureComponentEquivalent();

    // update sample total mass for the reaction scheme
    sample.calculateTotalMixtureMass();

    // Calculate relative molecular weight
    currentComponent.calculateRelativeMolecularWeight(sample);
  }

  /**
   * Updates component ratio.
   * @param {Object} changeEvent - The change event
   */
  updateRatio(changeEvent) {
    const { sample } = this.props;
    const { sampleID, newRatio, materialGroup } = changeEvent;

    const componentIndex = sample.components.findIndex(
      (component) => component.id === sampleID
    );
    const refIndex = sample.components.findIndex(
      (component) => component.reference === true
    );

    if (componentIndex === -1 || refIndex === -1) {
      console.error('Component or reference component not found');
      return;
    }

    const referenceMoles = sample.components[refIndex].amount_mol;
    const totalVolume = sample.amount_l;
    const currentComponent = sample.components[componentIndex];

    currentComponent.updateRatio(newRatio, materialGroup, totalVolume, referenceMoles);
    this.updateTotalVolumeIfConcentrationLocked(currentComponent, sample);
  }

  /**
   * Updates component purity.
   * @param {Object} changeEvent - The change event
   */
  updatePurity(changeEvent) {
    const { sample } = this.props;
    const { sampleID, amount, materialGroup } = changeEvent;
    const { lockAmountColumnSolids } = ComponentStore.getState() || { lockAmountColumnSolids: false };

    const purity = amount.value;
    const referenceComponent = sample.reference_component;
    const totalVolume = sample.amount_l;

    const componentIndex = sample.components.findIndex((component) => component.id === sampleID);
    if (componentIndex === -1) {
      console.error('Component not found');
      return;
    }

    const currentComponent = sample.components[componentIndex];
    currentComponent.setPurity(purity, totalVolume, referenceComponent, lockAmountColumnSolids, materialGroup);

    this.updateTotalVolumeIfConcentrationLocked(currentComponent, sample);

    // Check if the component is the reference component
    if (referenceComponent && referenceComponent.id === sampleID) {
      this.handleReferenceComponentUpdateFromPurity(lockAmountColumnSolids, materialGroup);
    }
  }

  /**
   * Updates sample for metrics changes.
   * @param {Object} changeEvent - The change event
   */
  updatedSampleForMetricsChange(changeEvent) {
    const { sample } = this.props;
    const { sampleID, metricUnit, metricPrefix } = changeEvent;
    const componentIndex = sample.components.findIndex(
      (component) => (component.parent_id === sampleID || component.id === sampleID)
    );
    sample.components[componentIndex].setUnitMetrics(metricUnit, metricPrefix);
  }

  /**
   * Handles dropping a sample into the component list.
   * @param {Sample|Molecule} srcSample - The source sample or molecule
   * @param {Object} tagMaterial - The target material
   * @param {string} tagGroup - The target group
   * @param {string} [extLabel] - Optional external label
   * @param {boolean} [isNewSample=false] - Whether this is a new sample
   */
  dropSample(srcSample, tagMaterial, tagGroup, extLabel, isNewSample = false) {
    const { sample } = this.state;
    const { currentCollection } = UIStore.getState();
    let splitSample;

    if (srcSample instanceof Molecule || isNewSample) {
      splitSample = Sample.buildNew(srcSample, currentCollection.id);
      splitSample = new Component(splitSample);
    } else if (srcSample instanceof Sample) {
      splitSample = srcSample.buildChildWithoutCounter();
      splitSample = new Component(splitSample);
    }

    splitSample.material_group = tagGroup;

    if (splitSample.isMixture()) {
      ComponentsFetcher.fetchComponentsBySampleId(srcSample.id)
        .then(async (components) => {
          await Promise.all(
            components.map(async (component) => {
              const sampleComponent = Component.createFromSampleData(
                component,
                splitSample.parent_id,
                tagGroup,
                sample,
              );
              await sample.addMixtureComponent(sampleComponent);
              sample.updateMixtureComponentEquivalent();
            })
          );
          this.props.onChange(sample);
        }).catch((errorMessage) => {
          console.error(errorMessage);
        });
    } else {
      sample.addMixtureComponent(splitSample)
        .then(() => {
          sample.updateMixtureComponentEquivalent();
          this.props.onChange(sample);
        })
        .catch((errorMessage) => {
          console.error('Error adding component:', errorMessage);
        });
    }
  }

  /**
   * Updates component name.
   * @param {Object} changeEvent - The change event
   */
  updateComponentName(changeEvent) {
    const { sample } = this.props;
    const { sampleID, newName } = changeEvent;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => component.id === sampleID
    );
    sample.components[componentIndex].name = newName;

    this.props.onChange(sample);
  }

  /**
   * Handles dropping a material into the component list.
   * @param {Object} srcMat - The source material
   * @param {string} srcGroup - The source group
   * @param {Object} tagMat - The target material
   * @param {string} tagGroup - The target group
   * @param {string} action - The action to perform ('move' or 'merge')
   */
  dropMaterial(srcMat, srcGroup, tagMat, tagGroup, action) {
    const { sample } = this.state;
    sample.components = sample.components.map((component) => {
      if (!(component instanceof Component)) {
        return new Component(component);
      }
      return component;
    });

    if (action === 'move') {
      sample.moveMaterial(srcMat, srcGroup, tagMat, tagGroup);
      this.props.onChange(sample);
    } else if (action === 'merge') {
      sample.mergeComponents(srcMat, srcGroup, tagMat, tagGroup)
        .then(() => {
          this.props.onChange(sample);
        })
        .catch((error) => {
          console.error('Error merging components:', error);
        });
    }
  }

  /**
   * Deletes a component from the mixture.
   * @param {Object} component - The component to delete
   */
  async deleteMixtureComponent(component) {
    const { sample } = this.state;
    
    // Set loading state for component deletion
    if (this.props.setComponentDeletionLoading) {
      this.props.setComponentDeletionLoading(true);
    }
    
    try {
      await sample.deleteMixtureComponent(component);
      this.props.onChange(sample);
    } finally {
      // Clear loading state
      if (this.props.setComponentDeletionLoading) {
        this.props.setComponentDeletionLoading(false);
      }
    }
  }

  /**
   * Updates sample when reference component changes.
   * @param {Object} changeEvent - The change event
   */
  updateSampleForReferenceChanged(changeEvent) {
    const { sample } = this.props;
    const { sampleID } = changeEvent;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => component.id === sampleID
    );

    sample.setReferenceComponent(componentIndex);
  }

  /**
   * Shows modal for material drop operations.
   * @param {Object} srcMat - The source material
   * @param {string} srcGroup - The source group
   * @param {Object} tagMat - The target material
   * @param {string} tagGroup - The target group
   */
  showModalWithMaterial(srcMat, srcGroup, tagMat, tagGroup) {
    if (!tagMat && srcGroup !== tagGroup) {
      this.setState({
        showModal: false,
        droppedMaterial: null,
      });
      return this.dropMaterial(srcMat, srcGroup, tagMat, tagGroup, 'move');
    }
    this.setState({
      showModal: true,
      droppedMaterial: {
        srcMat, srcGroup, tagMat, tagGroup
      },
    });
  }

  /**
   * Renders the modal dialog for material operations.
   * @returns {JSX.Element} The modal component
   */
  renderModal() {
    return (
      <Modal show={this.state.showModal} onHide={this.handleModalClose}>
        <Modal.Header closeButton />
        <Modal.Body>
          <p>Do you want to merge or move this component?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="success" onClick={() => this.handleModalAction('merge')}>Merge</Button>
          <Button variant="primary" onClick={() => this.handleModalAction('move')}>Move</Button>
          <Button variant="light" onClick={this.handleModalClose}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  /**
   * Renders the component list.
   * @returns {JSX.Element} The rendered component
   */
  render() {
    const {
      sample, isOver, canDrop, enableComponentLabel, enableComponentPurity
    } = this.props;
    const style = {
      padding: '2px 5px',
    };
    if (isOver && canDrop) {
      style.borderStyle = 'dashed';
      style.borderColor = '#337ab7';
    } else if (canDrop) {
      style.borderStyle = 'dashed';
    }
    const minPadding = { padding: '1px 2px 2px 0px' };

    if (sample && sample.components) {
      sample.components = sample.components.map((component) => (component instanceof Component ? component : new Component(component)));
    }

    const liquids = sample.components
      ? sample.components.filter((component) => component.material_group === 'liquid')
      : [];
    const solids = sample.components
      ? sample.components.filter((component) => component.material_group === 'solid')
      : [];

    return (
      <ListGroup fill="true">
        {this.renderModal()}
        <ListGroupItem style={minPadding}>
          <SampleDetailsComponentsDnd
            sample={sample}
            sampleComponents={liquids}
            dropSample={this.dropSample}
            dropMaterial={this.dropMaterial}
            deleteMixtureComponent={this.deleteMixtureComponent}
            onChangeComponent={(changeEvent) => this.onChangeComponent(changeEvent)}
            materialGroup="liquid"
            showModalWithMaterial={this.showModalWithMaterial}
            handleTabSelect={this.handleTabSelect}
            activeTab={this.state.activeTab}
            enableComponentLabel={enableComponentLabel}
            enableComponentPurity={enableComponentPurity}
          />
        </ListGroupItem>
        <ListGroupItem style={minPadding}>
          <SampleDetailsComponentsDnd
            sample={sample}
            sampleComponents={solids}
            dropSample={this.dropSample}
            dropMaterial={this.dropMaterial}
            deleteMixtureComponent={this.deleteMixtureComponent}
            onChangeComponent={(changeEvent) => this.onChangeComponent(changeEvent)}
            materialGroup="solid"
            showModalWithMaterial={this.showModalWithMaterial}
            handleTabSelect={this.handleTabSelect}
            activeTab={this.state.activeTab}
            enableComponentLabel={enableComponentLabel}
            enableComponentPurity={enableComponentPurity}
          />
        </ListGroupItem>
      </ListGroup>
    );
  }
}

/**
 * PropTypes for SampleDetailsComponents
 * @type {Object}
 */
SampleDetailsComponents.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  onChange: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  enableComponentLabel: PropTypes.bool.isRequired,
  enableComponentPurity: PropTypes.bool.isRequired,
};
