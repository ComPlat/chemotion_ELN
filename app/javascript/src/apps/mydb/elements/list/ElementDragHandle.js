import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { useDrag } from 'react-dnd';
import { observer } from 'mobx-react';

import ElementStore from 'src/stores/alt/stores/ElementStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { DragDropItemTypes } from 'src/utilities/DndConst';

const inferElementSourceType = (element) => {
  if (!element.type) return null;

  switch (element.type) {
    case 'sample':
      return DragDropItemTypes.SAMPLE;
    case 'wellplate':
      return DragDropItemTypes.WELLPLATE;
    case 'reaction':
      if (element.role === 'gp') {
        return DragDropItemTypes.GENERALPROCEDURE;
      }
      return DragDropItemTypes.REACTION;
    case 'research_plan':
      return DragDropItemTypes.RESEARCH_PLAN;
    case 'device_description':
      return DragDropItemTypes.DEVICE_DESCRIPTION;
    case 'cell_line':
      return DragDropItemTypes.CELL_LINE;
    default:
      return null;
  }
};

function DragHandle({ element, sourceType }) {
  const [, drag] = useDrag({
    type: sourceType,
    item: { element },
  });

  return <span ref={drag} className="fa fa-arrows dnd-arrow-enable text-info" />;
}

DragHandle.propTypes = {
  sourceType: PropTypes.oneOf(Object.values(DragDropItemTypes)).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.any.isRequired,
};

function ElementDragHandle({ element, sourceType: sourceTypeProp }) {
  const [currentElementType, setCurrentElementType] = useState(
    ElementStore.getState().currentElement?.type || null
  );
  const { inbox_visible: sampleTaskInboxVisible } = useContext(StoreContext).sampleTasks;
  const sourceType = sourceTypeProp ?? inferElementSourceType(element);

  useEffect(() => {
    const updateCurrentDropTarget = ({ currentElement }) => {
      setCurrentElementType(currentElement?.type || null);
    };
    ElementStore.listen(updateCurrentDropTarget);
    return () => ElementStore.unlisten(updateCurrentDropTarget);
  }, []);

  const hasDropTarget = (type) => {
    switch (type) {
      case DragDropItemTypes.SAMPLE:
        return sampleTaskInboxVisible || [
          'device',
          'reaction',
          'research_plan',
          'sample',
          'wellplate',
        ].includes(currentElementType);
      case DragDropItemTypes.MOLECULE:
        return sampleTaskInboxVisible || [
          'sample',
          'reaction'
        ].includes(currentElementType);
      case DragDropItemTypes.WELLPLATE:
        return ['screen', 'research_plan'].includes(currentElementType);
      case DragDropItemTypes.REACTION:
        return currentElementType === 'research_plan';
      case DragDropItemTypes.RESEARCH_PLAN:
        return currentElementType === 'screen';
      case DragDropItemTypes.GENERALPROCEDURE:
        return currentElementType === 'reaction';
      case DragDropItemTypes.DEVICE_DESCRIPTION:
        return currentElementType === 'device_description';
      default:
        return false;
    }
  };

  return (sourceType !== null && hasDropTarget(sourceType))
    ? <DragHandle element={element} sourceType={sourceType} />
    : <span className="fa fa-arrows dnd-arrow-disable" />;
}

ElementDragHandle.propTypes = {
  sourceType: PropTypes.oneOf(Object.values(DragDropItemTypes)),
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.any.isRequired,
};

ElementDragHandle.defaultProps = {
  sourceType: null,
};

export default observer(ElementDragHandle);
