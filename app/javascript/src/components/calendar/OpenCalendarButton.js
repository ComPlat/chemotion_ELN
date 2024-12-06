import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { StoreContext } from 'src/stores/mobx/RootStore';

import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';

function getDefaultDateTimeRange() {
  const date = new Date();
  const weekStart = new Date().setDate(date.getDate() - (date.getDay() || 7));
  const weekEnd = new Date().setDate(date.getDate() - date.getDay() + 7);
  return { start: new Date(weekStart), end: new Date(weekEnd) };
}

export default class OpenCalendarButton extends Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    const { start, end, show_shared_collection_entries } = this.context.calendar;
    const params = {};
    if (!start || !end) {
      const range = getDefaultDateTimeRange();
      params.start = range.start;
      params.end = range.end;
    } else {
      params.start = start;
      params.end = end;
    }
    const { eventableType, eventableId } = this.props;
    params.eventable_type = eventableType;
    params.eventable_id = eventableId;
    params.showSharedCollectionEntries = show_shared_collection_entries;

    this.context.calendar.showCalendar();
    this.context.calendar.setViewParams(params);
  }

  render() {
    const { isPanelHeader } = this.props;
    if (isPanelHeader) {
      return (
        <Button
          size="xxsm"
          variant="light"
          onClick={this.onClick}
        >
          <i className="fa fa-calendar" />
        </Button>
      );
    }

    return (
      <SidebarButton
        onClick={this.onClick}
        label="Calendar"
        icon="fa-calendar"
      />
    );
  }
}

OpenCalendarButton.defaultProps = {
  eventableType: undefined,
  eventableId: undefined,
  isPanelHeader: undefined,
  isCollapsed: false,
};

OpenCalendarButton.propTypes = {
  eventableType: PropTypes.string,
  eventableId: PropTypes.number,
  isPanelHeader: PropTypes.bool,
  isCollapsed: PropTypes.bool,
};
