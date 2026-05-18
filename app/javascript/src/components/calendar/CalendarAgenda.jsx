import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const formatDate = (date) => new Date(date).toLocaleDateString('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const isSameDay = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  return s.getFullYear() === e.getFullYear()
    && s.getMonth() === e.getMonth()
    && s.getDate() === e.getDate();
};

function CalendarAgenda(props) {
  const calendarStore = useContext(StoreContext).calendar;
  const { events, onSelectEvent, eventStyleGetter } = props;

  const currentDate = new Date(calendarStore.current_date);
  const isToday = currentDate.toDateString() === new Date().toDateString();
  const displayDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const agendaHeader = (
    <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
      <span style={{ fontWeight: 600, fontSize: '1rem' }}>
        {displayDate}
        {isToday && (
          <span className="ms-2 badge bg-primary" style={{ fontSize: '0.7rem', verticalAlign: 'middle' }}>
            Today
          </span>
        )}
      </span>
      <Form.Check
        type="checkbox"
        id="calendar-show-past-events"
        label="Show past events"
        checked={calendarStore.show_past_events}
        onChange={() => calendarStore.toggleShowPastEvents()}
      />
    </div>
  );

  if (events.length === 0) {
    return (
      <div className="rbc-agenda-view d-flex flex-column" style={{ height: '100%' }}>
        {agendaHeader}
        <div className="d-flex flex-grow-1 align-items-center justify-content-center">
          <p className="text-muted mb-0">No events scheduled.</p>
        </div>
      </div>
    );
  }

  const groupedByDate = {};
  events.forEach((event) => {
    const dateKey = formatDate(event.start);
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(event);
  });

  const allDates = Object.keys(groupedByDate);

  return (
    <div
      className="rbc-agenda-view"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto'
      }}
    >
      {agendaHeader}
      <table
        className="rbc-agenda-table"
        style={{
          width: '100%',
          borderCollapse: 'collapse'
        }}
      >
        <thead>
          <tr>
            <th style={{ width: '10%' }}>Date</th>
            <th style={{ width: '15%' }}>Time</th>
            <th style={{ width: '25%' }}>Event Name</th>
            <th style={{ width: '50%' }}>Event Description</th>
          </tr>
        </thead>
        <tbody>
          {allDates.map((dateKey) => {
            const dateEvents = groupedByDate[dateKey];
            return dateEvents.map((event) => {
              const eventStyle = eventStyleGetter ? eventStyleGetter(event) : {};
              return (
                <tr
                  key={event.id ?? `${dateKey}-${event.title}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectEvent?.(event)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectEvent?.(event)}
                  className="rbc-agenda-event-row"
                  style={eventStyle.style}
                >
                  <td className="rbc-agenda-date-cell">
                    {isSameDay(event.start, event.end)
                      ? dateKey
                      : `${dateKey} – ${formatDate(event.end)}`}
                  </td>
                  <td className="rbc-agenda-time-cell">
                    {new Date(event.start).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {' – '}
                    {new Date(event.end).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td
                    className="rbc-agenda-event-name-cell"
                    style={{ verticalAlign: 'middle' }}
                  >
                    {event.element_klass_icon && (
                      <i className={`${event.element_klass_icon} me-2`} />
                    )}
                    {event.title}
                  </td>
                  <td
                    className="rbc-agenda-description-cell"
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '500px',
                      verticalAlign: 'middle'
                    }}
                  >
                    {event.description || ''}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}

CalendarAgenda.propTypes = {
  events: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    title: PropTypes.string,
    description: PropTypes.string,
    start: PropTypes.instanceOf(Date),
    end: PropTypes.instanceOf(Date),
    eventable_type: PropTypes.string,
    element_klass_icon: PropTypes.string,
  })).isRequired,
  onSelectEvent: PropTypes.func,
  eventStyleGetter: PropTypes.func
};

export default observer(CalendarAgenda);
