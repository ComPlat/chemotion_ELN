import React from 'react';
import SVG from 'react-inlinesvg';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { Button } from 'react-bootstrap';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import Panel from 'src/components/legacyBootstrap/Panel'

const orderSource = {
  beginDrag(props) {
    return { id: props.id, type: props.element.type };
  },
};

const orderTarget = {
  drop(targetProps, monitor) {
    const targetTag = { id: targetProps.id, type: targetProps.element.type };
    const sourceProps = monitor.getItem();
    const sourceTag = { id: sourceProps.id, type: sourceProps.type };
    if (targetTag.type !== sourceTag.type || targetTag.id !== sourceTag.id) {
      ReportActions.move({ sourceTag, targetTag });
    }
  },
};

const orderDragCollect = (connect, monitor) => (
  {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  }
);

const orderDropCollect = (connect, monitor) => (
  {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }
);

const headerTitle = (el, icon) => {
  const clickToRm = () => {
    ReportActions.remove({ type: el.type, id: el.id });
    UIActions.uncheckWholeSelection.defer();
  };

  return (
    <span>
      {el.title()} {icon}
      <Button
        variant="danger"
        size="sm"
        onClick={clickToRm}
      >
        <i className="fa fa-times" />
      </Button>
    </span>
  );
};

const ObjRow = ({ element, template, connectDragSource, connectDropTarget,
  isDragging, isOver, canDrop }) => {
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

  let variant = 'light';
  let icon = null;
  const isStdTemplate = template === 'standard';
  const { type, role } = element;
  if (type === 'sample') {
    variant = 'success';
  } else if (!isStdTemplate && type === 'reaction' && role === 'gp') {
    variant = 'primary';
    icon = <i className="fa fa-home c-bs-info" />;
  } else if (!isStdTemplate && type === 'reaction' && role === 'single') {
    variant = 'light';
    icon = <i className="fa fa-asterisk c-bs-danger" />;
  } else if (!isStdTemplate && type === 'reaction' && role === 'parts') {
    variant = 'info';
    icon = <i className="fa fa-bookmark c-bs-success" />;
  } else if (type === 'reaction') {
    variant = 'info';
  }

  return compose(connectDragSource, connectDropTarget)(
    <div>
      <Panel
        style={style}
        variant={variant}
      >
        <Panel.Heading>{headerTitle(element, icon)}</Panel.Heading>
        <div className="row">
          <div className="svg">
            <SVG src={element.svgPath} key={element.svgPath} />
          </div>
          <div className="dnd-btn">
            <span
              style={{ fontSize: '18pt', cursor: 'move' }}
              className="text-info fa fa-arrows"
            />
          </div>
        </div>
      </Panel>
    </div>,
  );
};

export default compose(
  DragSource(DragDropItemTypes.GENERAL, orderSource, orderDragCollect),
  DropTarget(DragDropItemTypes.GENERAL, orderTarget, orderDropCollect),
)(ObjRow);
