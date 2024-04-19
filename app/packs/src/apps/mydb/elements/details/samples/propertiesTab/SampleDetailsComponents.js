import React from 'react';
import PropTypes from 'prop-types';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';
import SampleDetailsComponentsDnd from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponentsDnd'; // Import the appropriate Dnd component
import UIStore from 'src/stores/alt/stores/UIStore';

function createSample(component) {
  return new Sample(component)
}

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

    sample.components = sample.components.map((component) => {
      if (!(component instanceof Sample)) {
        return createSample(component)
      }
      return component;
    });

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
    const concType = changeEvent.concType;
    const componentIndex = this.props.sample.components.findIndex(
      (component) => component.id === sampleID
    );

    sample.updateMixtureComponent(componentIndex, amount, concType)

    // update components ratio
    sample.updateMixtureComponentEquivalent()
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
