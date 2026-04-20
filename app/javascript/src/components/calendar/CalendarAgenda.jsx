import React from 'react';
import PropTypes from 'prop-types';

function CalendarAgenda(props) {
  const { events, onSelectEvent, eventStyleGetter } = props;

  if (events.length === 0) {
    return (
      <div className="rbc-agenda-view">
        <p>No events</p>
      </div>
    );
  }

  const groupedByDate = {};
  events.forEach((event) => {
    const dateKey = new Date(event.start).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = [];
    }
    groupedByDate[dateKey].push(event);
  });

  const dates = Object.keys(groupedByDate);

  return (
    <div
      className="rbc-agenda-view"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto'
      }}
    >
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
          {dates.map((dateKey) => {
            const dateEvents = groupedByDate[dateKey];
            return dateEvents.map((event, idx) => {
              const eventStyle = eventStyleGetter ? eventStyleGetter(event) : {};
              return (
                <tr
                  key={`${dateKey}-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectEvent?.(event)}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectEvent?.(event)}
                  className="rbc-agenda-event-row"
                  style={eventStyle.style}
                >
                {idx === 0 && (
                  <td
                    rowSpan={dateEvents.length}
                    className="rbc-agenda-date-cell"
                  >
                    {dateKey}
                  </td>
                )}
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

export default CalendarAgenda;
