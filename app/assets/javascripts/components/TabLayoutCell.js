import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import { DragSource, DropTarget } from 'react-dnd';
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
    const {connectDragSource, sourceType, isHidden, cell, connectDropTarget, isElementDetails, title} = this.props;

    const styleObj = {
      fontSize: 12,
      color: "#000000",
      textAlign: "center",
      wordWrap: "break-word"
    }

    let layoutCell = (
      <td className={isHidden ? "hidden-layout" : "" }>
        {
          isElementDetails ? (<div><i style={styleObj}>{title}</i></div>) : (<div><i className={"icon-" + cell }/></div>)
        }
        
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
