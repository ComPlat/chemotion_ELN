import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Aviator from 'aviator';
import cs from 'classnames';

import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import { elementShowOrNew } from 'src/utilities/routesUtils';

import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementDragHandle from 'src/apps/mydb/elements/list/ElementDragHandle';

export function showDetails(element) {
  const { id, type } = element;
  const { currentCollection, isSync } = UIStore.getState();

  const uri = isSync
    ? `/scollection/${currentCollection.id}/${type}/${id}`
    : `/collection/${currentCollection.id}/${type}/${id}`;
  Aviator.navigate(uri, { silent: true });

  const isGenericEl = (UserStore.getState().genericEls || [])
    .some(({ name }) => name === type);

  elementShowOrNew({
    type,
    klassType: isGenericEl ? 'GenericEl' : undefined,
    params: {
      collectionID: currentCollection.id,
      [`${type}ID`]: id,
    }
  });
}

function ElementItem({ element, renderItem }) {
  const [isSelected, setElementSelected] = useState(ElementStore.getState().currentElement?.id === element.id);

  useEffect(() => {
    const updateIsSelected = (state) => {
      setElementSelected(state.currentElement?.id === element.id);
    };

    ElementStore.listen(updateIsSelected);
    return () => ElementStore.unlisten(updateIsSelected);
  }, []);

  return (
    <div
      className={cs(
        'element-list-item',
        { 'element-list-item--selected': isSelected },
      )}
    >
      <div className="element-list-item-drag-handle">
        <ElementDragHandle element={element} />
      </div>
      <div className="element-list-item-checkbox">
        <ElementCheckbox element={element} />
      </div>
      <div className="element-list-item-content">
        {renderItem(element, () => showDetails(element))}
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
