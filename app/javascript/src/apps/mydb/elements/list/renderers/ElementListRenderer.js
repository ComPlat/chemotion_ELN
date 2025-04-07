import React from 'react';
import PropTypes from 'prop-types';
import cs from 'classnames';

import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';

import { useIsElementSelected, showDetails } from 'src/apps/mydb/elements/list/renderers/shared';

function ElementListRenderer({ elements, getItemKey, renderItem }) {
  const isElementSelected = useIsElementSelected();

  if (!elements || elements.length === 0) {
    return <div>No elements available</div>;
  }

  return (
    <div className="element-list-renderer">
      {elements.map((element) => (
        <div
          key={getItemKey(element)}
          className={cs(
            'element-list-item',
            { 'element-list-item-selected': isElementSelected(element) },
          )}
        >
          <div className="element-list-item-checkbox">
            <ElementCheckbox element={element} />
          </div>
          <div className="element-list-item-content">
            {renderItem(element, () => showDetails(element))}
          </div>
          <div className="element-list-item-drag-handle">
            <ElementDragHandle element={element} />
          </div>
        </div>
      ))}
    </div>
  );
}

ElementListRenderer.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  elements: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]).isRequired,
    type: PropTypes.string.isRequired,
  })).isRequired,
  getItemKey: PropTypes.func,
  renderItem: PropTypes.func.isRequired,
};

ElementListRenderer.defaultProps = {
  getItemKey: (item) => item.id,
};

export default ElementListRenderer;
