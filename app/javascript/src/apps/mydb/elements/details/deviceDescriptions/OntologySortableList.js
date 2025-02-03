import React from 'react';
import { ListGroup } from 'react-bootstrap';
import { useDrag, useDrop } from 'react-dnd';

const OntologySortableList = ({ store, element, ontology, index }) => {
  const type = { LISTITEM: 'ListItem' };

  const moveOntologyListItem = (dragIndex, hoverIndex) => {
    const dragItem = element['ontologies'][dragIndex];
    let newItems = [...element['ontologies']];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, dragItem);
    newItems.forEach((element, index) => {
      element.index = index;
    });
    store.changeDeviceDescription('ontologies', newItems);
  };

  const dndButton = () => {
    return (
      <div className="dnd-button">
        <i className="dnd-arrow-enable text-info fa fa-arrows" />
      </div>
    );
  }

  const [{ isDragging }, drag] = useDrag({
    type: type.LISTITEM,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: type.LISTITEM,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
    drop: (item) => {
      if (item.index === index) { return; }

      moveOntologyListItem(item.index, index);
      item.index = index;
    },
  });

  const deletedClass = ontology.data.is_deleted ? ' text-decoration-line-through' : '';
  const backgroundColor = index % 2 === 0 ? 'bg-gray-100' : 'bg-white';
  const hasNoSegmentsClass = !ontology.segments ? ' text-gray-600' : '';
  const orderClass = ' d-flex align-items-center gap-3';

  let dndClass = '';
  if (canDrop) {
    dndClass = ' dnd-zone-list-item mb-1';
  }
  if (isOver) {
    dndClass += ' dnd-zone-over';
  }
  if (isDragging) {
    dndClass += ' dnd-dragging';
  }

  return (
    <ListGroup.Item
      key={`${store.key_prefix}-${ontology.data.label}-${index}`}
      className={`${backgroundColor}${orderClass}${deletedClass}${hasNoSegmentsClass}`}
      ref={(node) => drag(drop(node))}
      as="li"
    >
      {dndButton()}
      <div>
        <h4>{ontology.data.label}</h4>
        <div className="d-flex justify-content-between align-items-center gap-2">
          {ontology.paths.map((p) => p.label).join(' / ')}
        </div>
      </div>
    </ListGroup.Item>
  )
}

export default OntologySortableList;
