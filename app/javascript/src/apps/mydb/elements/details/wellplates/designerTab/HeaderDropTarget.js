import React from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';

const headerTarget = {
  canDrop(props) {
    return !props.readOnly;
  },
  drop(props, monitor) {
    if (props.empty === 0) {
      props.onFull(props.axis, props.index);
      return;
    }

    props.onFill(monitor.getItem().element, props.axis, props.index);
  }
};

const collectTarget = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  canDrop: monitor.canDrop()
});

const HeaderDropTarget = ({
  connectDropTarget, canDrop, className, children, axis, index, empty, filled, readOnly, onClear
}) => {
  const clearable = !readOnly && filled > 0;
  const clear = () => onClear(axis, index, filled);
  const onKeyDown = (event) => {
    if (!['Enter', ' '].includes(event.key)) return;

    event.preventDefault();
    clear();
  };

  return connectDropTarget(
    <div
      className={`${className} border border-dashed`}
      role={clearable ? 'button' : undefined}
      tabIndex={clearable ? 0 : undefined}
      style={{
        borderColor: canDrop && empty > 0 ? undefined : 'transparent',
        cursor: clearable ? 'pointer' : undefined,
      }}
      onClick={clearable ? clear : undefined}
      onKeyDown={clearable ? onKeyDown : undefined}
    >
      {children}
    </div>
  );
};

HeaderDropTarget.propTypes = {
  connectDropTarget: PropTypes.func.isRequired,
  canDrop: PropTypes.bool.isRequired,
  axis: PropTypes.oneOf(['x', 'y']).isRequired,
  index: PropTypes.number.isRequired,
  filled: PropTypes.number.isRequired,
  empty: PropTypes.number.isRequired,
  onFill: PropTypes.func.isRequired,
  onFull: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
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
