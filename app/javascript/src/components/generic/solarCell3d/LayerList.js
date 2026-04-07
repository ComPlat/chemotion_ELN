import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

export default function LayerList({
  layers,
  hoveredLayerId,
  selectedLayerId,
  onLayerSelect,
  resetScrollToken
}) {
  const itemRefs = useRef({});
  const listScrollRef = useRef(null);
  const [hoveredListLayerId, setHoveredListLayerId] = useState(null);

  useEffect(() => {
    if (hoveredLayerId == null) return;
    const hoveredItem = itemRefs.current[hoveredLayerId];
    if (hoveredItem && typeof hoveredItem.scrollIntoView === 'function') {
      hoveredItem.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest'
      });
    }
  }, [hoveredLayerId]);

  useEffect(() => {
    if (selectedLayerId == null) return;
    const selectedItem = itemRefs.current[selectedLayerId];
    if (selectedItem && typeof selectedItem.scrollIntoView === 'function') {
      selectedItem.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest'
      });
    }
  }, [selectedLayerId]);

  useEffect(() => {
    if (listScrollRef.current) {
      listScrollRef.current.scrollLeft = 0;
    }
  }, [resetScrollToken]);

  return (
    <div
      ref={listScrollRef}
      className="solar3d-layer-list-scroll"
      onWheel={(e) => {
        if (e.deltaY !== 0) {
          e.currentTarget.scrollLeft += e.deltaY;
        }
      }}
    >
      <ul className="solar3d-layer-list">
        {layers.map((layer) => {
          const isActive = layer.id === selectedLayerId
            || layer.id === hoveredLayerId
            || layer.id === hoveredListLayerId;
          return (
            <li
              key={layer.id}
              ref={(el) => {
                itemRefs.current[layer.id] = el;
              }}
              onMouseEnter={() => setHoveredListLayerId(layer.id)}
              onMouseLeave={() => {
                setHoveredListLayerId(null);
              }}
              className={`solar3d-layer-item ${isActive ? 'is-active' : ''}`}
            >
              <button
                type="button"
                onClick={() => onLayerSelect(layer.id)}
                title={layer.name}
                className="solar3d-layer-button"
              >
                <div className="solar3d-layer-dot" style={{ backgroundColor: layer.color }} />
                <span className="solar3d-layer-name">
                  {layer.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const layerShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired
});

LayerList.propTypes = {
  layers: PropTypes.arrayOf(layerShape).isRequired,
  hoveredLayerId: PropTypes.number,
  selectedLayerId: PropTypes.number,
  onLayerSelect: PropTypes.func.isRequired,
  resetScrollToken: PropTypes.number
};

LayerList.defaultProps = {
  hoveredLayerId: null,
  selectedLayerId: null,
  resetScrollToken: 0
};
