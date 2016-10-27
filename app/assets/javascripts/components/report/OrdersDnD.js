import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import classnames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { ItemTypes } from '../constant/ItemTypes';
import ReportActions from '../actions/ReportActions';

const orderSource = {
  beginDrag(props) {
    return { id: props.id };
  }
};

const orderTarget = {
  hover(targetProps, monitor) {
    const targetId = targetProps.id;
    const sourceProps = monitor.getItem();
    const sourceId = sourceProps.id;
    if(sourceId !== targetId) {
      ReportActions.move({sourceId, targetId});
    }
  }
};

const orderDragCollect = (connect, monitor) => {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  }
}

const orderDropCollect = (connect, monitor) => {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }
}

const ReactionRow = ({element, connectDragSource, connectDropTarget, isDragging, isOver, canDrop}) => {
  const classNames = classnames('reaction');
  const style = {verticalAlign: 'middle', textAlign: 'center'};
  if (canDrop) {
    style.borderStyle = 'dashed';
    style.borderWidth = 3;
  }
  if (isOver) {
    style.borderColor = '#337ab7';
  }
  if (isDragging) {
    style.opacity = 0.2;
  }

  return compose(connectDragSource, connectDropTarget)(
    <tr>
      <td style={style} width="10%">
        {element.title()}
      </td>
      <td style={style} width="80%">
        <SVG src={element.svgPath} className={classNames} key={element.svgPath}/>
      </td>
      <td style={style} width="10%">
        <span style={{fontSize: '18pt', cursor: 'move'}}
              className='text-info fa fa-arrows' />
      </td>
    </tr>
  );
}

export default compose(
  DragSource(ItemTypes.REACTION, orderSource, orderDragCollect),
  DropTarget(ItemTypes.REACTION, orderTarget, orderDropCollect)
)(ReactionRow);
