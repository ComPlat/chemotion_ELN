import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import classnames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import DragDropItemTypes from '../DragDropItemTypes'
import ReportActions from '../actions/ReportActions';

const orderSource = {
  beginDrag(props) {
    return { id: props.id, type: props.element.type };
  }
};

const orderTarget = {
  hover(targetProps, monitor) {
    const targetTag = { id: targetProps.id, type: targetProps.element.type };
    const sourceProps = monitor.getItem();
    const sourceTag = { id: sourceProps.id, type: sourceProps.type };
    if(targetTag.type !== sourceTag.type || targetTag.id !== sourceTag.id) {
      ReportActions.move({sourceTag, targetTag});
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

const ObjRow = ({element, connectDragSource, connectDropTarget, isDragging, isOver, canDrop}) => {
  const classNames = classnames('reaction');
  const style = {verticalAlign: 'middle', textAlign: 'center'};
  const bgColor = element.type === 'sample' ? '#000000' : '#428bca'
  const titleStyle = Object.assign({},
                      style, { backgroundColor: bgColor, color:'white' });
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
      <td style={titleStyle} width="10%">
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
  DragSource(DragDropItemTypes.GENERAL, orderSource, orderDragCollect),
  DropTarget(DragDropItemTypes.GENERAL, orderTarget, orderDropCollect)
)(ObjRow);
