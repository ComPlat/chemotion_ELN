import React, { PropTypes } from 'react';
import ItemTypes from './ItemTypes';
import { DragSource, DropTarget } from 'react-dnd';

const cardStyle = {
  height: 50,
  width: 50,
  borderRadius: 25,
  textAlign: 'center',
  verticalAlign: 'middle',
  lineHeight: 2,
  paddingTop: 7,
  marginLeft: 5,
  marginBottom: 5,
  cursor: 'move',
  float: 'left',
  border: '3px solid gray'
};

const cardSource = {
  beginDrag(props) {
    return {id: props.id};
  }
};

const cardTarget = {
  hover(props, monitor) {
    const draggedId = monitor.getItem().id;

    if(draggedId !== props.id) {
      props.moveCard(draggedId, props.id);
    }
  }
};

const collectTarget = connect => ({
  connectDropTarget: connect.dropTarget()
});

const collectSource = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
});

class Card {
  render() {
    const { style, text, isDragging, connectDragSource, connectDropTarget } = this.props;
    const borderStyle = isDragging ? 'dashed' : 'solid';
    const label = isDragging ? '' : text;

    return connectDragSource(connectDropTarget(<div style={{ ...style, ...cardStyle, borderStyle }}>
        {label}
      </div>));
  }
}

export default DropTarget(ItemTypes.CARD, cardTarget, collectTarget)(DragSource(ItemTypes.CARD, cardSource, collectSource)(Card));

Card.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  id: PropTypes.any.isRequired,
  text: PropTypes.string.isRequired,
  moveCard: PropTypes.func.isRequired
};