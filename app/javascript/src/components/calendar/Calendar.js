import React, { useContext, useEffect } from 'react';
import { Calendar as BaseCalendar, Views, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { OverlayTrigger, Button, ButtonGroup, Tooltip, Modal, Stack } from 'react-bootstrap';
import Draggable from "react-draggable";
import moment from 'moment';

import CalendarEntryEditor from 'src/components/calendar/CalendarEntryEditor';
import CalendarEvent from 'src/components/calendar/CalendarEvent';
import UserStore from 'src/stores/alt/stores/UserStore';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

// see:
//  https://jquense.github.io/react-big-calendar/examples/?path=/docs/props-full-prop-list--page

const AllViews = Object.keys(Views).map((k) => Views[k]);

const formats = {
  agendaHeaderFormat: ({ start, end }, culture, localizer) =>
    `${localizer.format(start, 'DD MMMM', culture)} - ${localizer.format(end, 'DD MMMM YYYY', culture)}`,
  agendaDateFormat: 'ddd DD MMMM YYYY',
  dayFormat: 'dddd DD',
  dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
    `${localizer.format(start, 'DD MMMM', culture)} - ${localizer.format(end, 'DD MMMM YYYY', culture)}`,
  monthHeaderFormat: 'MMMM YYYY',
  dayHeaderFormat: 'dddd DD MMMM YYYY',
  weekdayFormat: 'dddd',
};

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(BaseCalendar);

const allDayAccessor = (event) => {
  if ((event.start && event.start.getHours() === 0 && event.start.getMinutes() === 0)
    && (event.end && event.end.getHours() === 0 && event.end.getMinutes() === 0) &&
    moment(event.start).format() !== moment(event.end).format()) {
    return true;
  }
  return false;
};

const Calendar = () => {
  const calendarStore = useContext(StoreContext).calendar;

  const { currentUser } = UserStore.getState();
  let currentUserId = currentUser?.id;

  const ColorCache = {};

  const { clientWidth, clientHeight } = window.document.documentElement;
  let modalDimensions = { width: 1140, height: 620 }
  let smallScreen = modalDimensions.width >= clientWidth || modalDimensions.height >= clientHeight;
  const calendarHeight = calendarStore.fullscreen || calendarStore.show_detail ? '95vh' : '620px';
  const calendarClass = calendarStore.show_detail ? 'show-detail' : (calendarStore.fullscreen ? 'fullscreen' : '');

  const scrollTime = new Date();
  scrollTime.setHours(5);
  scrollTime.setMinutes(55);

  const handleResize = () => {
    const { clientWidth, clientHeight } = window.document.documentElement;
    const modal = document.querySelector('[data-type="calendar-modal"]');
    if (!modal) { return null; }

    modalDimensions = modal.getBoundingClientRect();

    calendarStore.changeModalDimension({
      width: modalDimensions.width,
      height: modalDimensions.height
    });
    calendarStore.changeDeltaPosition({
      x: (clientWidth - modalDimensions.width) / 2,
      y: (clientHeight - modalDimensions.height) / 2
    });
    smallScreen = modalDimensions.width >= clientWidth || modalDimensions.height >= clientHeight;    
  }

  const resizeEditor = () => {
    const modalEditor = document.querySelector('[data-type="calendar-editor"]');
    if (!modalEditor) { return null; }

    const editorDimensions = modalEditor.getBoundingClientRect();
    calendarStore.changeDeltaPositionEditor({
      x: ((calendarStore.modal_dimension.width - editorDimensions.width) / 2) + calendarStore.delta_position.x,
      y: ((calendarStore.modal_dimension.height - editorDimensions.height) / 2) + calendarStore.delta_position.y,
    });
  }

  useEffect(() => {
    if (calendarStore.show_calendar) {
      window.addEventListener('resize', handleResize);
      handleResize();
    } else {
      window.removeEventListener('resize', handleResize);
    }
  }, [calendarStore.show_calendar]);

  useEffect(() => {
    if (calendarStore.fullscreen) {
      calendarStore.changeDeltaPosition({ x: 0, y: 0 });
      calendarStore.changeModalDimension({ width: clientWidth, height: clientHeight });
      resizeEditor();
    } else {
      handleResize();
      resizeEditor();
    }
  }, [calendarStore.fullscreen]);

  const handleDrag = (e, ui) => {
    const { x, y } = calendarStore.delta_position;
    calendarStore.changeDeltaPosition({
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
        return 'icon-research_plan';
      case 'Screen':
        return 'icon-screen';
      case 'DeviceDescription':
        return 'icon-device_description';
      case 'SequenceBasedMacromoleculeSample':
        return 'icon-sequence_based_macromolecule-sample';
    }
  }

  const idToColorComponent = (id) => {
    return (50 + (id % 19) * 10);
  }

  const getRed = (id) => {
    return `rgb(${idToColorComponent(id)},0,0)`;
  }

  const getGreen = (id) => {
    return `rgb(0,${idToColorComponent(id)},0)`;
  }

  const getRedGreen = (id) => {
    const tmp = idToColorComponent(id);
    return `rgb(${tmp},${tmp},0)`;
  }

  const getRedBlue = (id) => {
    const tmp = idToColorComponent(id);
    return `rgb(${tmp},0,${tmp})`;
  }

  const getGreenBlue = (id) => {
    const tmp = idToColorComponent(id);
    return `rgb(0,${tmp},${tmp})`;
  }

  const getEntryColor = (entry) => {
    let color;

    if (entry.eventable_type) {
      color = ColorCache[entry.eventable_id];
      if (!color) {
        if (entry.eventable_type === 'Sample') {
          color = getRed(entry.eventable_id);
        } else if (entry.eventable_type === 'Reaction') {
          color = getGreen(entry.eventable_id);
        } else if (entry.eventable_type === 'ResearchPlan') {
          color = getGreenBlue(entry.eventable_id);
        } else if (entry.eventable_type === 'Screen') {
          color = getRedGreen(entry.eventable_id);
        } else if (entry.eventable_type === 'Element') {
          color = getRedBlue(entry.eventable_id);
        }
        ColorCache[entry.eventable_id] = color;
      }
    } else {
      color = 'var(--bs-primary)'; // getRandomBlue();
    }
    return color;
  }

  const getEntryOpacity = (entry, userId) => {
    return entry.created_by === userId ? 1 : 0.5;
  }

  const eventStyleGetter = (event) => {
    const style = {
      backgroundColor: getEntryColor(event),
      opacity: getEntryOpacity(event, currentUserId),
    };
    return { style };
  }

  const onHandleTimeUpdate = (event) => {
    const entry = { ...event.event };
    if (!entry || !calendarStore.canEditEntry(entry)) { return; }

    entry.start = event.start;
    entry.end = event.end;

    calendarStore.updateEntry(entry);
  }

  const selectEntry = (entry) => {
    calendarStore.getOrClearCollectionUsers(entry.eventable_type, entry.eventable_id);
    calendarStore.setEditorValues(entry);
    resizeEditor();
  }

  const selectSlotEvent = (entry) => {
    calendarStore.getOrClearCollectionUsers(calendarStore.eventable_type, calendarStore.eventable_id);
    calendarStore.setEditorValues(calendarStore.buildNewEntry(entry));
    resizeEditor();
  }

  const filteredEntries = (entries) => {
    if (!calendarStore.eventable_type || calendarStore.show_own_entries) { return entries; }

    return entries.filter((e) => (
      e.eventable_id === calendarStore.eventable_id && e.eventable_type === calendarStore.eventable_type
    ));
  }

  const headerDescription = () => {
    if (!calendarStore.eventable_type) { return 'Calendar'; }

    return (
      <>
        <i className={`${getEventableIcon(calendarStore.eventable_type)} me-2`} />
        {calendarStore.eventable_type} - Calendar
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
            variant={calendarStore.fullscreen ? 'success' : 'light'}
            onClick={(e) => { calendarStore.toggleFullScreen(e) }}
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
            variant={calendarStore.backdrop ? 'light' : 'info'}
            onClick={(e) => { calendarStore.toggleBackdrop(e) }}
          >
            {calendarStore.backdrop ? <i className="fa fa-unlock" /> : <i className="fa fa-lock" />}
          </Button>
        </OverlayTrigger>
      </>
    );
  }

  const variantForEntriesButton = () => {
    let variant = 'light';
    if ((calendarStore.show_own_entries && calendarStore.eventable_type) ||
      (calendarStore.show_shared_collection_entries && !calendarStore.eventable_type)) {
      variant = 'success'
    }
    return variant;
  }

  const showEntriesButton = () => {
    const tooltip = calendarStore.eventable_type ? 'Show my entries' : 'Show shared collection entries';
    const icon = calendarStore.eventable_type ? 'fa fa-user-plus' : 'fa fa-files-o';

    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id={tooltip.replace(' ', '-')}>{tooltip}</Tooltip>}
      >
        <Button
          variant={variantForEntriesButton()}
          onKeyUp={() => {}}
          onClick={(e) => { calendarStore.toggleEntries(e) }}
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
          show={calendarStore.show_calendar}
          onHide={() => calendarStore.closeCalendar()}
          backdrop={calendarStore.backdrop}
          fullscreen={calendarStore.fullscreen}
          className={`draggable-modal-dialog calendar ${calendarClass}`}
          dialogClassName="draggable-modal"
          contentClassName="draggable-modal-content calendar"
          data-type="calendar-modal"
          style={{
            transform: `translate(${calendarStore.delta_position.x}px, ${calendarStore.delta_position.y}px)`,
          }}
        >
     
          <Modal.Header className="py-3 border-bottom border-gray-600 bg-gray-300" closeButton>
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
            <div className="overflow-y-auto" style={{ height: calendarHeight }}>
              <DragAndDropCalendar
                components={{ event: CalendarEvent }}
                localizer={localizer}
                events={filteredEntries(calendarStore.calendarEntries)}
                views={AllViews}
                view={calendarStore.current_view || 'month'}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 'inherit' }}
                selectable
                resizable
                onRangeChange={calendarStore.onRangeChange}
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
              />
              <CalendarEntryEditor entry={calendarStore.current_entry} resizeEditor={resizeEditor} />
            </div>
          </Modal.Body>
        </Modal>
      </div>
    </Draggable>
  );
};

export default observer(Calendar);
