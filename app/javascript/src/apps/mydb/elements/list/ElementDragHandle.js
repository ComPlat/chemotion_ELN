import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { observer } from 'mobx-react';

import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import DragHandle from 'src/components/common/DragHandle';

function inferElementSourceType(element) {
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
    case 'sequence_based_macromolecule': 
      return DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE;
    case 'sequence_based_macromolecule_sample':
      return DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE_SAMPLE;
    default:
      return null;
  }
}

function EnabledHandle({ element, sourceType }) {
  const [, drag, dragPreview] = useDrag({
    type: sourceType,
    item: { element, isElement: true },
  });

  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  return (
    <DragHandle ref={drag} />
  );
}

EnabledHandle.propTypes = {
  sourceType: PropTypes.oneOf(Object.values(DragDropItemTypes)).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.any.isRequired,
};

function ElementDragHandle({ element, sourceType: sourceTypeProp }) {
  const [currentElementType, setCurrentElementType] = useState(
    ElementStore.getState().currentElement?.type || null
  );
  const [genericEls, setGenericEls] = useState(
    UserStore.getState().genericEls || []
  );
  const { inbox_visible: sampleTaskInboxVisible } = useContext(StoreContext).sampleTasks;

  useEffect(() => {
    const updateCurrentElementType = ({ currentElement }) => {
      setCurrentElementType(currentElement?.type || null);
    };
    ElementStore.listen(updateCurrentElementType);
    return () => ElementStore.unlisten(updateCurrentElementType);
  }, []);

  useEffect(() => {
    const updateGenericEls = (userState) => {
      setGenericEls(userState.genericEls);
    };
    UserStore.listen(updateGenericEls);
    return () => UserStore.unlisten(updateGenericEls);
  }, []);

  const isCurrentElementGeneric = currentElementType && genericEls.some((el) => el.name === currentElementType);

  let sourceType = sourceTypeProp ?? inferElementSourceType(element);
  if (isCurrentElementGeneric) {
    // Generic elements support SAMPLE and MOLECULE types natively.
    // All other types are supported as ELEMENT.
    if (![DragDropItemTypes.SAMPLE, DragDropItemTypes.MOLECULE].includes(sourceType)) {
      sourceType = DragDropItemTypes.ELEMENT;
    }
  }

  const hasDropTarget = (type) => {
    // Generic elements may contain drop targets for any element type.
    if (isCurrentElementGeneric) return true;

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
      case DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE:
        return currentElementType === 'sequence_based_macromolecule';
      case DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE_SAMPLE:
        return currentElementType === 'sequence_based_macromolecule_sample';
      default:
        return false;
    }
  };

  return (sourceType !== null && hasDropTarget(sourceType))
    ? <EnabledHandle element={element} sourceType={sourceType} />
    : <DragHandle enabled={false} />;
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
