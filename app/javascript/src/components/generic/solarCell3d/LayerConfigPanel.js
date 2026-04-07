import React, {
  useEffect, useMemo, useRef, useState
} from 'react';
import PropTypes from 'prop-types';
import LayerForm from 'src/components/generic/solarCell3d/LayerForm';

export default function LayerConfigPanel({
  layers,
  setLayers,
  className,
  resetScrollToken,
  onAddLayer
}) {
  const listRef = useRef(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollLeft = 0;
    }
  }, [resetScrollToken]);

  const filteredLayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return layers;
    return layers.filter((layer) => layer.name.toLowerCase().includes(query));
  }, [layers, search]);

  const updateLayer = (id, field, value) => {
    setLayers(layers.map((layer) => (layer.id === id ? { ...layer, [field]: value } : layer)));
  };

  const deleteLayer = (id) => {
    setLayers(layers.filter((layer) => layer.id !== id));
  };

  return (
    <div className={className}>
      <h2>Layer Configuration</h2>
      <div className="solar3d-config-panel__controls">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search layer by name"
          className="solar3d-config-panel__search"
        />
        {onAddLayer && (
          <button
            type="button"
            onClick={onAddLayer}
            className="btn btn-secondary btn-sm"
          >
            + Add New Layer
          </button>
        )}
      </div>
      <div ref={listRef} className="solar3d-config-panel__list">
        {filteredLayers.map((layer) => (
          <LayerForm
            key={layer.id}
            layer={layer}
            onUpdate={updateLayer}
            onDelete={deleteLayer}
          />
        ))}
      </div>
    </div>
  );
}

const layerShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  thickness: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  visible: PropTypes.bool
});

LayerConfigPanel.propTypes = {
  layers: PropTypes.arrayOf(layerShape).isRequired,
  setLayers: PropTypes.func.isRequired,
  className: PropTypes.string,
  resetScrollToken: PropTypes.number,
  onAddLayer: PropTypes.func
};

LayerConfigPanel.defaultProps = {
  className: 'solar3d-config-panel',
  resetScrollToken: 0,
  onAddLayer: null
};
