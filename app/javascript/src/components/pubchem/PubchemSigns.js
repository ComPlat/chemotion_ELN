import React from 'react';
import PropTypes from 'prop-types';

const PubchemSigns = ({
  objPath, objWidth, objHeight, objTitle
}) => {
  const objScale = 1;
  return (
    <svg
      width={objWidth}
      height={objHeight}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <title>{objTitle}</title>;
      <g transform={`scale(${objScale})`}>
        <image xlinkHref={objPath} width="100%" height="100%" />
      </g>
    </svg>
  );
};

PubchemSigns.propTypes = {
  objPath: PropTypes.string.isRequired,
  objWidth: PropTypes.number,
  objHeight: PropTypes.number,
  objTitle: PropTypes.string
};

PubchemSigns.defaultProps = {
  objWidth: 70,
  objHeight: 70,
  objTitle: ''
};

export default PubchemSigns;
