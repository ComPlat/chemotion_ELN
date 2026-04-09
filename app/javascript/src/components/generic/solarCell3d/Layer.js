/* eslint-disable react/no-unknown-property */
import React from 'react';
import PropTypes from 'prop-types';
import { Edges } from '@react-three/drei/core/Edges';

const SCALE = 0.02;
const WIDTH = 4;
const DEPTH = 4;

export default function Layer({
  id,
  name,
  thickness,
  color,
  yPosition,
  visible,
  hoveredLayerId,
  onHoverStart,
  onHoverMove,
  onHoverEnd,
  onLayerClick
}) {
  const height = thickness * SCALE;
  const isHoveredElsewhere = hoveredLayerId != null && hoveredLayerId !== id;
  const displayColor = color;
  const isLayerVisible = visible !== false;
  const materialOpacity = isLayerVisible ? 1 : 0.15;

  const handleClick = (e) => {
    e.stopPropagation();
    if (onLayerClick) onLayerClick(id);
  };

  const handlePointerOver = (e) => {
    e.stopPropagation();
    if (onHoverStart) onHoverStart(id, name, e.clientX, e.clientY);
  };

  const handlePointerMove = (e) => {
    e.stopPropagation();
    if (onHoverMove) onHoverMove(e.clientX, e.clientY);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    if (onHoverEnd) onHoverEnd();
  };

  return (
    <mesh
      position={[0, yPosition + height / 2, 0]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      <boxGeometry args={[WIDTH, height, DEPTH]} />
      <meshStandardMaterial
        color={displayColor}
        emissive={isHoveredElsewhere ? '#000000' : displayColor}
        emissiveIntensity={isHoveredElsewhere ? 0 : 0.08}
        transparent
        opacity={materialOpacity}
      />
      <Edges color="black" threshold={15} scale={1} />
    </mesh>
  );
}

Layer.propTypes = {
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  thickness: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  yPosition: PropTypes.number.isRequired,
  visible: PropTypes.bool,
  hoveredLayerId: PropTypes.number,
  onHoverStart: PropTypes.func,
  onHoverMove: PropTypes.func,
  onHoverEnd: PropTypes.func,
  onLayerClick: PropTypes.func
};

Layer.defaultProps = {
  visible: undefined,
  hoveredLayerId: null,
  onHoverStart: null,
  onHoverMove: null,
  onHoverEnd: null,
  onLayerClick: null
};
