/* eslint-disable react/no-unknown-property */
import React from 'react';
import PropTypes from 'prop-types';
import Layer from 'src/components/generic/solarCell3d/Layer';

const SCALE = 0.02;

export default function SolarCell({
  layers,
  hoveredLayerId,
  onLayerHoverStart,
  onLayerHoverMove,
  onLayerHoverEnd,
  onLayerClick
}) {
  let currentY = 0;
  const totalHeight = layers.reduce((sum, layer) => sum + (layer.thickness * SCALE), 0);
  const centeredYOffset = -(totalHeight / 2);

  return (
    <group position={[0, centeredYOffset, 0]}>
      {layers.map((layer) => {
        const yPos = currentY;
        currentY += layer.thickness * SCALE;

        return (
          <Layer
            key={layer.id}
            id={layer.id}
            name={layer.name}
            thickness={layer.thickness}
            color={layer.color}
            yPosition={yPos}
            visible={layer.visible}
            hoveredLayerId={hoveredLayerId}
            onHoverStart={onLayerHoverStart}
            onHoverMove={onLayerHoverMove}
            onHoverEnd={onLayerHoverEnd}
            onLayerClick={onLayerClick}
          />
        );
      })}
    </group>
  );
}

const layerShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  thickness: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  visible: PropTypes.bool
});

SolarCell.propTypes = {
  layers: PropTypes.arrayOf(layerShape).isRequired,
  hoveredLayerId: PropTypes.number,
  onLayerHoverStart: PropTypes.func,
  onLayerHoverMove: PropTypes.func,
  onLayerHoverEnd: PropTypes.func,
  onLayerClick: PropTypes.func
};

SolarCell.defaultProps = {
  hoveredLayerId: null,
  onLayerHoverStart: null,
  onLayerHoverMove: null,
  onLayerHoverEnd: null,
  onLayerClick: null
};
