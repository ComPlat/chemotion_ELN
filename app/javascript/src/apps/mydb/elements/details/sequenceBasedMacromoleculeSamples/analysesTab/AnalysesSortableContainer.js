import React, { useContext } from 'react';
import { Card } from 'react-bootstrap';
import AnalysisHeader from './AnalysisHeader';
import Container from 'src/models/Container';
import { useDrag, useDrop } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import { StoreContext } from 'src/stores/mobx/RootStore';

const AnalysesSortableContainer = ({ readonly }) => {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  const sbmmSample = sbmmStore.sequence_based_macromolecule_sample;
  const containers = sbmmSample.container.children[0].children;

  const moveAnalyse = (idToMove, idOfPredecessor) => {
    Container.switchPositionOfChildContainer(
      containers,
      idToMove,
      idOfPredecessor
    );
  }

  const sortableCard = (container, index) => {
    const [{ isDragging }, drag] = useDrag({
      type: DragDropItemTypes.CONTAINER,
      item: { container },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const [{ isOver, canDrop }, drop] = useDrop({
      accept: DragDropItemTypes.CONTAINER,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
      drop: (item) => {
        if (item.container.id === container.id) { return; }

        moveAnalyse(item.container.id, container.id);
      },
    });

    const orderClass = ' d-flex align-items-center gap-2 px-2 py-3';
    let dndClass = 'mb-3 rounded border';
    if (canDrop) {
      dndClass = ' dnd-zone-list-item';
    }
    if (isOver) {
      dndClass += ' dnd-zone-over';
    }
    if (isDragging) {
      dndClass += ' dnd-dragging';
    }

    return (
      <Card
        key={`container-${container.id}-${index}`}
        className={dndClass}
        ref={(node) => drag(drop(node))}
      >
        <Card.Header className={`rounded-0 p-0 border-bottom-0${orderClass}`}>
          <div className="dnd-button">
            <i className="dnd-arrow-enable text-info fa fa-arrows" />
          </div>
          <AnalysisHeader container={container} readonly={readonly} />
        </Card.Header>
      </Card>
    );
  }

  return containers.map((container, index) => (
    sortableCard(container, index)
  ));
}

export default AnalysesSortableContainer;
