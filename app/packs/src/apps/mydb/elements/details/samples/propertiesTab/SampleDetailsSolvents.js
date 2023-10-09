import React from 'react';
import PropTypes from 'prop-types';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';
import SampleDetailsSolventsDnd from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleDetailsSolventsDnd';

export default class SampleDetailsSolvents extends React.Component {
  constructor(props) {
    super(props);

    const { sample } = props;
    this.state = {
      sample
    };

    this.dropSample = this.dropSample.bind(this);
    this.deleteSolvent = this.deleteSolvent.bind(this);
    this.onChangeSolvent = this.onChangeSolvent.bind(this);
  }

  onChangeSolvent(solvent) {
    const { sample } = this.state;
    sample.updateSolvent(solvent);
    this.props.onChange(sample);
  }

  dropSample(srcSample, tagMaterial, tagGroup, extLabel, isNewSample = false) {
    const { sample } = this.state;
    let splitSample;

    if (srcSample instanceof Molecule || isNewSample) {
      // Create new Sample with counter
      splitSample = Sample.buildNew(srcSample, sample.collection_id, tagGroup);
    } else if (srcSample instanceof Sample) {
      splitSample = srcSample.buildChild();
    }

    sample.addSolvent(splitSample);
    this.props.onChange(sample);
  }

  deleteSolvent(solvent) {
    const { sample } = this.state;
    sample.deleteSolvent(solvent);
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
      <SampleDetailsSolventsDnd
        sample={sample}
        dropSample={this.dropSample}
        deleteSolvent={this.deleteSolvent}
        onChangeSolvent={(changeEvent) => this.onChangeSolvent(changeEvent)}
      />
    );
  }
}

SampleDetailsSolvents.propTypes = {
  sample: PropTypes.instanceOf(Sample).isRequired,
  onChange: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};

SampleDetailsSolvents.defaultProps = {
  canDrop: true,
  isOver: false
};
