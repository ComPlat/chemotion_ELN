import React from 'react';
import SVG from 'react-inlinesvg';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { Card, Button } from 'react-bootstrap';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import classnames from 'classnames';

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

const ObjRow = ({
  element,
  template,
  connectDragSource,
  connectDropTarget,
  isDragging,
  isOver
}) => {
  let variant = 'light';
  let icon = null;
  const isStdTemplate = template === 'standard';
  const { type, role } = element;
  if (type === 'sample') {
    variant = 'success';
  } else if (!isStdTemplate && type === 'reaction' && role === 'gp') {
    variant = 'primary';
    icon = <i className="ms-1 fa fa-home c-bs-info" />;
  } else if (!isStdTemplate && type === 'reaction' && role === 'single') {
    variant = 'light';
    icon = <i className="ms-1 fa fa-asterisk c-bs-danger" />;
  } else if (!isStdTemplate && type === 'reaction' && role === 'parts') {
    variant = 'info';
    icon = <i className="ms-1 fa fa-bookmark c-bs-success" />;
  } else if (type === 'reaction') {
    variant = 'info';
  }

  const clickToRm = () => {
    ReportActions.remove({ type: element.type, id: element.id });
    UIActions.uncheckWholeSelection.defer();
  };

  // react-dnd needs a native element wrapper. In this case it's a <div>.
  return compose(connectDragSource, connectDropTarget)(
    <div>
      <Card
        className={classnames({
          'border-dashed border-3': isOver,
          'opacity-25': isDragging,
        })}
        border={variant}
      >
        <Card.Header className={`d-flex align-items-center justify-content-between text-bg-${variant}`}>
          <span>
            {element.title()}
            {icon}
          </span>
          <Button
            variant="danger"
            size="xxsm"
            onClick={clickToRm}
          >
            <i className="fa fa-times" />
          </Button>
        </Card.Header>
        <Card.Body className="d-flex align-items-center justify-content-between">
          <div className="svg" style={{ height: '80px' }}>
            <SVG src={element.svgPath} key={element.svgPath} />
          </div>
          <i
            style={{ cursor: 'move' }}
            className="fs-2 text-info fa fa-arrows"
          />
        </Card.Body>
      </Card>
    </div>
  );
};

export default compose(
  DragSource(DragDropItemTypes.GENERAL, orderSource, orderDragCollect),
  DropTarget(DragDropItemTypes.GENERAL, orderTarget, orderDropCollect),
)(ObjRow);
