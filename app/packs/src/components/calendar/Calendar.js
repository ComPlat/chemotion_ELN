import React, { useContext, useState, useEffect } from 'react';
import { Calendar as BaseCalendar, Views, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { OverlayTrigger, Button, ButtonGroup, Tooltip, Modal, Stack } from 'react-bootstrap';
import Draggable from "react-draggable";
import moment from 'moment';

import CalendarStore from 'src/stores/alt/stores/CalendarStore';
import CalendarActions from 'src/stores/alt/actions/CalendarActions';
import CalendarEntryEditor from 'src/components/calendar/CalendarEntryEditor';
import UserStore from 'src/stores/alt/stores/UserStore';
import CalendarEvent, { setCurrentViewForEventRenderer } from 'src/components/calendar/CalendarEvent';

const AllViews = Object.keys(Views).map((k) => Views[k]);

const formats = {
  agendaHeaderFormat: ({ start, end }, culture, localizer) => `${localizer.format(start, 'DD MMMM', culture)} - ${localizer.format(end, 'DD MMMM YYYY', culture)}`,
  agendaDateFormat: 'ddd DD MMMM YYYY',
  dayFormat: 'dddd DD',
  dayRangeHeaderFormat: ({ start, end }, culture, localizer) => `${localizer.format(start, 'DD MMMM', culture)} - ${localizer.format(end, 'DD MMMM YYYY', culture)}`,
  monthHeaderFormat: 'MMMM YYYY',
  dayHeaderFormat: 'dddd DD MMMM YYYY',
  weekdayFormat: 'dddd',
};

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(BaseCalendar);

const ColorCache = {};
const DragThreshold = 25;

// cached vars
let currentUserId;

const WindowPreviewNone = 0;
const WindowPreviewRight = 1;
const WindowPreviewLeft = 2;
const WindowPreviewFullScreen = 3;

function getPreviewStyleArgs(state) {
  switch (state) {
    case WindowPreviewNone:
      return {
        width: 0,
        height: 0,
        left: window.innerWidth / 2,
        top: window.innerHeight / 2
      };
    case WindowPreviewRight:
      return {
        width: ModalWidth,
        height: window.innerHeight,
        left: window.innerWidth - ModalWidth,
        top: 0
      };
    case WindowPreviewLeft:
      return {
        width: ModalWidth,
        height: window.innerHeight,
        left: 0,
        top: 0
      };
    case WindowPreviewFullScreen:
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        left: 0,
        top: 0
      };
    default:
      throw new Error('Not implemented');
  }
}

function getWindowStyleOffsets(state) {
  switch (state) {
    case WindowPreviewNone:
      return null;
    case WindowPreviewRight:
      return {
        x: window.innerWidth - ModalWidth,
        y: 0,
      };
    case WindowPreviewLeft:
      return {
        x: 0,
        y: 0,
      };
    case WindowPreviewFullScreen:
      return {
        x: (window.innerWidth - ModalWidth) / 2,
        y: 0,
      };
    default:
      throw new Error('Not implemented');
  }
}

const allDayAccessor = (event) => {
  if ((event.start && event.start.getHours() === 0 && event.start.getMinutes() === 0)
    && (event.end && event.end.getHours() === 0 && event.end.getMinutes() === 0) &&
    moment(event.start).format() !== moment(event.end).format()) {
    return true;
  }
  return false;
};

// see:
//  https://jquense.github.io/react-big-calendar/examples/?path=/docs/props-full-prop-list--page

function idToColorComponent(id) {
  return (50 + (id % 19) * 10);
}

function getRed(id) {
  return `rgb(${idToColorComponent(id)},0,0)`;
}

function getGreen(id) {
  return `rgb(0,${idToColorComponent(id)},0)`;
}

function getRedGreen(id) {
  const tmp = idToColorComponent(id);
  return `rgb(${tmp},${tmp},0)`;
}

function getRedBlue(id) {
  const tmp = idToColorComponent(id);
  return `rgb(${tmp},0,${tmp})`;
}

function getGreenBlue(id) {
  const tmp = idToColorComponent(id);
  return `rgb(0,${tmp},${tmp})`;
}

