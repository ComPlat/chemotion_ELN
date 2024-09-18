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
import ComponentActions from 'src/stores/alt/actions/ComponentActions';

export default class SampleDetailsComponents extends React.Component {
  constructor(props) {
    super(props);

    const { sample } = props;
    const componentState = ComponentStore.getState();
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
      case 'concentrationLocked':
        this.totalConcentrationLocked(changeEvent);
        break;
      default:
        break;
    }
    this.props.onChange(sample);
  }

  totalConcentrationLocked(changeEvent) {
    const { sample } = this.props;
    const totalVolume = sample.amount_l;
    const { materialGroup, updatedComponents } = changeEvent;

    sample.components
      .filter((component) => component.material_group === materialGroup)
      .forEach((component) => {
        const updatedComponent = updatedComponents.find((cmp) => cmp.id === component.id);
        if (updatedComponent) {
          component.handleTotalConcentrationLocked(totalVolume);
        }
      });
  }

  updatedSampleForAmountUnitChange(changeEvent) {
    const { sample } = this.props;
    const {
      sampleID, amount, concType, lockColumn
    } = changeEvent;
    const componentIndex = sample.components.findIndex(
      (component) => component.id === sampleID
    );

    const totalVolume = sample.amount_l;

    if (amount.unit === 'g' || amount.unit === 'l') {
      sample.components[componentIndex].handleVolumeChange(amount, totalVolume); // volume given, update amount
    } else if (amount.unit === 'mol') {
      sample.components[componentIndex].handleAmountChange(amount, totalVolume); // amount given, update volume

      // Check if the component is the reference component
      const referenceComponent = sample.reference_component;

      if (referenceComponent && referenceComponent.id === sampleID) {
        // If the amount of the reference component changed, update the other components
        this.updateNonRefComponentAmounts(referenceComponent, totalVolume);
      }
    } else if (amount.unit === 'mol/l') {
      // starting conc./target concentration changes,
      sample.components[componentIndex].handleConcentrationChange(amount, totalVolume, concType, lockColumn);
    }

    // update components ratio
    // sample.updateMixtureComponentEquivalent();
  }

  updateNonRefComponentAmounts(referenceComponent, totalVolume) {
    const { sample } = this.props;

    sample.components
      .filter((component) => component.reference !== true) // Exclude reference component
      .forEach((component) => {
        const amount = referenceComponent.amount_mol * (component.equivalent);
        component.handleAmountChange({ value: amount, unit: 'mol' }, totalVolume);
      });
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
    const { sampleID, amount } = changeEvent;
    const purity = amount.value;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => component.id === sampleID
    );
    sample.components[componentIndex].setPurity(purity, sample.amount_l);
    sample.updateMixtureComponentEquivalent();
  }

  updatedSampleForMetricsChange(changeEvent) {
    const { sample } = this.props;
    const { sampleID, metricUnit, metricPrefix } = changeEvent;
    const componentIndex = this.props.sample.components.findIndex(
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
          for (const component of components) {
            const { component_properties, ...rest } = component;
            const sampleData = {
              ...rest,
              ...component_properties
            };
            const sampleComponent = new Component(sampleData);
            sampleComponent.parent_id = splitSample.parent_id;
            sampleComponent.material_group = tagGroup;
            sampleComponent.reference = false;
            if (tagGroup === 'solid') {
              sampleComponent.setMolarity({ value: 0, unit: 'M' }, sample.amount_l, 'startingConc');
              sampleComponent.setAmount({ value: sampleComponent.amount_g, unit: 'g' }, sample.amount_l);
            } else if (tagGroup === 'liquid') {
              sampleComponent.setAmount({ value: sampleComponent.amount_l, unit: 'l' }, sample.amount_l);
            }
            sampleComponent.id = `comp_${Math.random().toString(36).substr(2, 9)}`;
            await sample.addMixtureComponent(sampleComponent);
            sample.updateMixtureComponentEquivalent();
          }
          this.props.onChange(sample);
        })
        .catch((errorMessage) => {
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
    const {
      sampleID, newRatio, materialGroup
    } = changeEvent;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => component.id === sampleID
    );
    const refIndex = this.props.sample.components.findIndex(
      (component) => component.reference === true
    );
    const referenceMoles = sample.components[refIndex].amount_mol;
    const totalVolume = sample.amount_l;

    sample.components[componentIndex].updateRatio(newRatio, materialGroup, totalVolume, referenceMoles);

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
          <Button bsStyle="success" onClick={() => this.handleModalAction('merge')}>Merge</Button>
          <Button bsStyle="primary" onClick={() => this.handleModalAction('move')}>Move</Button>
          <Button bsStyle="light" onClick={this.handleModalClose}>Close</Button>
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
