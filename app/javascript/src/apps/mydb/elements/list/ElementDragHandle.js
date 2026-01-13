import React, { useEffect, useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { observer } from 'mobx-react';
import { useDnD } from 'chem-generic-ui';

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
    case 'screen':
      return DragDropItemTypes.SCREEN;
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
  const [currentElement, setCurrentElement] = useState(
    ElementStore.getState().currentElement || {}
  );
  const [genericEls, setGenericEls] = useState(
    UserStore.getState().genericEls || []
  );
  const { inbox_visible: sampleTaskInboxVisible } = useContext(StoreContext).sampleTasks;

  useEffect(() => {
    const updateCurrentElement = ({ currentElement: selectedElement }) => {
      setCurrentElement(selectedElement || {});
    };
    ElementStore.listen(updateCurrentElement);
    return () => ElementStore.unlisten(updateCurrentElement);
  }, []);

  useEffect(() => {
    const updateGenericEls = (userState) => {
      setGenericEls(userState.genericEls);
    };
    UserStore.listen(updateGenericEls);
    return () => UserStore.unlisten(updateGenericEls);
  }, []);

  const currentElementType = currentElement?.type || null;

  let sourceType = sourceTypeProp ?? inferElementSourceType(element);
  if (element.type && genericEls.some((el) => el.name === element.type)) {
    sourceType = DragDropItemTypes.ELEMENT;
  }

  // Disable dragging when:
  // - resolved sourceType is MOLECULE
  // - element represents a sample
  // - and that sample is a Mixture
  if (sourceType === DragDropItemTypes.MOLECULE
    && element?.type === 'sample'
    && (element.isMixture() || element?.sample_type === 'Mixture')) {
    return <DragHandle enabled={false} />;
  }

  const hasDropTarget = (type) => {
    switch (type) {
      case DragDropItemTypes.SAMPLE:
        return sampleTaskInboxVisible || [
          'device',
          'reaction',
          'research_plan',
          'sample',
          'wellplate',
        ].includes(currentElementType) || useDnD(currentElement, genericEls);
      case DragDropItemTypes.MOLECULE:
        return sampleTaskInboxVisible || [
          'sample',
          'reaction'
        ].includes(currentElementType) || useDnD(currentElement, genericEls);
      case DragDropItemTypes.ELEMENT:
        return useDnD(currentElement, genericEls);
      case DragDropItemTypes.WELLPLATE:
        return ['screen', 'research_plan'].includes(currentElementType) || useDnD(currentElement, genericEls);
      case DragDropItemTypes.SCREEN:
        return useDnD(currentElement, genericEls);
      case DragDropItemTypes.REACTION:
        return currentElementType === 'research_plan' || useDnD(currentElement, genericEls);
      case DragDropItemTypes.RESEARCH_PLAN:
        return currentElementType === 'screen' || useDnD(currentElement, genericEls);
      case DragDropItemTypes.GENERALPROCEDURE:
        return currentElementType === 'reaction' || useDnD(currentElement, genericEls);
      case DragDropItemTypes.DEVICE_DESCRIPTION:
        return currentElementType === 'device_description' || useDnD(currentElement, genericEls);
      case DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE:
        return (
          ['sequence_based_macromolecule_sample', 'reaction'].includes(currentElementType)
          || useDnD(currentElement, genericEls)
        );
      case DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE_SAMPLE:
        return currentElementType === 'reaction' || useDnD(currentElement, genericEls);
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
