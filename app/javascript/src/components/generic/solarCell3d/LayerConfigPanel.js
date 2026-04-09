import React, {
  useEffect, useMemo, useRef, useState
} from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
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
      listRef.current.scrollTop = 0;
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
      <div className="solar3d-config-panel__title-row">
        <h2>Layer Configuration</h2>
        <OverlayTrigger
          placement="top"
          overlay={(
            <Tooltip id="solar3d-layer-config-help">
              <ul className="solar3d-tooltip-list">
                <li>Add new layers</li>
                <li>Search layers by name</li>
                <li>Edit properties of a layer</li>
                <li>Delete layers</li>
                <li>Click a layer to view details</li>
                <li>Hover a layer to preview its name</li>
                <li>Use full-view zoom controls</li>
              </ul>
            </Tooltip>
          )}
        >
          <button
            type="button"
            className="solar3d-config-panel__help-btn"
            aria-label="Layer configuration help"
          >
            <i className="fa fa-info-circle" aria-hidden="true" />
          </button>
        </OverlayTrigger>
      </div>
      <div className="solar3d-config-panel__controls">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search layer by name"
          className="solar3d-config-panel__search"
          disabled={!layers.length}
        />
        {onAddLayer && (
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id="solar3d-add-layer-tip">
                After adding a layer, update its properties as needed.
              </Tooltip>
            )}
          >
            <button
              type="button"
              onClick={onAddLayer}
              className="btn btn-secondary btn-sm solar3d-config-panel__add-btn"
            >
              + Add New Layer
            </button>
          </OverlayTrigger>
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
