import React, { useState, useEffect } from 'react';
import { useDragLayer } from 'react-dnd';

import UserStore from 'src/stores/alt/stores/UserStore';
import { DragDropItemTypes } from 'src/utilities/DndConst';

export default function ElementDragLayer() {
  const [genericEls, setGenericEls] = useState(
    UserStore.getState().genericEls || []
  );

  useEffect(() => {
    const updateGenericEls = (userState) => {
      setGenericEls(userState.genericEls);
    };
    UserStore.listen(updateGenericEls);
    return () => UserStore.unlisten(updateGenericEls);
  }, []);

  const {
    dndType, isDragging, item, currentOffset
  } = useDragLayer((monitor) => ({
    dndType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    currentOffset: monitor.getClientOffset(),
  }));

  if (
    !isDragging
    || !currentOffset
    || !Object.values(DragDropItemTypes).includes(dndType)
    || !item.isElement
  ) {
    return null;
  }

  const { x, y } = currentOffset;

  // Determine the type label of the item being dragged.
  //
  // For generic elements, we always simply use the element's label.
  // When dndType is ELEMENT (i.e when dragging anything but a SAMPLE or
  // MOLECULE into a generic element), we must use the element's type to
  // determine its specific type label.
  // When dndType is not ELEMENT, we can use the dndType itself.
  const { element } = item;
  const genericEl = genericEls.find((el) => el.name === element.type);
  const itemTypeName = genericEl?.label || (
    dndType === DragDropItemTypes.ELEMENT ? element.type : dndType
  ).replace('_', ' ').replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());

  return (
    <div className="element-drag-layer">
      <div
        className="element-drag-layer__preview"
        style={{
          left: x,
          top: y
        }}
      >
        <span className="drag-handle" />
        <span className="element-drag-layer__preview-label">
          {`${itemTypeName}: ${element.short_label || element.title()}`}
        </span>
      </div>
    </div>
  );
}
