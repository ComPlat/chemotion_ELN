import React from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';

const listSource = { beginDrag(props) { return props; } };

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

const ElementContainer = ({ connectDragSource, sourceType }) => {
  switch (sourceType) {
    case DragDropItemTypes.SAMPLE:
    case DragDropItemTypes.MOLECULE:
      return connectDragSource(
        <span className="fa fa-arrows dnd-arrow-enable text-info" />,
        { dropEffect: 'copy' },
      );

    case DragDropItemTypes.GENERALPROCEDURE:
      return connectDragSource(<span className="fa fa-home dnd-arrow-enable text-info" />);

    case DragDropItemTypes.WELLPLATE:
    case DragDropItemTypes.REACTION:
    case DragDropItemTypes.RESEARCH_PLAN:
    case DragDropItemTypes.ELEMENT:
      return connectDragSource(<span className="fa fa-arrows dnd-arrow-enable text-info" />);

    default:
      return <span className="fa fa-arrows dnd-arrow-disable" />;
  }
}

export default DragSource((props) => props.sourceType, listSource, collectSource)(ElementContainer);

ElementContainer.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  sourceType: PropTypes.string.isRequired,
};
