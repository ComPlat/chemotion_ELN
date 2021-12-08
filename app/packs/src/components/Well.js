import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';

export default class Well extends Component {
  render() {
    const {sample, active, label} = this.props;

    const className = (active) ? "well-molecule molecule-selected" : "well-molecule";
    if (sample) {
      if (label) {
        switch (label) {
          case 'name': {
            return (
              <div>{sample.name}</div>
            );
          }
          case 'external name': {
            return (
              <div>{sample.external_label}</div>
            );
          }
          case 'Molecular structure': {
            return (
              <SVG className={className} key={sample.id} src={sample.svgPath}/>
            );
          }
          default:
            break;
        }
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
