import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { Panel, Button } from 'react-bootstrap';
import DragDropItemTypes from '../DragDropItemTypes'
import ReportActions from '../actions/ReportActions';
import UIActions from '../actions/UIActions';

const orderSource = {
  beginDrag(props) {
    return { id: props.id, type: props.element.type };
  }
};

const orderTarget = {
  drop(targetProps, monitor) {
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

const headerTitle = (el, icon) => {
  const clickToRm = () => {
    ReportActions.remove({ type: el.type, id: el.id });
    UIActions.uncheckWholeSelection.defer();
  };

  return (
    <span>
      {el.title()} {icon}
      <Button
        bsStyle="danger"
        bsSize="xsmall"
        className="button-right"
        onClick={clickToRm}
      >
        <i className="fa fa-times" />
      </Button>
    </span>
  );
}

const ObjRow = ({element, template, connectDragSource, connectDropTarget, isDragging, isOver, canDrop}) => {
  const style = {};
  if (canDrop) {
    style.borderStyle = 'dashed';
    style.borderWidth = 2;
  }
  if (isOver) {
    style.borderColor = '#337ab7';
  }
  if (isDragging) {
    style.opacity = 0.2;
  }

  let bsStyle = "default";
  let icon = null;
  if(element.type === 'sample') {
    bsStyle = 'success';
  } else if (template === 'supporting_information' && element.type === 'reaction' && element.role === 'gp') {
    bsStyle = 'primary';
    icon = <i className="fa fa-home c-bs-info" />;
  } else if (template === 'supporting_information' && element.type === 'reaction' && element.role === 'single') {
    bsStyle = 'default';
    icon = <i className="fa fa-asterisk c-bs-danger" />;
  } else if (template === 'supporting_information' && element.type === 'reaction' && element.role === 'parts') {
    bsStyle = 'info';
    icon = <i className="fa fa-bookmark c-bs-success" />;
  } else if (element.type === 'reaction') {
    bsStyle = 'info';
  }

  return compose(connectDragSource, connectDropTarget)(
    <div>
      <Panel style={style} header={headerTitle(element, icon)} bsStyle={bsStyle}>
        <div className="row">
          <div className="svg">
            <SVG src={element.svgPath} key={element.svgPath}/>
          </div>
          <div className="dnd-btn">
            <span style={{fontSize: '18pt', cursor: 'move'}}
                  className='text-info fa fa-arrows' />
          </div>
        </div>
      </Panel>
    </div>
  );
}

export default compose(
  DragSource(DragDropItemTypes.GENERAL, orderSource, orderDragCollect),
  DropTarget(DragDropItemTypes.GENERAL, orderTarget, orderDropCollect)
)(ObjRow);
