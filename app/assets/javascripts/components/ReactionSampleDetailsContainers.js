import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SampleDetailsContainers from './SampleDetailsContainers';

export default class ReactionSampleDetailsContainers extends Component {
  render() {
    const {sample} = this.props;

    return (
      <div style={{marginTop: 10}}>
        <SampleDetailsContainers sample={sample}
          setState={this.props.setState}
          handleSampleChanged={this.props.handleSampleChanged}
        />
      </div>
    );
  }
}

ReactionSampleDetailsContainers.propTypes = {
  sample: PropTypes.object
}
