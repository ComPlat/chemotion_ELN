import React from 'react';
import PropTypes from 'prop-types';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';
import SampleDetailsComponentsDnd from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponentsDnd'; // Import the appropriate Dnd component
import UIStore from 'src/stores/alt/stores/UIStore';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import Component from 'src/models/Component';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import {
  ListGroup, ListGroupItem, Button, Modal
} from 'react-bootstrap';

export default class SampleDetailsComponents extends React.Component {
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

  handleModalClose() {
    this.setState({ showModal: false, droppedMaterial: null });
  }

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

  handleTabSelect(tab) {
    this.setState({ activeTab: tab });
  }

  handleAmountUnitChange(changeEvent, currentComponent, totalVolume, referenceComponent) {
    const { sample } = this.props;
    const { amount, concType, lockColumn } = changeEvent;

    switch (amount.unit) {
      case 'l':
      case 'g':
        // volume/mass given, update amount
        currentComponent.handleVolumeChange(amount, totalVolume, referenceComponent);
        sample.updateTotalVolume(currentComponent.amount_mol, currentComponent.concn);
        break;
      case 'mol':
        // amount given, update volume/mass
        currentComponent.handleAmountChange(amount, totalVolume, referenceComponent);
        sample.updateTotalVolume(currentComponent.amount_mol, currentComponent.concn);
        break;
      case 'mol/l':
        // starting conc./target concentration changes,
        currentComponent.handleConcentrationChange(amount, totalVolume, concType, lockColumn, referenceComponent);
        sample.updateTotalVolume(currentComponent.amount_mol, currentComponent.concn);
        break;
      default:
        break;
    }
  }

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
    this.props.onChange(sample);
  }

  updatedSampleForAmountUnitChange(changeEvent) {
    const { sample } = this.props;
    const { sampleID } = changeEvent;

    const componentIndex = sample.components.findIndex((component) => component.id === sampleID);
    const currentComponent = sample.components[componentIndex];

    const totalVolume = sample.amount_l;
    const referenceComponent = sample.reference_component;

    // Handle different units of measurement
    this.handleAmountUnitChange(changeEvent, currentComponent, totalVolume, referenceComponent);

    // Check if the component is the reference component
    if (referenceComponent && referenceComponent.id === sampleID) {
      // update ratio of other non-reference components
      sample.updateMixtureComponentEquivalent();
    }
  }

  updateDensity(changeEvent) {
    const { sample } = this.props;
    const { sampleID, amount, lockColumn } = changeEvent;
    const componentIndex = sample.components.findIndex(
      (component) => component.id === sampleID
    );

    const totalVolume = sample.amount_l;

    sample.components[componentIndex].handleDensityChange(amount, lockColumn, totalVolume);
    // sample.components[componentIndex].setDensity(amount, lockColumn, totalVolume);

    // update components ratio
    sample.updateMixtureComponentEquivalent();
  }

  updatePurity(changeEvent) {
    const { sample } = this.props;
    const { sampleID, amount, materialGroup } = changeEvent;
    const { lockAmountColumnSolids } = ComponentStore.getState();

    const purity = amount.value;

    const referenceComponent = sample.reference_component;
    const totalVolume = sample.amount_l;

    const componentIndex = sample.components.findIndex((component) => component.id === sampleID);
    const currentComponent = sample.components[componentIndex];

    currentComponent.setPurity(purity, totalVolume, referenceComponent, lockAmountColumnSolids, materialGroup);
    sample.updateTotalVolume(currentComponent.amount_mol, currentComponent.concn);

    // Check if the component is the reference component
    if (referenceComponent && referenceComponent.id === sampleID) {
      this.handleReferenceComponentUpdateFromPurity(lockAmountColumnSolids, materialGroup);
    }
  }

  updatedSampleForMetricsChange(changeEvent) {
    const { sample } = this.props;
    const { sampleID, metricUnit, metricPrefix } = changeEvent;
    const componentIndex = sample.components.findIndex(
      (component) => (component.parent_id === sampleID || component.id === sampleID)
    );
    sample.components[componentIndex].setUnitMetrics(metricUnit, metricPrefix);
  }

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

    if (splitSample.sample_type === 'Mixture') {
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
      sample.addMixtureComponent(splitSample);
      sample.updateMixtureComponentEquivalent();
      this.props.onChange(sample);
    }
  }

  updateComponentName(changeEvent) {
    const { sample } = this.props;
    const { sampleID, newName } = changeEvent;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => component.id === sampleID
    );
    sample.components[componentIndex].name = newName;

    this.props.onChange(sample);
  }

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

  deleteMixtureComponent(component) {
    const { sample } = this.state;
    sample.deleteMixtureComponent(component);
    this.props.onChange(sample);
  }

  updateRatio(changeEvent) {
    const { sample } = this.props;
    const { sampleID, newRatio, materialGroup } = changeEvent;

    const componentIndex = sample.components.findIndex(
      (component) => component.id === sampleID
    );
    const refIndex = sample.components.findIndex(
      (component) => component.reference === true
    );

    const referenceMoles = sample.components[refIndex].amount_mol;
    const totalVolume = sample.amount_l;
    const currentComponent = sample.components[componentIndex];

    currentComponent.updateRatio(newRatio, materialGroup, totalVolume, referenceMoles);

    sample.updateTotalVolume(currentComponent.amount_mol, currentComponent.concn);

    sample.updateMixtureMolecularWeight();

    this.props.onChange(sample);
  }

  updateSampleForReferenceChanged(changeEvent) {
    const { sample } = this.props;
    const { sampleID } = changeEvent;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => component.id === sampleID
    );

    sample.setReferenceComponent(componentIndex);
  }

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

SampleDetailsComponents.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  onChange: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
  enableComponentLabel: PropTypes.bool.isRequired,
  enableComponentPurity: PropTypes.bool.isRequired,
};
