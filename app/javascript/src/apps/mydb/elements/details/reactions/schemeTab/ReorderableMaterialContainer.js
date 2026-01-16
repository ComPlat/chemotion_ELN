import React, { Fragment, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';

import { DragDropItemTypes } from 'src/utilities/DndConst';

const newElementTypes = [
  DragDropItemTypes.SAMPLE,
  DragDropItemTypes.MOLECULE,
  DragDropItemTypes.SEQUENCE_BASED_MACROMOLECULE_SAMPLE,
];

// This component is a container for reorderable materials.
//
// It allows materials to be reordered by dragging and dropping, and also
// supports dropping new elements into the list.
//
// New elements can be of types defined in `newElementTypes`. For
// reordering existing elements, we use the `DragDropItemTypes.MATERIAL` type.
export default function ReorderableMaterialContainer({
  materials,
  materialGroup,
  onDrop,
  onReorder,
  renderMaterial,
  children,
}) {
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const [{
    isOver, canDrop, hoveringElement, hoveringMaterial
  }, drop] = useDrop({
    accept: [
      DragDropItemTypes.MATERIAL,
      ...newElementTypes,
    ],
    collect: (monitor) => {
      // eslint-disable-next-line no-shadow
      const hoveringElement = monitor.isOver() && newElementTypes.includes(monitor.getItemType())
        ? monitor.getItem().element : null;

      // eslint-disable-next-line no-shadow
      const hoveringMaterial = monitor.isOver() && monitor.getItemType() === DragDropItemTypes.MATERIAL
        ? monitor.getItem().material : null;

      return {
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
        hoveringMaterial,
        hoveringElement,
      };
    },
    drop: (item, monitor) => {
      if (newElementTypes.includes(monitor.getItemType())) {
        onDrop({ ...item, type: monitor.getItemType() }, hoveredIndex);
      }

      if (monitor.getItemType() === DragDropItemTypes.MATERIAL) {
        onReorder({ ...item, type: monitor.getItemType() }, hoveredIndex);
      }
    },
    hover: (_, monitor) => {
      if (!monitor.canDrop()) return;
      if (newElementTypes.includes(monitor.getItemType())) return;

      if (
        monitor.getItemType() === DragDropItemTypes.MATERIAL
        && materials.length === 0
      ) {
        setHoveredIndex(0);
      }
    },
  });

  // Based on the current state of the drag-and-drop operation,
  // we modify the list of materials to render.
  const renderedMaterials = [...materials];

  if (hoveringElement) {
    // If a new element is being hovered over, insert it at the hovered index.
    renderedMaterials.splice(hoveredIndex, 0, hoveringElement);
  }

  if (hoveringMaterial) {
    // If a material (i.e. an element that is already part of any list) is being
    // hovered over, remove it from the list if it exists, and insert it at the
    // hovered index.
    //
    // Caveat: It is not possible to hide the material when hovering over another
    // list (i.e. `isOver` is false), because that would remove the DOM element we
    // are dragging and effectively stop the drag operation.
    const index = renderedMaterials.findIndex((item) => item.id === hoveringMaterial.id);
    if (index === -1) {
      renderedMaterials.splice(hoveredIndex, 0, hoveringMaterial);
    } else {
      renderedMaterials.splice(index, 1);
      renderedMaterials.splice(hoveredIndex, 0, hoveringMaterial);
    }
  }

  const contents = renderedMaterials.map((material, index) => {
    const isPreview = ((hoveringMaterial || hoveringElement) && hoveredIndex === index);
    return isPreview
      ? (
        <Fragment key={`${material.id}-preview`}>
          {renderMaterial({
            dragRef: null,
            dropRef: null,
            material,
            index,
            isOver: true,
            canDrop: true,
            isDragging: true,
          })}
        </Fragment>
      )
      : (
        <Item
          key={material.id}
          material={material}
          materialGroup={materialGroup}
          index={index}
          onHover={setHoveredIndex}
          renderMaterial={renderMaterial}
        />
      );
  });

  return children({
    contents,
    dropRef: drop,
    isOver,
    canDrop
  });
}

ReorderableMaterialContainer.propTypes = {
  materials: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
  })).isRequired,
  materialGroup: PropTypes.string.isRequired,
  onDrop: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
  renderMaterial: PropTypes.func.isRequired,
  className: PropTypes.string,
  children: PropTypes.func.isRequired,
};

ReorderableMaterialContainer.defaultProps = {
  className: null,
};

function Item({
  material,
  materialGroup,
  index,
  onHover,
  renderMaterial,
}) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: DragDropItemTypes.MATERIAL,
    item: { material, materialGroup },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [
      DragDropItemTypes.MATERIAL,
      ...newElementTypes,
    ],
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: [
        DragDropItemTypes.MATERIAL,
        ...newElementTypes
      ].includes(monitor.getItemType()),
    }),
    hover: (hoverItem, monitor) => {
      if (!monitor.canDrop()) return;

      // Update the hovered index on the parent list, so the hovered item can be
      // displayed at the correct position. Only update if the hovered item is
      // different from the current material.

      const isDifferentMaterial = monitor.getItemType() === DragDropItemTypes.MATERIAL
        && hoverItem.material.id !== material.id;

      const isDifferentElement = newElementTypes.includes(monitor.getItemType())
        && hoverItem.element.id !== material.id;

      if (isDifferentMaterial || isDifferentElement) {
        onHover(index);
      }
    },
  });

  const dropRef = useRef(null);
  preview(drop(dropRef));

  return renderMaterial({
    dragRef: drag,
    dropRef,
    material,
    index,
    isOver,
    canDrop,
    isDragging,
  });
}

Item.propTypes = {
  material: PropTypes.shape({
    id: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]).isRequired,
  }).isRequired,
  materialGroup: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  onHover: PropTypes.func.isRequired,
  renderMaterial: PropTypes.func.isRequired,
};
