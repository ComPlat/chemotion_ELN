import React from 'react';
import PropTypes from 'prop-types';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';

const QcMolView = ({ svg }) => {
  if (!svg) return null;
  return (
    <div className="grid-qc-mol-view">
      <SvgFileZoomPan
        svg={svg}
        duration={300}
        resize
      />
    </div>
  );
};

QcMolView.propTypes = {
  svg: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
  ]),
};

QcMolView.defaultProps = {
  svg: false,
};

export default QcMolView;
