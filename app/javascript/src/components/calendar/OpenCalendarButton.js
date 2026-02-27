import React, { useContext, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import NotificationButton from 'src/apps/mydb/mainNavigation/topbar/NotificationButton';

function getDefaultDateTimeRange() {
  const date = new Date();
  const weekStart = new Date().setDate(date.getDate() - (date.getDay() || 7));
  const weekEnd = new Date().setDate(date.getDate() - date.getDay() + 7);
  return { start: new Date(weekStart), end: new Date(weekEnd) };
}

function OpenCalendarButton({ eventableType, eventableId, isPanelHeader }) {
  const { calendar } = useContext(StoreContext);

  const onClick = useCallback(() => {
    const { start, end, show_shared_collection_entries } = calendar;
    const params = {};
    if (!start || !end) {
      const range = getDefaultDateTimeRange();
      params.start = range.start;
      params.end = range.end;
    } else {
      params.start = start;
      params.end = end;
    }
    params.eventable_type = eventableType;
    params.eventable_id = eventableId;
    params.showSharedCollectionEntries = show_shared_collection_entries;

    calendar.showCalendar();
    calendar.setViewParams(params);
  }, [calendar, eventableType, eventableId]);

  if (isPanelHeader) {
    return (
      <Button
        size="xxsm"
        variant="light"
        onClick={onClick}
      >
        <i className="fa fa-calendar" />
      </Button>
    );
  }

  return (
    <NotificationButton
      onClick={onClick}
      label="Calendar"
      icon="fa-calendar"
    />
  );
}

OpenCalendarButton.defaultProps = {
  eventableType: undefined,
  eventableId: undefined,
  isPanelHeader: false,
};

OpenCalendarButton.propTypes = {
  eventableType: PropTypes.string,
  eventableId: PropTypes.number,
  isPanelHeader: PropTypes.bool,
};

export default observer(OpenCalendarButton);
