import React, { useContext, useEffect } from 'react';
import { useDragLayer } from 'react-dnd';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { DragDropItemTypes } from 'src/utilities/DndConst';

const ElementDragLayer = () => {
  const { genericEls } = useContext(StoreContext).userStore;

  const {
    dndType, isDragging, item, currentOffset
  } = useDragLayer((monitor) => ({
    dndType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    currentOffset: monitor.getClientOffset(),
  }));

  // TouchBackend (used for mouse+touch support via MultiBackend) drives dragging
  // through plain mouse events instead of the native HTML5 drag API, so it does not
  // suppress the browser's default text-selection behavior on its own.
  useEffect(() => {
    document.body.classList.toggle('dnd-in-progress', isDragging);
    return () => document.body.classList.remove('dnd-in-progress');
  }, [isDragging]);

  if (
    !isDragging
    || !currentOffset
    || !Object.values(DragDropItemTypes).includes(dndType)
    || !item?.isElement
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
};

export default observer(ElementDragLayer);
