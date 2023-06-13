import React from 'react';
import PropTypes from 'prop-types';

let currentView = '';

export function setCurrentViewForEventRenderer(view) {
  currentView = view;
}

function capitalize(s) {
  return s[0].toUpperCase() + s.slice(1);
}

export function getEventableIcon(entry) {
  if (entry.element_klass_icon) return entry.element_klass_icon;
  return null;
}

export default function CalendarEvent(props) {
  const { event } = props;
  const shortTitle = currentView === 'month';

  return (
    <div>
      <div style={{ marginBottom: !shortTitle ? 6 : 0, marginTop: !shortTitle ? 6 : 0 }}>
        {event.title}
      </div>
      { !shortTitle ? (
        <div>
          <div style={{ fontStyle: 'italic', marginBottom: !shortTitle ? 6 : 0 }}>
            {event.element_klass_name ? (
              <span>
                <span className={getEventableIcon(event)}>
                  &nbsp;
                  {event.element_klass_name}
                </span>
                <span>
                  {event.kind ? ` - ${capitalize(event.kind)}` : null}
                </span>
              </span>
            ) : (
              <span>
                {event.kind ? capitalize(event.kind) : null}
              </span>
            )}
          </div>
          <div>
            {event.element_short_label}
          </div>
        </div>
      ) : null }
    </div>
  );
}

CalendarEvent.propTypes = {
  event: PropTypes.shape({
    title: PropTypes.string,
    kind: PropTypes.string,
    element_klass_name: PropTypes.string,
    element_short_label: PropTypes.string,
  }).isRequired,
};
