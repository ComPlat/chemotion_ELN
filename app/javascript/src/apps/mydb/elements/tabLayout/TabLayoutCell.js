import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';
import flow from 'lodash/flow';
import UserStore from 'src/stores/alt/stores/UserStore';
import { capitalizeWords } from 'src/utilities/textHelper';
import { DragDropItemTypes } from 'src/utilities/DndConst';

const layoutSource = {
  beginDrag(props) {
    return props;
  }
};

const layoutTarget = {
  drop(props, monitor) {
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

    const elnElements = [
      'sample', 'reaction', 'screen',
      'wellplate', 'research_plan',
      'cell_line', 'device_description',
      'vessel'];

    let cellIcon = `icon-${cell}`;
    let cellTitle = capitalizeWords(cell);
    let cellDescription = '';

    if (!elnElements.includes(cell)) {
      const genericElements = UserStore.getState().genericEls || [];
      const genericElement = (genericElements && genericElements.find((el) => el.name === cell)) || {};
      cellIcon = genericElement.icon_name || 'fa fa-circle-thin';
      cellTitle = genericElement.label;
      cellDescription = genericElement.desc;
    }

    let content = isElementDetails ? (
      <div className="p-1 mt-2">
        <p className={`text-center fs-6 ${title === 'hidden' ? 'text-muted' : ''}`}>
          {title === 'hidden' ? '-' : title}
        </p>
      </div>
    ) : (
      <div>
        <i
          className={`${cellIcon} text-center ${isHidden ? 'text-gray-600' : 'text-primary'}`}
          title={[cellTitle, cellDescription].join(': ')}
        >
        </i>
      </div>
    );

    content = isCollectionTab ? (
      <div className={`w-auto text-center p-0 m-0 ${title === 'hidden' ? 'text-muted' : ''}`}>
        {title === 'hidden' ? '-' : title}
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
  DropTarget(DragDropItemTypes.LAYOUT, layoutTarget, (connect) => ({
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
