import React, { useRef, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { ListGroup } from 'react-bootstrap';
import { useDrag, useDrop } from 'react-dnd';
import { List } from 'immutable';
import uuid from 'uuid';

function Item({
  scope, payload, index, isVisible, children, handlePositionChange, handleToggleVisibility
}) {
  const ref = useRef(null);
  const [{ isDragging }, drag] = useDrag({
    type: scope,
    item: () => ({ payload, index, isVisible }),
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    })
  });

  const [{ isOver }, drop] = useDrop({
    accept: scope,
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    }),
    hover(item) {
      if (!ref.current) return;

      const {
        payload: dragPayload,
        index: dragIndex,
        isVisible: dragIsVisible
      } = item;

      // Don't replace items with themselves
      if (dragIndex === index && dragIsVisible === isVisible) return;

      handlePositionChange(dragPayload, dragIndex, dragIsVisible, index, isVisible);

      item.index = index;
      item.isVisible = isVisible;
    },
  });

  const className = (() => {
    let nameString = 'collection-tab-layout-editor-list-item';
    if (isDragging) {
      nameString += ' active';
    }
    return nameString;
  })();

  drag(drop(ref));
  return (
    <ListGroup.Item ref={ref} className={className}>
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center flex-grow-1">
          <i className="fa fa-ellipsis-v text-muted me-2" style={{ cursor: 'grab' }} />
          <div>{children}</div>
        </div>
        <button
          type="button"
          className="btn btn-sm p-1 ms-2"
          onClick={() => handleToggleVisibility(payload, index, isVisible)}
          title={isVisible ? 'Hide item' : 'Show item'}
          aria-label={isVisible ? 'Hide item' : 'Show item'}
          style={{ minWidth: '24px' }}
        >
          <i className={isVisible ? 'fa fa-eye' : 'fa fa-eye-slash'} />
        </button>
      </div>
    </ListGroup.Item>
  );
}

Item.propTypes = {
  scope: PropTypes.string.isRequired,
  payload: PropTypes.any.isRequired,
  index: PropTypes.number.isRequired,
  isVisible: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
  handlePositionChange: PropTypes.func.isRequired,
  handleToggleVisibility: PropTypes.func.isRequired,
};

export default function CollectionTabLayoutEditor({
  visible,
  hidden,
  getItemKey,
  getItemComponent,
  onLayoutChange,
}) {
  const visibleRef = useRef(null);
  const hiddenRef = useRef(null);
  const [ scope ] = useState(uuid.v4());

  const [{ isOver: isOverVisible }, dropVisible] = useDrop({
    accept: scope,
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true })
    }),
    hover(item, monitor) {
      if (!visibleRef.current) return;

      // We only want to allow dropping into an empty visible list
      if (visible.size > 0) return;

      if (monitor.isOver({ shallow: true })) {
        const { index: oldIndex, payload } = item;
        // Since we can only get here when there are no items
        // in the visible list, so we must be adding the first
        // item to the visible list.
        onLayoutChange(List([payload]), hidden.delete(oldIndex));

        item.index = 0;
        item.isVisible = true;
      }
    }
  });
  dropVisible(visibleRef);

  const [{ isOver: isOverHidden }, dropHidden] = useDrop({
    accept: scope,
    collect: (monitor) => ({
      isOver: !!monitor.isOver({ shallow: true })
    }),
    hover(item, monitor) {
      if (!visibleRef.current) return;

      // We only want to allow dropping into an empty hidden list
      if (hidden.size > 0) return;

      const { index: oldIndex, payload } = item;
      if (monitor.isOver({ shallow: true })) {
        // Since we can only get here when there are no items
        // in the hidden list, so we must be adding the first
        // item to the hidden list.
        onLayoutChange(visible.delete(oldIndex), List([payload]));

        item.index = 0;
        item.isVisible = false;
      }
    }
  });
  dropHidden(hiddenRef);

  const handlePositionChange = useCallback((
    item,
    oldIndex,
    oldIsVisible,
    newIndex,
    newIsVisible
  ) => {
    if (oldIsVisible == newIsVisible) {
      // Moving item within the same list
      if (oldIsVisible) {
        // Moving item within the visible list
        onLayoutChange(
          visible.delete(oldIndex).insert(newIndex, item),
          hidden
        );
      } else {
        // Moving item within the hidden list
        onLayoutChange(
          visible,
          hidden.delete(oldIndex).insert(newIndex, item)
        );
      }
    } else if (oldIsVisible) {
      // Moving item from visible to hidden
      onLayoutChange(visible.delete(oldIndex), hidden.insert(newIndex, item));
    } else {
      // Moving item from hidden to visible
      onLayoutChange(visible.insert(newIndex, item), hidden.delete(oldIndex));
    }
  }, [visible, hidden]);

  const handleToggleVisibility = useCallback((item, index, currentIsVisible) => {
    if (currentIsVisible) {
      // Move from visible to hidden (add to end of hidden list)
      onLayoutChange(visible.delete(index), hidden.push(item));
    } else {
      // Move from hidden to visible (add to end of visible list)
      onLayoutChange(visible.push(item), hidden.delete(index));
    }
  }, [visible, hidden, onLayoutChange]);

  const lists = [
    {
      title: 'Visible',
      isVisible: true,
      collection: visible,
      isOver: isOverVisible,
      ref: visibleRef
    },
    {
      title: 'Hidden',
      isVisible: false,
      collection: hidden,
      isOver: isOverHidden,
      ref: hiddenRef
    },
  ];

  return (
    <div>
      {lists.map(({
        title, isVisible, collection, isOver, ref
      }) => (
        <div
          key={title}
          ref={ref}
        >
          <h6 className="fw-bold mb-3">{title}</h6>
          <ListGroup className="my-1 collection-tab-layout-editor-list" variant="flush">
            {collection.map((item, index) => (
              <Item
                scope={scope}
                key={getItemKey(item)}
                payload={item}
                isVisible={isVisible}
                index={index}
                handlePositionChange={handlePositionChange}
                handleToggleVisibility={handleToggleVisibility}
              >
                {getItemComponent({ item, isVisible })}
              </Item>
            ))}
            {!isOver && collection.size === 0 && (
              <ListGroup.Item className="bg-transparent mb-2 p-0">No Items</ListGroup.Item>
            )}
          </ListGroup>
        </div>
      ))}
    </div>
  );
}

CollectionTabLayoutEditor.propTypes = {
  visible: PropTypes.instanceOf(List).isRequired,
  hidden: PropTypes.instanceOf(List).isRequired,
  onLayoutChange: PropTypes.func.isRequired,
  getItemKey: PropTypes.func,
  getItemComponent: PropTypes.func,
}

CollectionTabLayoutEditor.defaultProps = {
  getItemKey: (item) => item,
  getItemComponent: ({ item }) => item,
};
