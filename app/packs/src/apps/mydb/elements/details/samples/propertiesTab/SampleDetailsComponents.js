import React from 'react';
import PropTypes from 'prop-types';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';
import SampleDetailsComponentsDnd from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponentsDnd'; // Import the appropriate Dnd component
import UIStore from 'src/stores/alt/stores/UIStore';

export default class SampleDetailsComponents extends React.Component {
  constructor(props) {
    super(props);

    const { sample } = props;
    this.state = {
      sample
    };

    this.dropSample = this.dropSample.bind(this);
    this.deleteMixtureComponent = this.deleteMixtureComponent.bind(this);
    this.onChangeComponent = this.onChangeComponent.bind(this);
    this.updatedSampleForAmountUnitChange = this.updatedSampleForAmountUnitChange.bind(this);
    this.updatedSampleForMetricsChange = this.updatedSampleForMetricsChange.bind(this);
  }

  onChangeComponent(changeEvent) {
    const { sample } = this.state;
    switch (changeEvent.type) {
      case 'amountUnitChanged':
        this.updatedSampleForAmountUnitChange(changeEvent);
        break;
      case 'MetricsChanged':
        this.updatedSampleForMetricsChange(changeEvent);
        break;
      default:
        break;
    }
    this.props.onChange(sample);
  }
  
  
  updatedSampleForAmountUnitChange(changeEvent) {
    const { sample } = this.props;
    const sampleID = changeEvent.sampleID;
    const amount = changeEvent.amount;
    const componentIndex = this.props.sample.mixture_components.findIndex(
      (component) => component.parent_id === sampleID
    );

    if (amount.unit == "mol/l"){
      sample.mixture_components[componentIndex].setConc(amount)
    } else {
      sample.mixture_components[componentIndex].setAmount(amount)
    }

    // update components ratio
    const minAmountIndex = sample.mixture_components.reduce((minIndex, component, currentIndex) => {
      return component.amount_mol < sample.mixture_components[minIndex].amount_mol ? currentIndex : minIndex;
    }, 0);

    const referenceAmountMol = sample.mixture_components[minAmountIndex].amount_mol;
    sample.mixture_components[minAmountIndex].equivalent = 1;

    sample.mixture_components.forEach((component, index) => {
      if (index !== minAmountIndex) {
        component.equivalent = component.amount_mol / referenceAmountMol;
      }
    });
  }
  
  updatedSampleForMetricsChange(changeEvent) {
    const { sample } = this.props;
    const { sampleID, metricUnit, metricPrefix } = changeEvent;
    const componentIndex = this.props.sample.mixture_components.findIndex(
      (component) => component.parent_id === sampleID
    );
    sample.mixture_components[componentIndex].setUnitMetrics(metricUnit, metricPrefix);
  }

  dropSample(srcSample, tagMaterial, tagGroup, extLabel, isNewSample = false) {
    const { sample } = this.state;
    const { currentCollection } = UIStore.getState()
    let splitSample;

    if (srcSample instanceof Molecule || isNewSample) {
      splitSample = Sample.buildNew(srcSample, currentCollection.id);
    } else if (srcSample instanceof Sample) {
      splitSample = srcSample.buildChildWithoutCounter();
    }

    sample.addMixtureComponent(splitSample);
    this.props.onChange(sample);
  }

  deleteMixtureComponent(component) {
    const { sample } = this.state;
    sample.deleteMixtureComponent(component);
    this.props.onChange(sample);
  }

  render() {
    const {
      sample, isOver, canDrop
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
    return (
      <SampleDetailsComponentsDnd
        sample={sample}
        dropSample={this.dropSample}
        deleteMixtureComponent={this.deleteMixtureComponent}
        onChangeComponent={(changeEvent) => this.onChangeComponent(changeEvent)}
      />
    );
  }
}

SampleDetailsComponents.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  onChange: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};

SampleDetailsComponents.defaultProps = {
  canDrop: true,
  isOver: false
};