function getEntryColor(entry) {
  let color;

  if (entry.eventableType) {
    color = ColorCache[entry.eventableId];
    if (!color) {
      if (entry.eventableType === 'Sample') {
        color = getRed(entry.eventableId);
      } else if (entry.eventableType === 'Reaction') {
        color = getGreen(entry.eventableId);
      } else if (entry.eventableType === 'ResearchPlan') {
        color = getGreenBlue(entry.eventableId);
      } else if (entry.eventableType === 'Screen') {
        color = getRedGreen(entry.eventableId);
      } else if (entry.eventableType === 'Element') {
        color = getRedBlue(entry.eventableId);
      }
      ColorCache[entry.eventableId] = color;
    }
  } else {
    color = '#265985'; // getRandomBlue();
  }
  return color;
}

function getEntryOpacity(entry, userId) {
  return entry.created_by === userId ? 1 : 0.3;
}

function canEditEntry(entry) {
  const { currentUser } = UserStore.getState();
  return !entry.created_by || entry.created_by === currentUser.id;
}

function buildNewEntry(entry) {
  const { eventableType, eventableId } = CalendarStore.getState();
  const customEntry = {
    ...entry,
    title: '',
    description: '',
    kind: '',
    eventableId,
    eventableType,
    accessible: true,
  };

  return customEntry;
}

function onHandleTimeUpdate(ev) {
  const entry = ev.event;
  if (!entry || !canEditEntry(entry)) return;

  entry.start = ev.start;
  entry.end = ev.end;

  CalendarActions.updateEntry(entry);
}

function onSwitchShowSharedCollectionEntries(val) {
  const {
    start,
    end,
    eventableType,
    eventableId
  } = CalendarStore.getState();

  const params = {
    start,
    end,
    eventableType,
    eventableId,
    showSharedCollectionEntries: val
  };

  CalendarActions.setViewParams(params);
}

function eventStyleGetter(event) {
  const style = {
    backgroundColor: getEntryColor(event),
    opacity: getEntryOpacity(event, currentUserId),
  };
  return { style };
}





