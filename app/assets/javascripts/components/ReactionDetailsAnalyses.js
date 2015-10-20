import React, {Component} from 'react';
import SampleDetailsAnalyses from './SampleDetailsAnalyses';

export default class ReactionDetailsAnalyses extends Component {
  render() {
    const {sample} = this.props;
    return (
     <SampleDetailsAnalyses
       sample={sample}
       readOnly={true}
       />
    );
  }
}
