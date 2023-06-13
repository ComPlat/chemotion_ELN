import React from 'react';
import { Calendar as BaseCalendar, Views, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { OverlayTrigger, Button, Tooltip } from 'react-bootstrap';
import moment from 'moment';

import CalendarStore from 'src/stores/alt/stores/CalendarStore';
import CalendarActions from 'src/stores/alt/actions/CalendarActions';
import CalendarEntryEditor from 'src/components/calendar/CalendarEntryEditor';
import Draggable from 'react-draggable';
import UserStore from 'src/stores/alt/stores/UserStore';
import CalendarEvent, { setCurrentViewForEventRenderer } from 'src/components/calendar/CalendarEvent';

const AllViews = Object.keys(Views).map((k) => Views[k]);
const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(BaseCalendar);

const ModalWidth = 900;
const ModalHeight = 700;
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

// see:
//  https://react-bootstrap-v3.netlify.app/components/modal/
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

function getEventableIcon(type) {
  let icon;

  if (type === 'Sample') {
    icon = 'icon-sample';
  } else if (type === 'Reaction') {
    icon = 'icon-reaction';
  } else if (type === 'Wellplate') {
    icon = 'icon-wellplate';
  } else if (type === 'Research Plan') {
    icon = 'icon-research_plan';
  } else if (type === 'Screen') {
    icon = 'icon-screen';
  }

  return icon;
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

export default class Calendar extends React.Component {
  constructor(props) {
    super(props);
    const scrollTime = new Date();
    scrollTime.setHours(5);
    scrollTime.setMinutes(55);

    this.state = {
      showTimeSlotEditor: false,
      currentEntry: null,
      currentEntryEditable: false,
      bounds: {
        left: 0,
        top: 0,
        bottom: 0,
        right: 0
      },
      backgroundClickToClose: true,
      startDrag: false,
      dragging: false,
      dragDisabled: false,

      windowPreviewState: WindowPreviewNone,
      windowPreviewStateLast: WindowPreviewNone,
      windowPreviewArgs: {},
      windowStyleArgs: {
        width: ModalWidth,
        height: ModalHeight
      },
      windowOffsets: {
        x: 0,
        y: 0
      },
      scrollTime,
      isFullScreen: false,
      showOwnEntries: false,
      currentView: null,
    };
    this.onRangeChange = this.onRangeChange.bind(this);
    this.onChange = this.onChange.bind(this);
    this.closeCalendar = this.closeCalendar.bind(this);
    this.selectEntry = this.selectEntry.bind(this);
    this.selectSlotEvent = this.selectSlotEvent.bind(this);
    this.closeItemEditor = this.closeItemEditor.bind(this);
    this.handleEntryKeyUpdate = this.handleEntryKeyUpdate.bind(this);
    this.saveEntry = this.saveEntry.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.onStartDrag = this.onStartDrag.bind(this);
    this.onClickBackground = this.onClickBackground.bind(this);
    this.onLockBackgroundClose = this.onLockBackgroundClose.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.onFullScreen = this.onFullScreen.bind(this);
    this.onShowOwnEntries = this.onShowOwnEntries.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.onDragStop = this.onDragStop.bind(this);
    this.enableDrag = this.enableDrag.bind(this);
    this.disableDrag = this.disableDrag.bind(this);
    this.draggleHtmlRef = null;
  }

  componentDidMount() {
    CalendarStore.listen(this.onChange);
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    CalendarStore.unlisten(this.onChange);
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize() {
    this.onStartDrag();
  }

  handleEntryKeyUpdate(key, value) {
    let { currentEntry } = this.state;
    currentEntry = currentEntry || {};
    currentEntry[key] = value;
    this.setState({ currentEntry });
  }

  onChange() {
    this.setState(CalendarStore.getState());
  }

  onDragStop(ev) {
    if (!ev.target) return;

    const evType = ev.target.tagName;
    if (evType === 'BUTTON' || evType === 'I') {
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    const { dragging } = this.state;
    if (!dragging) {
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    if (ev.x < DragThreshold) {
      this.setState({
        startDrag: false,
        dragging: false,
        partialWindow: true,
        windowPreviewState: WindowPreviewNone,
        windowPreviewStateLast: WindowPreviewLeft,
        windowPreviewArgs: getPreviewStyleArgs(WindowPreviewNone),
        windowStyleArgs: getPreviewStyleArgs(WindowPreviewLeft),
        windowOffsets: { x: 0, y: 0 }
      });
    } else if (window.document.documentElement.clientWidth - ev.x < DragThreshold) {
      this.setState({
        startDrag: false,
        dragging: false,
        partialWindow: true,
        windowPreviewState: WindowPreviewNone,
        windowPreviewStateLast: WindowPreviewRight,
        windowPreviewArgs: getPreviewStyleArgs(WindowPreviewNone),
        windowStyleArgs: getPreviewStyleArgs(WindowPreviewRight),
        windowOffsets: { x: 0, y: 0 }
      });
    } else if (ev.y < DragThreshold) {
      this.setState({
        startDrag: false,
        dragging: false,
        partialWindow: true,
        windowPreviewState: WindowPreviewNone,
        windowPreviewStateLast: WindowPreviewFullScreen,
        windowPreviewArgs: getPreviewStyleArgs(WindowPreviewNone),
        windowStyleArgs: getPreviewStyleArgs(WindowPreviewFullScreen),
        windowOffsets: { x: 0, y: 0 }
      });
    } else {
      this.setState({
        startDrag: false,
        dragging: false,
        windowPreviewStateLast: WindowPreviewNone,
        windowOffsets: { x: 0, y: 0 }
      });
    }
  }

  onDrag(ev) {
    if (!ev.target) return;

    const evType = ev.target.tagName;
    if (evType === 'BUTTON' || evType === 'I') {
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    const { windowPreviewState, startDrag, dragging } = this.state;
    if (!dragging) {
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    const { clientWidth, clientHeight } = window.document.documentElement;
    const smallScreen = ModalWidth >= clientWidth || ModalHeight >= clientHeight;
    if (smallScreen) return;

    if (ev.x < DragThreshold) {
      if (windowPreviewState !== WindowPreviewLeft) {
        this.setState({
          windowPreviewState: WindowPreviewLeft,
          windowPreviewArgs: getPreviewStyleArgs(WindowPreviewLeft)
        });
      }
    } else if (clientWidth - ev.x < DragThreshold) {
      if (windowPreviewState !== WindowPreviewRight) {
        this.setState({
          windowPreviewState: WindowPreviewRight,
          windowPreviewArgs: getPreviewStyleArgs(WindowPreviewRight)
        });
      }
    } else if (ev.y < DragThreshold) {
      if (windowPreviewState !== WindowPreviewFullScreen) {
        this.setState({
          windowPreviewState: WindowPreviewFullScreen,
          windowPreviewArgs: getPreviewStyleArgs(WindowPreviewFullScreen)
        });
      }
    } else if (windowPreviewState !== WindowPreviewNone) {
      this.setState({
        windowPreviewState: WindowPreviewNone,
        windowPreviewArgs: getPreviewStyleArgs(WindowPreviewNone)
      });
    }

    if (startDrag) {
      this.setState({
        startDrag: false
      });
    }
  }

  onStartDrag(event) {
    if (!event?.target) return;

    const evType = event.target.tagName;
    if (evType === 'BUTTON' || evType === 'I') {
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    this.setState({
      dragging: true,
    });

    if (!this.draggleHtmlRef) {
      this.draggleHtmlRef = document.querySelector('.calendarModal');
    }

    const { clientWidth, clientHeight } = document.documentElement;
    const targetRect = this.draggleHtmlRef.getBoundingClientRect();
    const SmallScreen = ModalWidth >= clientWidth || ModalHeight >= clientHeight;
    const { windowPreviewStateLast } = this.state;

    const hideFactor = 1 / 3;
    const bounds = {
      left: -targetRect.width * (1 - hideFactor),
      right: clientWidth - targetRect.width * hideFactor,
      top: 0,
      bottom: clientHeight - (targetRect.height * hideFactor)
    };

    if (SmallScreen) {
      this.setState({
        partialWindow: false,
        isFullScreen: true,
        bounds,
        windowStyleArgs: {
          width: clientWidth,
          height: clientHeight,
        }
      });
    } else {
      this.setState({
        startDrag: true,
        partialWindow: false,
        isFullScreen: false,
        bounds,
        windowStyleArgs: {
          width: ModalWidth,
          height: ModalHeight,
        },
        windowOffsets: getWindowStyleOffsets(windowPreviewStateLast),
      });
    }
  }

  onClickBackground(ev) {
    const { backgroundClickToClose } = this.state;
    if (backgroundClickToClose) {
      this.closeCalendar();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  onShowOwnEntries(val) {
    this.setState({ showOwnEntries: val });
  }

  onFullScreen(val) {
    if (val) {
      this.setState({
        isFullScreen: true,
        windowStyleArgs: {
          width: window.innerWidth,
          height: window.innerHeight,
          left: 0,
          top: 0,
        },
        windowPreviewStateLast: WindowPreviewFullScreen,
      });
    } else {
      this.setState({
        isFullScreen: false,
        windowStyleArgs: {
          width: ModalWidth,
          height: ModalHeight,
          left: 'initial',
          top: 'initial',
        },
        windowPreviewStateLast: WindowPreviewNone,
      });
    }
  }

  onLockBackgroundClose(val) {
    this.setState({ backgroundClickToClose: val });
  }

  onRangeChange(range, view) {
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
      this.setState({ currentView: view });
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

  enableDrag() {
    this.setState({ dragDisabled: false });
  }

  disableDrag() {
    this.setState({ dragDisabled: true });
  }

  closeItemEditor() {
    this.setState({
      currentEntry: {},
      showTimeSlotEditor: false,
      currentEntryEditable: false,
    });
  }

  selectEntry(entry) {
    if (entry.eventableType) {
      CalendarActions.getEventableUsers({
        eventable_type: entry.eventableType,
        eventable_id: entry.eventableId
      });
    } else {
      CalendarActions.clearEventableUsers();
    }

    this.setState({
      currentEntry: entry,
      showTimeSlotEditor: true,
      currentEntryEditable: canEditEntry(entry)
    });
  }

  selectSlotEvent(entry) {
    const { eventableType, eventableId } = CalendarStore.getState();

    if (eventableType) {
      CalendarActions.getEventableUsers({
        eventable_type: eventableType,
        eventable_id: eventableId
      });
    } else {
      CalendarActions.clearEventableUsers();
    }

    this.setState({
      currentEntry: buildNewEntry(entry),
      showTimeSlotEditor: true,
      currentEntryEditable: canEditEntry(entry)
    });
  }

  saveEntry() {
    const { currentEntry } = this.state;
    if (currentEntry.id) {
      CalendarActions.updateEntry(currentEntry);
    } else {
      CalendarActions.createEntry(currentEntry);
    }
    this.closeItemEditor();
  }

  deleteEntry() {
    const { currentEntry } = this.state;
    CalendarActions.deleteEntry(currentEntry.id);
    this.closeItemEditor();
  }

  closeCalendar() {
    this.setState({
      currentEntry: null,
      showTimeSlotEditor: false
    });

    CalendarActions.hideCalendar();
  }

  filterEntries(entries, options) {
    if (options.eventableType) {
      // eventable calendar
      const { showOwnEntries } = this.state;
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

  render() {
    const {
      show,
      entries,
      eventableType,
      eventableId,
      showSharedCollectionEntries
    } = CalendarStore.getState();
    const {
      showTimeSlotEditor,
      currentEntry,
      currentEntryEditable,
      bounds,
      showOwnEntries,
      backgroundClickToClose,
      isFullScreen,
      partialWindow,
      windowPreviewArgs,
      windowStyleArgs,
      windowOffsets,
      startDrag,
      dragDisabled,
      windowPreviewState,
      scrollTime,
      currentView
    } = this.state;
    const { currentUser } = UserStore.getState();
    const { clientWidth, clientHeight } = window.document.documentElement;
    const smallScreen = ModalWidth >= clientWidth || ModalHeight >= clientHeight;
    const defaultPosition = {
      x: (clientWidth - ModalWidth) / 2,
      y: (clientHeight - ModalHeight) / 2
    };

    currentUserId = currentUser?.id;

    const filteredEntries = this.filterEntries(entries, {
      eventableType,
      eventableId,
      showSharedCollectionEntries
    });

    if (show && !currentView) {
      setTimeout(() => {
        this.setState({ currentView: 'week' });
      }, 10);
    }

    setCurrentViewForEventRenderer(currentView);
    let dragPosition = null;
    if (smallScreen || isFullScreen) {
      dragPosition = { x: 0, y: 0 };
    } else if ((partialWindow || startDrag)) {
      dragPosition = windowOffsets;
    }

    function headerDescription() {
      return ` ${eventableType} - Calendar`;
    }

    return (
      <div
        role="button"
        tabIndex="-1"
        onKeyUp={() => { }}
        onClick={this.onClickBackground}
        className="calendarModalBackground"
        style={{
          display: show ? 'initial' : 'none',
          pointerEvents: backgroundClickToClose ? 'initial' : 'none',
          backgroundColor: backgroundClickToClose ? '#50505050' : 'transparent'
        }}
      >
        <div
          className="calendarDragPreview"
          style={{
            ...windowPreviewArgs,
            opacity: (windowPreviewState === WindowPreviewNone ? 0 : 1)
          }}
        />
        <Draggable
          handle=".handle"
          bounds={bounds}
          disabled={smallScreen || dragDisabled}
          defaultPosition={defaultPosition}
          position={dragPosition}
          onStart={this.onStartDrag}
          onDrag={this.onDrag}
          onStop={this.onDragStop}
        >
          <div
            role="button"
            tabIndex="0"
            onKeyUp={() => { }}
            onKeyDown={() => { }}
            style={windowStyleArgs}
            className="calendarModal"
            onClick={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
            }}
          >
            <div className="calendarHeader handle">
              <header>
                { eventableType ? (
                  <span>
                    <i className={getEventableIcon(eventableType)} />
                    {headerDescription()}
                  </span>
                ) : 'Calendar' }
              </header>
              <div className="calendarHeaderActions">
                { eventableType ? (
                  <OverlayTrigger placement="bottom" overlay={<Tooltip id="showMyEntries">Show my entries</Tooltip>}>
                    <Button
                      bsSize="small"
                      type="button"
                      bsStyle={showOwnEntries ? 'success' : 'default'}
                      onKeyUp={() => { }}
                      onMouseEnter={this.disableDrag}
                      onMouseLeave={this.enableDrag}
                      onClick={(e) => {
                        this.onShowOwnEntries(!showOwnEntries);
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <i className="fa fa-user-plus" />
                      &nbsp;
                    </Button>
                  </OverlayTrigger>
                ) : (
                  <OverlayTrigger placement="bottom" overlay={<Tooltip id="showSharedCollectionEntries">Show shared collection entries</Tooltip>}>
                    <Button
                      bsSize="small"
                      type="button"
                      bsStyle={showSharedCollectionEntries ? 'success' : 'default'}
                      onMouseEnter={this.disableDrag}
                      onMouseLeave={this.enableDrag}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onSwitchShowSharedCollectionEntries(!showSharedCollectionEntries);
                      }}
                    >
                      <i className="fa fa-files-o" />
                      &nbsp;
                    </Button>
                  </OverlayTrigger>
                )}
                { smallScreen ? null : (
                  <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullscreenCalendar">FullScreen</Tooltip>}>
                    <Button
                      bsSize="small"
                      type="button"
                      bsStyle={isFullScreen ? 'success' : 'default'}
                      onMouseEnter={this.disableDrag}
                      onMouseLeave={this.enableDrag}
                      onClick={(e) => {
                        this.onFullScreen(!isFullScreen);
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <i className="fa fa-expand" />
                      &nbsp;
                    </Button>
                  </OverlayTrigger>
                )}
                { smallScreen ? null : (
                  <OverlayTrigger placement="bottom" overlay={<Tooltip id="calendarBackgroundClickDescription">Click in background without closing Calendar</Tooltip>}>
                    <Button
                      bsSize="small"
                      type="button"
                      bsStyle={backgroundClickToClose ? 'default' : 'info'}
                      onMouseEnter={this.disableDrag}
                      onMouseLeave={this.enableDrag}
                      onClick={(e) => {
                        this.onLockBackgroundClose(!backgroundClickToClose);
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      { backgroundClickToClose ? <i className="fa fa-unlock" /> : <i className="fa fa-lock" /> }
                      &nbsp;
                    </Button>
                  </OverlayTrigger>
                )}
                <OverlayTrigger placement="bottom" overlay={<Tooltip id="closeCalendarButtonDescription">Close Calendar</Tooltip>}>
                  <Button bsSize="small" type="button" bsStyle="danger" onClick={this.closeCalendar}>
                    <i className="fa fa-close" />
                    &nbsp;
                  </Button>
                </OverlayTrigger>
              </div>

            </div>
            <div className="calendarBody">
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
                className="calendar"
                selectable
                resizable
                onRangeChange={this.onRangeChange}
                onView={() => { }} // prevent warning message in browser
                onSelectEvent={this.selectEntry}
                onSelectSlot={this.selectSlotEvent}
                onEventDrop={onHandleTimeUpdate}
                onEventResize={onHandleTimeUpdate}
                step={15}
                scrollToTime={scrollTime}
                eventPropGetter={(eventStyleGetter)}
                showMultiDayTimes={false}
                // enableAutoScroll={true}
              />

              <CalendarEntryEditor
                show={showTimeSlotEditor}
                closeModal={this.closeItemEditor}
                entry={currentEntry}
                updateEntry={this.handleEntryKeyUpdate}
                saveEntry={this.saveEntry}
                deleteEntry={this.deleteEntry}
                editable={currentEntryEditable}
                onShowLink={() => {
                  this.onLockBackgroundClose(false);
                  this.setState({
                    startDrag: false,
                    partialWindow: true,
                    windowPreviewState: WindowPreviewNone,
                    windowPreviewStateLast: WindowPreviewLeft,
                    windowPreviewArgs: getPreviewStyleArgs(WindowPreviewNone),
                    windowStyleArgs: getPreviewStyleArgs(WindowPreviewLeft),
                    windowOffsets: { x: 0, y: 0 }
                  });
                }}
              />
            </div>
          </div>
        </Draggable>
      </div>
    );
  }
}
