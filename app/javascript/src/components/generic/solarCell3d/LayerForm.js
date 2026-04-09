import React from 'react';
import PropTypes from 'prop-types';

export default function LayerForm({ layer, onUpdate, onDelete }) {
  const triggerColorPicker = () => {
    const input = document.getElementById(`layer-color-${layer.id}`);
    if (input && typeof input.click === 'function') input.click();
  };

  return (
    <div className="solar3d-layer-form">
      <div className="solar3d-layer-form__header">
        <input
          type="text"
          value={layer.name}
          onChange={(e) => onUpdate(layer.id, 'name', e.target.value)}
          className="solar3d-layer-form__name"
          placeholder="Layer name"
        />
        <button
          type="button"
          onClick={() => onDelete(layer.id)}
          className="solar3d-layer-form__delete"
          title="Delete layer"
          aria-label={`Delete layer ${layer.name}`}
        >
          <i className="fa fa-trash" aria-hidden="true" />
        </button>
      </div>

      <div className="solar3d-layer-form__row">
        <div className="solar3d-layer-form__field">
          <span className="solar3d-layer-form__field-label">Thickness (nm)</span>
          <input
            type="number"
            value={layer.thickness}
            onChange={(e) => onUpdate(layer.id, 'thickness', Math.max(1, parseInt(e.target.value, 10) || 1))}
            min="1"
            aria-label={`Thickness for layer ${layer.name}`}
          />
        </div>
        <div className="solar3d-layer-form__field solar3d-layer-form__field--color">
          <span className="solar3d-layer-form__field-label">Color</span>
          <div className="solar3d-layer-form__color-inputs">
            <input
              id={`layer-color-${layer.id}`}
              type="color"
              value={layer.color}
              onChange={(e) => onUpdate(layer.id, 'color', e.target.value)}
              aria-label={`Color picker for layer ${layer.name}`}
              className="solar3d-layer-form__hidden-color-input"
              tabIndex={-1}
            />
            <div className="solar3d-layer-form__hex-wrap">
              <span
                className="solar3d-layer-form__hex-preview-btn"
                onClick={triggerColorPicker}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') triggerColorPicker();
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open color palette for layer ${layer.name}`}
                style={{ backgroundColor: layer.color }}
              />
              <input
                type="text"
                value={layer.color}
                onChange={(e) => onUpdate(layer.id, 'color', e.target.value)}
                aria-label={`Hex color for layer ${layer.name}`}
              />
            </div>
          </div>
        </div>
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

LayerForm.propTypes = {
  layer: layerShape.isRequired,
  onUpdate: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};
