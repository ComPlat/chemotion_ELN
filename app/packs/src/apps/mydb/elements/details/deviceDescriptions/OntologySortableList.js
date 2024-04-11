import React from 'react';
import { useDrag, useDrop } from 'react-dnd';

const style = {
  border: '1px dashed gray',
  padding: '0.5rem 1rem',
  marginBottom: '.5rem',
  backgroundColor: 'white',
  cursor: 'move',
}

const type = { LISTITEM: 'ListItem' };

const OntologySortableList = ({ store, element }) => {
  const sortedOntologies = element['ontologies'].sort((a, b) => a.index - b.index);

  const moveItem = (dragIndex, hoverIndex) => {
    const dragItem = element['ontologies'][dragIndex];
    const prevItem = element['ontologies'][hoverIndex];
    let newItems = [...element['ontologies']];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, dragItem);
    newItems.forEach((element, index) => {
      element.index = index;
    });
    store.changeDeviceDescription('ontologies', newItems);
  };

  const ListItem = ({ item, index }) => {
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

        moveItem(item.index, index);
        item.index = index;
      },
    });

    const deletedClass = item.data.is_deleted ? 'deleted-ontology' : '';
    const hasNoSegmentsClass = !item.segments ? 'without-segments' : '';
    let paths = [];
    item.paths.map((p) => paths.push(p.label));

    return (
      <li
        className={`list-group-sortable list-group-item ${deletedClass} ${hasNoSegmentsClass}`}
        key={`${store.key_prefix}-${item.data.label}-${index}`}
        ref={(node) => drag(drop(node))}
        style={{ opacity: isDragging ? 0.2 : 1, border: isOver && canDrop ? '2px dashed #337ab7' : '1px solid #bbb' }}
      >
        <h4 class="list-group-item-heading">{item.data.label}</h4>
        <p class="list-group-item-text">{paths.join(' / ')}</p>
      </li>
    );
  };

  return (
    <ul className="ontology-list list-group" key="ontology-list-draggable">
      {sortedOntologies.map((ontology, index) => (
        <ListItem key={`${store.key_prefix}-${ontology.data.label}-${index}-item`} item={ontology} index={index} />
      ))}
    </ul>
  )
}

export default OntologySortableList;
