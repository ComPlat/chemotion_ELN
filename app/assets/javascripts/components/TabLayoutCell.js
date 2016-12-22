import React, {Component, PropTypes} from 'react';
import {findDOMNode} from 'react-dom';
import {DragSource, DropTarget} from 'react-dnd';
import flow from 'lodash/flow';

import DragDropItemTypes from './DragDropItemTypes';

const layoutSource = {
  beginDrag(props) {
    return props;
  }
};

const layoutTarget = {
  drop(props, monitor, component) {
    props.moveLayout(monitor.getItem(), props);
  }
};

class TabLayoutCell extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const {connectDragSource, sourceType, isHidden, cell, connectDropTarget} = this.props;

    let layoutCell = (
      <td className={isHidden ? "hidden-layout" : "" }>
        <div><i className={"icon-" + cell }/></div>
      </td>
    )

    if (sourceType == "") {
      return layoutCell
    }

    return connectDragSource(connectDropTarget(layoutCell), {dropEffect: 'copy'})
  }
}

export default flow(
  DragSource(DragDropItemTypes.LAYOUT, layoutSource, (connect, monitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  })),
  DropTarget(DragDropItemTypes.LAYOUT, layoutTarget, connect => ({
    connectDropTarget: connect.dropTarget()
  }))
)(TabLayoutCell);

TabLayoutCell.propTypes = {
  connectDragSource: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isHidden: PropTypes.bool.isRequired,
  cell: PropTypes.string.isRequired,
  index: PropTypes.any.isRequired,
  moveLayout: PropTypes.func.isRequired
};
