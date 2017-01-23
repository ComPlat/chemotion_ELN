import React, {Component} from 'react';
import SampleDetailsContainers from './SampleDetailsContainers';

export default class ReactionSampleDetailsContainers extends Component {
  render() {
    const {sample} = this.props;

    return (
     <SampleDetailsContainers
       sample={sample}
       readOnly={true}
       />
    );
  }
}

ReactionSampleDetailsContainers.propTypes = {
  sample: React.PropTypes.object
}
