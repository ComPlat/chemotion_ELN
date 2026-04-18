import React from 'react';
import PropTypes from 'prop-types';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';
import SampleDetailsComponentsDnd
  from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponentsDnd';
import UIStore from 'src/stores/alt/stores/UIStore';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import Component from 'src/models/Component';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import { checkComponentVolumeAndNotify } from 'src/utilities/VolumeUtils';
import {
  ListGroup, ListGroupItem, Button
} from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';

/**
 * SampleDetailsComponents manages the display and interaction of components within a sample.
 * It handles both liquid and solid components, including their addition, removal, and modification.
 * @class SampleDetailsComponents
 * @extends React.Component
 */
export default class SampleDetailsComponents extends React.Component {
  /**
   * Updates total volume only if component concentration is locked
   * @param {Object} component - The component to check
   * @param {Sample} sample - The parent sample
   */
  static updateTotalVolumeIfConcentrationLocked(component, sample) {
    if (component.isComponentConcentrationLocked()) {
      sample.updateTotalVolume(component.amount_mol, component.concn);
    }
  }

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
    this.state = {
      showModal: false,
      droppedMaterial: null,
      activeTab: 'concentration',
    };

    // Counter to track pending molecule update requests
    this.pendingMoleculeRequests = 0;
    // Sequence counter to ensure only the latest molecule update is applied
    this.moleculeUpdateSequence = 0;

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
    this.startMoleculeUpdate = this.startMoleculeUpdate.bind(this);
    this.endMoleculeUpdate = this.endMoleculeUpdate.bind(this);
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
    const { droppedMaterial } = this.state;
    const { sample, onChange } = this.props;

