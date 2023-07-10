import React from 'react';
import PropTypes from 'prop-types';
import Immutable from 'immutable';

import ArrayUtils from 'src/utilities/ArrayUtils';
import TabLayoutCell from 'src/apps/mydb/elements/tabLayout/TabLayoutCell';

export default class TabLayoutContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: Immutable.List(props.visible),
      hidden: Immutable.List(props.hidden)
    }

    this.moveLayout = this.moveLayout.bind(this);
  }

  moveLayout(dragItem, hoverItem) {
    let { visible, hidden } = this.state;

    if (!dragItem.isHidden && hoverItem.isHidden && visible.size === 1) return;

    if (dragItem.isHidden && dragItem.title === 'hidden') return

    if (dragItem.isHidden) {
      hidden = hidden.splice(dragItem.index, 1);
    } else if (visible.size > 1) {
      visible = visible.splice(dragItem.index, 1);
    }

    if (hoverItem.isHidden) {
      hidden = hidden.splice(hoverItem.index, 0, dragItem.cell);
    } else {
      visible = visible.splice(hoverItem.index, 0, dragItem.cell);
    }

    if (hidden.size === 0) {
      hidden = ArrayUtils.pushUniq(hidden, 'hidden');
    } else if (hidden.size > 1) {
      hidden = ArrayUtils.removeFromListByValue(hidden, 'hidden');
    }

     visible = ArrayUtils.removeFromListByValue(visible, 'hidden');
    this.setState({ visible, hidden });
  }

  render() {
    const { visible, hidden } = this.state;
    const { isElementDetails, tabTitles, isCollectionTab } = this.props;
    let moveLayout = this.moveLayout;
    const visibleCells = visible.map((cell, index) => {
      const defTitle = cell.replace(/(^\w{1})|(\s+\w{1})/g, l => l.toUpperCase());
      return (
        <td key={index + "_visible"}>
          <TabLayoutCell
            cell={cell}
            index={index}
            isElementDetails={isElementDetails}
            isHidden={false}
            moveLayout={moveLayout}
            title={tabTitles[cell] || defTitle}
            isCollectionTab={isCollectionTab}
          />
        </td>
      );
    });

    const hiddenCells = hidden.map((cell, index) => {
      const defTitle = cell.replace(/(^\w{1})|(\s+\w{1})/g, l => l.toUpperCase());
      return (
        <td className="hidden-layout" key={index + "_hidden"}>
          <TabLayoutCell
            cell={cell}
            index={index}
            isElementDetails={isElementDetails}
            isHidden
            moveLayout={moveLayout}
            title={tabTitles[cell] || defTitle}
            isCollectionTab={isCollectionTab}
          />
        </td>
      );
    });

    return (
      <table className="layout-container" style={{ overflowY: 'scroll'}}>
        <tbody style={{ textAlign: 'left' }}>
          <tr>{visibleCells}</tr>
          <tr>{hiddenCells}</tr>
        </tbody>
      </table>
    );
  }
}

TabLayoutContainer.propTypes = {
  tabTitles: PropTypes.object,
};

TabLayoutContainer.defaultProps = {
  tabTitles: {},
};
