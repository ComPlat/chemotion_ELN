import React from 'react';
import PropTypes from 'prop-types';
import { Table } from 'react-bootstrap';
import Immutable from 'immutable';
import uuid from 'uuid';

import ArrayUtils from 'src/utilities/ArrayUtils';
import TabLayoutCell from 'src/apps/mydb/elements/tabLayout/TabLayoutCell';
import { capitalizeWords } from 'src/utilities/textHelper';
import UserStore from 'src/stores/alt/stores/UserStore';

export default class TabLayoutContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: Immutable.List(props.visible),
      hidden: Immutable.List(props.hidden)
    };

    this.moveLayout = this.moveLayout.bind(this);
  }

  moveLayout(dragItem, hoverItem) {
    let { visible, hidden } = this.state;

    if (!dragItem.isHidden && hoverItem.isHidden && visible.size === 1) return;

    if (dragItem.isHidden && dragItem.title === 'hidden') return;

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
    const { moveLayout } = this;
    let segmentKlasses = (UserStore.getState() && UserStore.getState().segmentKlasses) || [];
    let segmentTabs = segmentKlasses.map(s => s.label);

    const visibleCells = visible.map((cell, index) => {
      const defTitle = segmentTabs.includes(cell) ? cell : capitalizeWords(cell);
      return (
        <td key={uuid.v4()}>
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
      const defTitle = segmentTabs.includes(cell) ? cell : capitalizeWords(cell);
      return (
        <td key={uuid.v4()}>
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
      <Table
        bordered
        responsive
        className={`text-center ${!isCollectionTab ? 'fs-1' : ''} border-1 border-gray-300 m-0`}
      >
        <tbody>
          <tr className="text-center">{visibleCells}</tr>
          <tr className="text-center bg-gray-400 text-gray-200 border-bottom-0">
            {hiddenCells}
          </tr>
        </tbody>
      </Table>
    );
  }
}

TabLayoutContainer.propTypes = {
  tabTitles: PropTypes.object,
};

TabLayoutContainer.defaultProps = {
  tabTitles: {},
};
