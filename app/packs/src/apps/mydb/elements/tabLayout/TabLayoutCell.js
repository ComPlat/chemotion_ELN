import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from 'react-bootstrap';
import { DragSource, DropTarget } from 'react-dnd';
import flow from 'lodash/flow';
import UserStore from 'src/stores/alt/stores/UserStore';

import DragDropItemTypes from 'src/components/DragDropItemTypes';

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

  render() {
    const {
      cell,
      connectDragSource,
      connectDropTarget,
      isElementDetails,
      isHidden,
      title,
      isCollectionTab
    } = this.props;

    const styleObj = {
      fontSize: 12,
      color: '#000000',
      textAlign: 'center',
      wordWrap: 'break-word',
      width: '85px'
    };

    const elnElements = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'];
    let cellIcon = `icon-${cell}`;
    let cellTitle = cell && (cell.replace('_', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()));
    let cellDescription = '';

    if (!elnElements.includes(cell)) {
      const genericElements = UserStore.getState().genericEls || [];
      const genericElement = (genericElements && genericElements.find(el => el.name === cell)) || {};
      cellTitle = genericElement.label;
      cellDescription = genericElement.desc;
    }

    let content = isElementDetails ? (
      <div style={{ width: '100%' }}>
        <p style={styleObj}>{title === 'hidden' ? '-' : title}</p>
      </div>
    ) : (
      <div>
        <i className={cellIcon} title={[cellTitle, cellDescription].join(': ')} >
          {isHidden ? "\u00A0" : ''}
        </i>
      </div>
    );

    content = isCollectionTab ? (
      <div style={{ width: 'auto' }}>
        <p style={styleObj}>{title === 'hidden' ? '-' : title}</p>
      </div>
    ) : (
      content
    );

    return connectDragSource(connectDropTarget(content), { dropEffect: 'copy' });
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
