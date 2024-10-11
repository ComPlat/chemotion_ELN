import React, { Component } from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';

export default class Well extends Component {
  render() {
    const { sample, active, label } = this.props;
    if (!sample) return null;

    const className = (active) ? "well-molecule molecule-selected" : "well-molecule";
    const svg = (<div><SVG className={className} key={sample.id} src={sample.svgPath}/></div>);
    if (!label) return svg;

    const labels = label.split(',');
    if (labels.some(item => item === 'Molecular structure')) return svg;

    const displayLabel = labels.map((labelPart) => {
      if (labelPart === 'Name') return sample.name;
      if (labelPart === 'External label') return sample.external_label;
      return '';
    }).join(', ');

    return (
      <div
        className="text-center lh-1"
        style={{ fontSize: '0.8rem' }}
      >
        {displayLabel}
      </div>
    );
  }
}

Well.propTypes = {
  sample: PropTypes.object,
  active: PropTypes.bool,
  label: PropTypes.string
};