    if (droppedMaterial) {
      const {
        srcMat, srcGroup, tagMat, tagGroup
      } = droppedMaterial;
      this.dropMaterial(srcMat, srcGroup, tagMat, tagGroup, action);
    }
    this.handleModalClose();
    onChange(sample);
  }

  /**
   * Handles tab selection in the component view.
   * @param {string} tab - The selected tab name
   */
  handleTabSelect(tab) {
    this.setState({ activeTab: tab });
  }

  /**
   * Handles changes to component amount and units.
   * @param {Object} changeEvent - The change event
   * @param {Object} currentComponent - The component being modified
   */
  handleAmountUnitChange(changeEvent, currentComponent) {
    const { sample } = this.props;
    const { amount, concType, lockColumn } = changeEvent;

    const totalVolume = sample.amount_l;

    switch (amount.unit) {
      case 'l':
      case 'g':
        // volume/mass given, update amount
        currentComponent.handleVolumeChange(amount, totalVolume);
        SampleDetailsComponents.updateTotalVolumeIfConcentrationLocked(currentComponent, sample);
        break;
      case 'mol':
        // amount given, update volume/mass
        currentComponent.handleAmountChange(amount, totalVolume);
        SampleDetailsComponents.updateTotalVolumeIfConcentrationLocked(currentComponent, sample);
        break;
      case 'mol/l':
        // starting conc./target concentration changes
        currentComponent.handleConcentrationChange(amount, totalVolume, concType, lockColumn);
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

    // Update equivalent only if:
    // - Liquid: Always update
    // - Solid: Update if amount column is locked (user has manually entered a value)
    if (materialGroup === 'liquid' || (materialGroup === 'solid' && lockAmountColumnSolids)) {
      sample.updateMixtureComponentEquivalent();
    }
  }

  /**
   * Handles changes to component properties.
   * @param {Object} changeEvent - The change event containing the type and data
   */
  onChangeComponent(changeEvent) {
    const { sample, onChange } = this.props;

    sample.components = this.normalizeComponents(sample.components);

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
    onChange(sample);
  }

  /**
   * Starts a molecule update request and manages loading state.
   * Increments the pending request counter and sets loading to true if first request.
   */
  startMoleculeUpdate() {
    const { setMoleculeLoading } = this.props;
    this.pendingMoleculeRequests += 1;
    if (this.pendingMoleculeRequests === 1) {
      setMoleculeLoading(true);
    }
  }

  /**
   * Starts a sequenced molecule update to prevent race conditions.
   * @returns {number} The sequence number for this update request
   */
  startSequencedMoleculeUpdate() {
    this.startMoleculeUpdate();
    this.moleculeUpdateSequence += 1;
    return this.moleculeUpdateSequence;
  }

  /**
   * Ends a molecule update request and manages loading state.
   * Decrements the pending request counter and sets loading to false if no pending requests.
   */
  endMoleculeUpdate() {
    const { setMoleculeLoading } = this.props;
    this.pendingMoleculeRequests = Math.max(0, this.pendingMoleculeRequests - 1);
    if (this.pendingMoleculeRequests === 0) {
      setMoleculeLoading(false);
    }
  }

  /**
   * Checks if the given sequence number is still current (not superseded by newer requests).
   * @param {number} sequenceNumber - The sequence number to check
   * @returns {boolean} True if this sequence is still the latest
   */
  isSequenceCurrent(sequenceNumber) {
    return sequenceNumber === this.moleculeUpdateSequence;
  }

  /**
   * Updates the mixture molecule in the background after component deletion.
   * Handles race conditions where additional deletions may occur during the async fetch.
   * @param {Sample} sample - The sample to update
   * @param {number} updateSequence - The sequence number for this update
   * @param {number} expectedComponentCount - The expected component count after deletion
   * @param {Function} onChange - Callback to trigger UI update
   */
  async updateMoleculeAfterDeletion(sample, updateSequence, expectedComponentCount, onChange) {
    if (!this.isSequenceCurrent(updateSequence)) return;

    try {
      await sample.updateMixtureMolecule();
    } catch (error) {
      console.error('Error updating mixture molecule after deletion:', error);
      return;
    }

    // After async operation, verify state is still valid:
    // - Sequence must still be current
    // - Component count must match (user may have deleted more while waiting)
    const currentComponentCount = sample.components?.length || 0;
    if (this.isSequenceCurrent(updateSequence) && currentComponentCount === expectedComponentCount) {
      onChange(sample);
    } else if (currentComponentCount === 0) {
      // Components were all deleted while we were fetching - ensure molecule is cleared
      sample.clearMoleculeData();
      onChange(sample);
    }
    // If count changed but not zero, a newer sequence will handle the correct update
  }

  /**
   * Normalizes components array to ensure all items are Component instances.
   * @param {Array} components - Array of components to normalize
   * @returns {Array} Array of Component instances
   */
  // eslint-disable-next-line class-methods-use-this
  normalizeComponents(components) {
    if (!components || !Array.isArray(components)) {
      return [];
    }

    return components.map((component) => {
      if (!(component instanceof Component)) {
        return new Component(component);
      }
      return component;
    });
  }

  /**
   * Finds a component by ID with validation.
   * @param {Sample} sample - The sample containing components
   * @param {string} componentID - The component ID to find
   * @returns {Object|null} The component if found, null otherwise
   */
  // eslint-disable-next-line class-methods-use-this
  findComponentById(sample, componentID) {
    if (!sample || !sample.components) {
      console.error('Sample or components not found');
      return null;
    }

    const componentIndex = sample.components.findIndex((component) => component.id === componentID);
    if (componentIndex === -1) {
      console.error('Component not found:', componentID);
      return null;
    }

    return sample.components[componentIndex];
  }

  /**
   * Updates sample for amount/unit changes.
   * @param {Object} changeEvent - The change event
   */
  updatedSampleForAmountUnitChange(changeEvent) {
    const { sample } = this.props;
    const { sampleID, amount } = changeEvent;

    const currentComponent = this.findComponentById(sample, sampleID);
    if (!currentComponent) {
      return;
    }

    // Set active amount unit for highlighting consistency
    if (amount && amount.unit) {
      currentComponent.amount_unit = amount.unit;
    }

    // Handle different units of measurement
    this.handleAmountUnitChange(changeEvent, currentComponent);

    const referenceComponent = sample.reference_component;
    const isReferenceComponent = referenceComponent && referenceComponent.id === sampleID;

    if (isReferenceComponent) {
      // Reference changed → refresh every component ratio
      sample.updateMixtureComponentEquivalent();
    } else if (referenceComponent) {
      // Non-reference changed → only update its own equivalent against the reference
      currentComponent.updateRatioFromReference(referenceComponent);
    }

    // Update sample total mass for the reaction scheme
    sample.calculateTotalMixtureMass();
  }

  /**
   * Updates component density.
   * @param {Object} changeEvent - The change event
   */
  updateDensity(changeEvent) {
    const { sample } = this.props;
    const { sampleID, amount, lockColumn } = changeEvent;

    const currentComponent = this.findComponentById(sample, sampleID);
    if (!currentComponent) {
      return;
    }

    currentComponent.handleDensityChange(amount, lockColumn);

    // update components ratio
    sample.updateMixtureComponentEquivalent();

    // update sample total mass for the reaction scheme
    sample.calculateTotalMixtureMass();
  }

  /**
   * Updates component ratio.
   * @param {Object} changeEvent - The change event
   */
  updateRatio(changeEvent) {
    const { sample } = this.props;
    const { sampleID, newRatio, materialGroup } = changeEvent;

    const currentComponent = this.findComponentById(sample, sampleID);
    if (!currentComponent) {
      return;
    }

    const refIndex = sample.components.findIndex(
      (component) => component.reference === true
    );

    if (refIndex === -1) {
      console.error('Reference component not found');
      return;
    }

    const referenceMoles = sample.components[refIndex].amount_mol;
    const totalVolume = sample.amount_l;

    currentComponent.updateRatio(newRatio, materialGroup, totalVolume, referenceMoles);
    SampleDetailsComponents.updateTotalVolumeIfConcentrationLocked(currentComponent, sample);
  }

  /**
   * Updates component purity.
   * @param {Object} changeEvent - The change event
   */
  updatePurity(changeEvent) {
    const { sample } = this.props;
    const { sampleID, amount, materialGroup } = changeEvent;
    const componentState = ComponentStore.getState();
    const lockAmountColumnSolids = ComponentStore.getLockStateForSample(
      componentState,
      'lockAmountColumnSolids',
      sample?.id
    );

    const purity = amount.value;
    const referenceComponent = sample.reference_component;
    const totalVolume = sample.amount_l;

    const currentComponent = this.findComponentById(sample, sampleID);
    if (!currentComponent) {
      return;
    }
    currentComponent.setPurity(purity, totalVolume, referenceComponent, lockAmountColumnSolids, materialGroup);

    SampleDetailsComponents.updateTotalVolumeIfConcentrationLocked(currentComponent, sample);

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
    const { sample } = this.props;
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

    const { onChange } = this.props;

    if (splitSample.isMixture()) {
      ComponentsFetcher.fetchComponentsBySampleId(srcSample.id)
        .then(async (components) => {
          const sampleComponents = components.map((component) => Component.createFromSampleData(
            component,
            splitSample.parent_id,
            tagGroup,
            sample,
          ));

          // Phase 1: add components synchronously and re-render immediately
          sample.addMixtureComponentsSync(sampleComponents);
          const updateSequence = this.startSequencedMoleculeUpdate();
          onChange(sample);

          // Phase 2: fetch combined molecule/SVG in the background, then re-render
          try {
            await sample.updateMixtureMolecule();
            // Only apply the result if this is still the latest request
            if (this.isSequenceCurrent(updateSequence)) {
              onChange(sample);
            }
          } finally {
            this.endMoleculeUpdate();
          }
        }).catch((errorMessage) => {
          console.error(errorMessage);
        });
    } else {
      // Phase 1: add component synchronously and re-render immediately
      sample.addMixtureComponentSync(splitSample);
      const updateSequence = this.startSequencedMoleculeUpdate();
      onChange(sample);

      // Phase 2: fetch combined molecule/SVG in the background, then re-render
      sample.updateMixtureMolecule()
        .then(() => {
          // Only apply the result if this is still the latest request
          if (this.isSequenceCurrent(updateSequence)) {
            onChange(sample);
          }
        })
        .catch((errorMessage) => {
          console.error('Error updating mixture molecule:', errorMessage);
        })
        .finally(() => {
          this.endMoleculeUpdate();
        });
    }
  }

  /**
   * Updates component name.
   * @param {Object} changeEvent - The change event
   */
  updateComponentName(changeEvent) {
    const { sample, onChange } = this.props;
    const { sampleID, newName } = changeEvent;

    const currentComponent = this.findComponentById(sample, sampleID);
    if (!currentComponent) {
      return;
    }

    currentComponent.name = newName;
    onChange(sample);
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
    const { sample, onChange } = this.props;

    sample.components = this.normalizeComponents(sample.components);

    if (action === 'move') {
      sample.moveMaterial(srcMat, srcGroup, tagMat, tagGroup);
      onChange(sample);
    } else if (action === 'merge') {
      const updateSequence = this.startSequencedMoleculeUpdate();
      sample.mergeComponents(srcMat, srcGroup, tagMat, tagGroup)
        .then(() => {
          // Only apply the result if this is still the latest request
          if (this.isSequenceCurrent(updateSequence)) {
            onChange(sample);
          }
        })
        .catch((error) => {
          console.error('Error merging components:', error);
        })
        .finally(() => {
          this.endMoleculeUpdate();
        });
    }
  }

  /**
   * Deletes a component from the mixture.
   * @param {Object} component - The component to delete
   */
  async deleteMixtureComponent(component) {
    const { sample, onChange, setComponentDeletionLoading } = this.props;

    // Set loading state for component deletion
    setComponentDeletionLoading(true);
    const updateSequence = this.startSequencedMoleculeUpdate();

    try {
      // Phase 1: Fast operations - immediate UI update with mass changes
      sample.deleteMixtureComponent(component);
      onChange(sample); // Immediate update with new mass

      // Capture expected component count AFTER deletion
      const expectedComponentCount = sample.components?.length || 0;

      // Phase 2: Slow molecule update in background - only if components remain
      if (expectedComponentCount > 0 && sample.molecule_cano_smiles) {
        await this.updateMoleculeAfterDeletion(sample, updateSequence, expectedComponentCount, onChange);
      }
    } finally {
      // Clear loading states
      setComponentDeletionLoading(false);
      this.endMoleculeUpdate();
    }
  }

  /**
   * Updates sample when reference component changes.
   * @param {Object} changeEvent - The change event
   */
  updateSampleForReferenceChanged(changeEvent) {
    const { sample } = this.props;
    const { sampleID } = changeEvent;

    // Validate component exists
    if (!this.findComponentById(sample, sampleID)) {
      return;
    }

    const componentIndex = sample.components.findIndex(
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

    return null;
  }

  /**
   * Renders the modal dialog for material operations.
   * @returns {JSX.Element} The modal component
   */
  renderModal() {
    const { showModal } = this.state;

    return (
      <AppModal
        show={showModal}
        onHide={this.handleModalClose}
        title="Move or merge component"
        primaryActionLabel="Move"
        onPrimaryAction={() => this.handleModalAction('move')}
        extendedFooter={(
          <Button variant="primary" onClick={() => this.handleModalAction('merge')}>Merge</Button>
        )}
      >
        <p>Do you want to merge or move this component?</p>
      </AppModal>
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
    const { activeTab } = this.state;
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
      sample.components = this.normalizeComponents(sample.components);
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
            activeTab={activeTab}
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
            activeTab={activeTab}
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
  setComponentDeletionLoading: PropTypes.func.isRequired,
  setMoleculeLoading: PropTypes.func.isRequired,
};
