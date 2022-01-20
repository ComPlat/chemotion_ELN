import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';

export default class Well extends Component {
  render() {
    const {sample, active, label} = this.props;
    let displayLabel = '';

    const className = (active) ? "well-molecule molecule-selected" : "well-molecule";
    if (sample) {
      if (label) {
        const labels = label.split(',');
        if (labels.some(item => item === 'Molecular structure')){
          return (
            <div>
              <SVG className={className} key={sample.id} src={sample.svgPath}/>
            </div>
          );
        }
        for (let i = 0; i < labels.length; i++) {
          if (labels[i] == 'Name') {
            displayLabel += sample.name + ', ';
          } else if (labels[i] == 'External label') {
            displayLabel += sample.external_label + ', ';
          }
        }
        return (
          <div>{displayLabel}</div>
        );
      } else {
        return (
          <div>
            <SVG className={className} key={sample.id} src={sample.svgPath}/>
          </div>
        );
      }
    } else {
      return <div></div>
    }
  }
}

Well.propTypes = {
  sample: PropTypes.object
};