import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { capitalizeWords } from 'src/utilities/textHelper';
import { StoreContext } from 'src/stores/mobx/RootStore';

const CalendarEvent = (props) => {
  const calendarStore = useContext(StoreContext).calendar;
  const { event } = props;
  const shortTitle = calendarStore.current_view === 'month';

  const klassIcon = (event) => {
    if (!event.element_klass_icon) { return null; }

    return (
      <>
        <i className={`${event.element_klass_icon} me-2`} />
        {event.element_klass_name}
      </>
    );
  }

  const eventKind = (event) => {
    if (!event.kind) { return null; }

    return ` - ${capitalizeWords(event.kind)}`;
  }

  const eventDetail = (event) => {
    if (shortTitle) { return null; }

    let detail = eventKind(event);
    if (event.element_klass_name) {
      detail = (
        <span className="d-block my-2">
          {klassIcon(event)}
          {eventKind(event)}
        </span>
      );
    }
    return detail;
  }

  return (
    <div>
      <div className={shortTitle ? 'my-2' : 'my-0'}>
        {event.title}
        {!shortTitle && (
          <span className="fst-italic">
            {eventDetail(event)}
            {event.element_short_label}
          </span>
        )}
      </div>
    </div>
  );
}

export default CalendarEvent;

CalendarEvent.propTypes = {
  event: PropTypes.shape({
    title: PropTypes.string,
    kind: PropTypes.string,
    element_klass_name: PropTypes.string,
    element_short_label: PropTypes.string,
  }).isRequired,
};
