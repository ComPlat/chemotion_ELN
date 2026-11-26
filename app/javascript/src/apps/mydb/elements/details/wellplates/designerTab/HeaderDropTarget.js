import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';

const headerTarget = {
  canDrop(props) {
    return !props.readOnly;
  },
  drop(props, monitor) {
    props.onFill(monitor.getItem().element, props.axis, props.index);
  }
};

const collectTarget = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  canDrop: monitor.canDrop()
});

const HeaderDropTarget = ({
  connectDropTarget, canDrop, className, children
}) => {
  const classes = canDrop ? `${className} border border-dashed` : className;
  return connectDropTarget(<div className={classes}>{children}</div>);
};

HeaderDropTarget.propTypes = {
  connectDropTarget: PropTypes.func.isRequired,
  canDrop: PropTypes.bool.isRequired,
  axis: PropTypes.oneOf(['x', 'y']).isRequired,
  index: PropTypes.number.isRequired,
  onFill: PropTypes.func.isRequired,
  readOnly: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node,
};

HeaderDropTarget.defaultProps = {
  readOnly: false,
  className: '',
  children: null,
};

export default DropTarget(DragDropItemTypes.SAMPLE, headerTarget, collectTarget)(HeaderDropTarget);
