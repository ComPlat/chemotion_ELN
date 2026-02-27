import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import cs from 'classnames';

import ElementStore from 'src/stores/alt/stores/ElementStore';

import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';
import { aviatorNavigation } from 'src/utilities/routesUtils';

function ElementItem({ element, renderItem }) {
  const [isSelected, setElementSelected] = useState(ElementStore.isCurrentElement(element));

  useEffect(() => {
    const updateIsSelected = () => {
      setElementSelected(ElementStore.isCurrentElement(element));
    };

    ElementStore.listen(updateIsSelected);
    return () => ElementStore.unlisten(updateIsSelected);
  }, []);

  return (
    <div
      className={cs(
        'element-list-item',
        { 'is-selected': isSelected },
      )}
    >
      <ElementDragHandle element={element} />
      <div className="element-list-item-checkbox">
        <ElementCheckbox element={element} />
      </div>
      <div className="element-list-item-content">
        {renderItem(element, () => aviatorNavigation(element.type, element.id, true, true))}
      </div>
    </div>

  );
}

ElementItem.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.string,
    ]).isRequired,
    type: PropTypes.string.isRequired,
  }).isRequired,
  renderItem: PropTypes.func.isRequired,
};

export default ElementItem;
