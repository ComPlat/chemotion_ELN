import React from 'react';
import PropTypes from 'prop-types';

import ElementItem from 'src/apps/mydb/elements/list/renderers/ElementItem';

function ElementListRenderer({ elements, getItemKey, renderItem }) {
  if (!elements || elements.length === 0) {
    return <div>No elements available</div>;
  }

  return (
    <div className="element-list-renderer">
      {elements.map((element) => (
        <ElementItem
          key={`element-list-item:${getItemKey(element)}`}
          element={element}
          renderItem={renderItem}
        />
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
