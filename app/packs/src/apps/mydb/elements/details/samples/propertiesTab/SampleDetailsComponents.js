import React from 'react';
import PropTypes from 'prop-types';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';
import SampleDetailsComponentsDnd from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsComponentsDnd'; // Import the appropriate Dnd component

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
  }

  onChangeComponent(component) {
    const { sample } = this.state;
    sample.updateMixtureComponent(component);
    this.props.onChange(sample);
  }

  dropSample(srcSample, tagMaterial, tagGroup, extLabel, isNewSample = false) {
    const { sample } = this.state;
    let splitSample;

    if (srcSample instanceof Molecule || isNewSample) {
      splitSample = Sample.buildNew(srcSample, sample.collection_id, tagGroup);
    } else if (srcSample instanceof Sample) {
      splitSample = srcSample.buildChild();
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