const Calendar = () => {
  const { currentUser } = UserStore.getState();
  const { clientWidth, clientHeight } = window.document.documentElement;
  let modalDimensions = { width: 900, height: 700, x: 0, y: 0 }
  let smallScreen = modalDimensions.width >= clientWidth || modalDimensions.height >= clientHeight;

  const scrollTime = new Date();
  scrollTime.setHours(5);
  scrollTime.setMinutes(55);

  const [deltaPosition, setDeltaPosition] = useState({ x: 0, y: 0 });
  const [calendarClosed, setCalendarClosed] = useState(true);
  const [backdrop, setBackdrop] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [currentEntryEditable, setCurrentEntryEditable] = useState(false);
  const [showTimeSlotEditor, setShowTimeSlotEditor] = useState(false);
  const [showOwnEntries, setShowOwnEntries] = useState(false);
  const [currentView, setCurrentView] = useState(null);
  const [calendarStore, setCalendarStore] = useState(CalendarStore.getState());

  const handleResize = () => {
    const { clientWidth, clientHeight } = window.document.documentElement;
    const modal = document.querySelector('[data-type="calendar-modal"]');
    if (!modal) { return null; }

    modalDimensions = modal.getBoundingClientRect();
    const newPosition = {
      x: (clientWidth - modalDimensions.width) / 2,
      y: (clientHeight - modalDimensions.height) / 2
    };
    setDeltaPosition(newPosition);
    smallScreen = modalDimensions.width >= clientWidth || modalDimensions.height >= clientHeight;
  }

  useEffect(() => {
    CalendarStore.listen(onChangeCalendarState);
    window.addEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (calendarStore.show) {
      handleResize();
    }

    if (calendarClosed && calendarStore.show) {
      setCalendarClosed(false);
    }

    if (calendarClosed && !calendarStore.show) {
      CalendarStore.unlisten(onChangeCalendarState());
      window.removeEventListener('resize', handleResize);
    }
  }, [CalendarStore.getState().show]);

  useEffect(() => {
    if (fullscreen) {
      setDeltaPosition({ x: 0, y: 0 });
    } else {
      handleResize();
    }
  }, [fullscreen]);

  const onChangeCalendarState = function () {
    setCalendarStore(CalendarStore.getState());
    return true;
  }

  const handleDrag = (e, ui) => {
    const { x, y } = deltaPosition;
    setDeltaPosition({
      x: x + ui.deltaX,
      y: y + ui.deltaY,
    });
  }

  const getEventableIcon = (type) => {
    switch (type) {
      case 'Sample':
        return 'icon-sample';
      case 'Reaction':
        return 'icon-reaction';
      case 'Wellplate':
        return 'icon-wellplate';
      case 'ResearchPlan':
        return 'fa fa-file-text-o';
      case 'Screen':
        return 'icon-screen';
    }
  }

  const handleEntryKeyUpdate = (key, value) => {
    currentEntry = currentEntry || {};
    currentEntry[key] = value;
    setCurrentEntry(currentEntry);
  }

  const onRangeChange = (range, view) => {
    let newRange = range;

    if (Array.isArray(range)) {
      if (range.length === 1) {
        newRange = {
          start: range[0],
          end: new Date((new Date(range[0])).setDate(range[0].getDate() + 1))
        };
      } else {
        const lastDate = range[range.length - 1];
        newRange = {
          start: range[0],
          end: new Date((new Date(lastDate)).setDate(lastDate.getDate() + 1))
        };
      }
    }

    const {
      start,
      end,
      eventableType,
      eventableId,
      showSharedCollectionEntries
    } = CalendarStore.getState();

    if (view) {
      setCurrentView(view);
    }

    if (start <= newRange.start && end >= newRange.end) return;

    const params = {
      ...newRange,
      eventableType,
      eventableId,
      showSharedCollectionEntries
    };

    CalendarActions.setViewParams(params);
  }

  const closeItemEditor = () => {
    setCurrentEntry({});
    setShowTimeSlotEditor(false);
    setCurrentEntryEditable(false);
  }

  const selectEntry = (entry) => {
    if (entry.eventableType) {
      CalendarActions.getEventableUsers({
        eventable_type: entry.eventableType,
        eventable_id: entry.eventableId
      });
    } else {
      CalendarActions.clearEventableUsers();
    }

    setCurrentEntry(entry);
    setShowTimeSlotEditor(true);
    setCurrentEntryEditable(canEditEntry(entry));
  }

  const selectSlotEvent = (entry) => {
    const { eventableType, eventableId } = CalendarStore.getState();

    if (eventableType) {
      CalendarActions.getEventableUsers({
        eventable_type: eventableType,
        eventable_id: eventableId
      });
    } else {
      CalendarActions.clearEventableUsers();
    }

    setCurrentEntry(buildNewEntry(entry));
    setShowTimeSlotEditor(true);
    setCurrentEntryEditable(canEditEntry(entry));
  }

  const saveEntry = () => {
    const { title } = currentEntry;
    if (!title) {
      // eslint-disable-next-line no-alert
      alert('Please enter a title.');
      return;
    }
    if (currentEntry.id) {
      CalendarActions.updateEntry(currentEntry);
    } else {
      CalendarActions.createEntry(currentEntry);
    }
    closeItemEditor();
  }

  const deleteEntry = () => {
    CalendarActions.deleteEntry(currentEntry.id);
    closeItemEditor();
  }

  const closeCalendar = () => {
    setCurrentEntry(null);
    setShowTimeSlotEditor(false);
    setCalendarClosed(true);
    CalendarActions.hideCalendar();
  }

  const filterEntries = (entries, options) => {
    if (options.eventableType) {
      // eventable calendar
      if (showOwnEntries) {
        return entries;
      }

      return entries.filter((e) => (
        e.eventableId === options.eventableId && e.eventableType === options.eventableType
      ));
    }

    // privat calendar
    return entries;
  }

  const filteredEntries = filterEntries(calendarStore.entries, {
    eventableType: calendarStore.eventableType,
    eventableId: calendarStore.eventableId,
    showSharedCollectionEntries: calendarStore.showSharedCollectionEntries
  });

  const toggleEntries = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (calendarStore.eventableType) {
      setShowOwnEntries(!showOwnEntries);
    } else {
      const {
        start,
        end,
        eventableType,
        eventableId
      } = CalendarStore.getState();

      const params = {
        start,
        end,
        eventableType,
        eventableId,
        showSharedCollectionEntries: !calendarStore.showSharedCollectionEntries
      };

      CalendarActions.setViewParams(params);
    }
  }

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setFullscreen(!fullscreen);
  }

  const toggleBackdrop = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setBackdrop(!backdrop);
  }

  const headerDescription = () => {
    if (!calendarStore.eventableType) { return 'Calendar'; }

    return (
      <>
        <i className={`${getEventableIcon(calendarStore.eventableType)} me-2`} />
        {calendarStore.eventableType} - Calendar
      </>
    );
  }

  const modalPropertiesButtons = () => {
    if (smallScreen) { return null; }

    return (
      <>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="toggle-fullscreen">FullScreen</Tooltip>}
        >
          <Button
            variant={fullscreen ? 'success' : 'light'}
            onClick={(e) => { toggleFullscreen(e) }}
          >
            <i className="fa fa-expand" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="toggle-backdrop">Click in background without closing Calendar</Tooltip>}
        >
          <Button
            type="button"
            variant={backdrop ? 'light' : 'info'}
            onClick={(e) => { toggleBackdrop(e) }}
          >
            {backdrop ? <i className="fa fa-unlock" /> : <i className="fa fa-lock" />}
          </Button>
        </OverlayTrigger>
      </>
    );
  }

  const showEntriesButton = () => {
    const tooltip = calendarStore.eventableType ? 'Show my entries' : 'Show shared collection entries';
    const variant = showOwnEntries || calendarStore.showSharedCollectionEntries ? 'success' : 'light';
    const icon = calendarStore.eventableType ? 'fa fa-user-plus' : 'fa fa-files-o';

    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id={tooltip.replace(' ', '-')}>{tooltip}</Tooltip>}
      >
        <Button
          variant={variant}
          onKeyUp={() => {}}
          onClick={(e) => { toggleEntries(e) }}
        >
          <i className={icon} />
        </Button>
      </OverlayTrigger>
    );
  }

  return (
    <Draggable handle=".modal-header" onDrag={handleDrag}>
      <div>
        <Modal
          size="xl"
          show={calendarStore.show}
          onHide={() => closeCalendar()}
          backdrop={backdrop}
          fullscreen={fullscreen}
          className="draggable-modal-dialog calendar"
          dialogClassName="draggable-modal"
          contentClassName="draggable-modal-content calendar"
          data-type="calendar-modal"
          style={{
            transform: `translate(${deltaPosition.x}px, ${deltaPosition.y}px)`,
          }}
        >
     
          <Modal.Header closeButton>
            <Stack direction="horizontal" className="draggable-modal-stack" gap={3}>
              <Modal.Title className="draggable-modal-stack-title">
                {headerDescription()}
              </Modal.Title>
              <ButtonGroup className="ms-5 ms-lg-auto me-lg-5 gap-2">
                {showEntriesButton()}
                {modalPropertiesButtons()}
              </ButtonGroup>
            </Stack>
          </Modal.Header>
        
          <Modal.Body>
            <div className="overflow-y-auto" style={{ height: fullscreen ? '95vh' : '620px' }}>
              <DragAndDropCalendar
                components={{
                  event: CalendarEvent
                }}
                localizer={localizer}
                events={filteredEntries}
                views={AllViews}
                view={currentView || 'month'}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 'inherit' }}
                selectable
                resizable
                onRangeChange={onRangeChange}
                onView={() => {}} // prevent warning message in browser
                onSelectEvent={selectEntry}
                onSelectSlot={selectSlotEvent}
                onEventDrop={onHandleTimeUpdate}
                onEventResize={onHandleTimeUpdate}
                step={15}
                scrollToTime={scrollTime}
                eventPropGetter={(eventStyleGetter)}
                showMultiDayTimes={false}
                formats={formats}
                allDayAccessor={allDayAccessor}
              // enableAutoScroll={true}
              />

              <CalendarEntryEditor
                show={showTimeSlotEditor}
                closeModal={closeItemEditor}
                entry={currentEntry}
                updateEntry={handleEntryKeyUpdate}
                saveEntry={saveEntry}
                deleteEntry={deleteEntry}
                editable={currentEntryEditable}
                onShowLink={() => {
                  //this.onLockBackgroundClose(false);
                  //this.setState({
                  //  startDrag: false,
                  //  partialWindow: true,
                  //  windowPreviewState: WindowPreviewNone,
                  //  windowPreviewStateLast: WindowPreviewLeft,
                  //  windowPreviewArgs: getPreviewStyleArgs(WindowPreviewNone),
                  //  windowStyleArgs: getPreviewStyleArgs(WindowPreviewLeft),
                  //  windowOffsets: { x: 0, y: 0 }
                  //});
                }}
              />
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </Draggable>
  );
};

export default Calendar;
