import React from 'react';
import PropTypes from 'prop-types';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

const QcMolView = ({ svg }) => (
  <div className="grid-qc-mol-view">
    <SvgFileZoomPan
      svg={svg}
      duration={300}
      resize
    />
  </div>
);

QcMolView.propTypes = {
  svg: PropTypes.string.isRequired,
};

export default QcMolView;
