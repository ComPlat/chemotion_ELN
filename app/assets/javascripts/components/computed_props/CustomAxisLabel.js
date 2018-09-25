import React from 'react';
import PropTypes from 'prop-types';

function CustomAxisLabel({
  marginTop, marginLeft, innerWidth, innerHeight, title, xAxis
}) {
  const yLabelOffset = {
    y: marginTop + (innerHeight / 2) + (title.length * 2),
    x: 10
  };

  const xLabelOffset = {
    x: (marginLeft + (innerWidth / 2)) - (title.length * 4),
    y: (innerHeight * 1.1) + 10
  };

  const transform = xAxis
    ? `translate(${xLabelOffset.x}, ${xLabelOffset.y})`
    : `translate(${yLabelOffset.x}, ${yLabelOffset.y}) rotate(-90)`;

  return (
    <g transform={transform}>
      <text className="unselectable axis-labels" style={{ fill: '#6b6b76' }}>
        {title}
      </text>
    </g>
  );
}

CustomAxisLabel.propTypes = {
  title: PropTypes.string.isRequired,
  xAxis: PropTypes.bool.isRequired,
};

CustomAxisLabel.defaultProps = {
  xAxis: false
}

CustomAxisLabel.displayName = 'CustomAxisLabel';
CustomAxisLabel.requiresSVG = true;

export default CustomAxisLabel;
