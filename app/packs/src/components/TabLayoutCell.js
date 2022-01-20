import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { DragSource, DropTarget } from 'react-dnd';
import flow from 'lodash/flow';
import UserStore from './stores/UserStore';

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

  render() {
    const {
      connectDragSource, sourceType, isHidden, cell, connectDropTarget, isElementDetails, title
    } = this.props;

    const styleObj = {
      fontSize: 12,
      color: '#000000',
      textAlign: 'center',
      wordWrap: 'break-word'
    };

    const constEls = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'];
    let iconCell = `icon-${cell}`;
    let ttl = cell && (cell.replace('_', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()));
    let ttd = '';

    if (!constEls.includes(cell)) {
      const genericEls = UserStore.getState().genericEls || [];
      const genericEl = (genericEls && genericEls.find(el => el.name === cell)) || {};
      iconCell = `${genericEl.icon_name}`;
      ttl = genericEl.label;
      ttd = genericEl.desc;
    }

    const layoutCell = isElementDetails ? (
      <tr>
        <td className={isHidden ? 'hidden-layout' : ''}>
          <div style={{ width: '100%' }}>
            <i style={styleObj}>{title === 'hidden' ? '-' : title}</i>
          </div>
        </td>
      </tr>

    ) : (
      <td className={isHidden ? 'hidden-layout' : ''}>
        <div><OverlayTrigger delayShow={500} placement="top" overlay={<Tooltip id="_tooltip_history" className="left_tooltip">{ttl}<br />{ttd}</Tooltip>}><i className={iconCell} /></OverlayTrigger></div>
      </td>


    );

    if (sourceType === '') {
      return layoutCell;
    }
    return connectDragSource(connectDropTarget(layoutCell), { dropEffect: 'copy' });
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