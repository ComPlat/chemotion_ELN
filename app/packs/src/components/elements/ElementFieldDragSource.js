import React from 'react';
import PropTypes from 'prop-types';
import { DragSource } from 'react-dnd';
import DragDropItemTypes from '../../components/DragDropItemTypes';

const listSource = {
  beginDrag(props) {
    console.log('begin Drag');
    console.log(props.field);
    return { field: props.field, layerKey: props.layerKey };
  },
};

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

const ElementFieldDragSource = ({ connectDragSource }) => connectDragSource(<span className="fa fa-lg fa-arrows text-info drag-source" />);

export default DragSource(DragDropItemTypes.ELEMENT_FIELD, listSource, collectSource)(ElementFieldDragSource);

ElementFieldDragSource.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
};
