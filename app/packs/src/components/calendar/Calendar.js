import React from 'react';
import { Calendar as BaseCalendar, Views, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { OverlayTrigger, Button, Tooltip } from 'react-bootstrap';
import moment from 'moment';

import CalendarStore from 'src/stores/alt/stores/CalendarStore';
import CalendarActions from 'src/stores/alt/actions/CalendarActions';
import CalendarEntryEditor from 'src/components/calendar/CalendarEntryEditor';
import Draggable from 'react-draggable';
import UserStore from 'src/stores/alt/stores/UserStore';
import CalendarEvent, { setCurentViewForEventRenderer } from "./CalendarEvent";

const AllViews = Object.keys(Views).map((k) => Views[k])
const localizer = momentLocalizer(moment)
const DragAndDropCalendar = withDragAndDrop(BaseCalendar);

const ModalWidth = 900;
const ModalHeight = 700;
const ColorCache = {};
const DragTreshHold = 25;

let currentEventableType, currentEventableId, currentUserId; // cached vars

const WindowPreviewNone = 0;
const WindowPreviewRight = 1;
const WindowPreviewLeft = 2;
const WindowPreviewFullScreen = 3;

function getPreviewStyleArgs(state) {
  switch(state) {
    case WindowPreviewNone:
      return {
        width: 0,
        height: 0,
        left: window.innerWidth/2,
        top: window.innerHeight/2
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
  }
}

function getWindowStyleOffsets(state) {
  switch(state) {
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
  }
}

// see:
//  https://react-bootstrap-v3.netlify.app/components/modal/
//  https://jquense.github.io/react-big-calendar/examples/?path=/docs/props-full-prop-list--page


function idToColorComponent(id) {
  return (50 + (id % 19) * 10);
}

function getRed(id){
  return "rgb(" + idToColorComponent(id) + ",0,0)";
}
function getGreen(id){
  return "rgb(0," + idToColorComponent(id) + ",0)";
}
function getBlue(id){
  return "rgb(0,0," + idToColorComponent(id) + ")";
}
function getRedGreen(id){
  let tmp = idToColorComponent(id);
  return "rgb(" + tmp + "," + tmp + ",0)";
}
function getRedBlue(id){
  let tmp = idToColorComponent(id);
  return "rgb(" + tmp + ",0," + tmp + ")";
}
function getGreenBlue(id){
  let tmp = idToColorComponent(id);
  return "rgb(0," + tmp + "," + tmp + ")";
}

function getEntryColor(entry){
  let color;

  if(entry.eventable_type) {
    color = ColorCache[entry.eventable_id];
    if (!color) {
      if(entry.eventable_type == "Sample") {
        color = getRed(entry.eventable_id);
      } else if (entry.eventable_type == "Reaction") {
        color = getGreen(entry.eventable_id);
      } else if (entry.eventable_type == "ResearchPlan") {
        color = getGreenBlue(entry.eventable_id);
      } else if (entry.eventable_type == "Screen") {
        color = getRedGreen(entry.eventable_id);
      } else if (entry.eventable_type == "Element") {
        color = getRedBlue(entry.eventable_id);
      }
      ColorCache[entry.eventable_id] = color;
    }
  } else {
    color = "#265985"; // getRandomBlue();
  }
  return color;
}


function getEntryOpacity(entry, current_user_id, eventable_id, eventable_type) {
  return entry.created_by == current_user_id ? 1 : 0.3;
}

export default class Calendar extends React.Component {
  constructor(props) {
    super(props);
    let scrollTime = new Date();
    scrollTime.setHours(5);
    scrollTime.setMinutes(55);

    this.state = {
      showTimeslotEditor: false,
      currentEntry: null,
      currentEntryEditable: false,
      bounds: { left: 0, top: 0, bottom: 0, right: 0 },
      startPosition: { x: 0, y: 0 },
      backgroundClickToClose: true,

      // calendarDragPreviewViewStyleArgs: {x: 0, y: 0, width: 0, height: 0 },

      startDrag: false,
      windowPreviewState: WindowPreviewNone,
      windowPreviewStateLast: WindowPreviewNone,
      windowPreviewArgs: {},
      windowStyleArgs: { width: ModalWidth, height: ModalHeight },
      windowOffsets: { x: 0, y: 0 },
      scrollTime: scrollTime,

      isFullScreen: false,
      showOwnEntries: false,
      currentView: null
    }
    this.onRangeChange = this.onRangeChange.bind(this);
    this.onChange = this.onChange.bind(this);
    this.closeCalendar = this.closeCalendar.bind(this);
    this.selectEntry = this.selectEntry.bind(this);
    this.selectSlotEvent = this.selectSlotEvent.bind(this);
    this.closeItemEditor = this.closeItemEditor.bind(this);
    this.handleEntryKeyUpdate = this.handleEntryKeyUpdate.bind(this);
    this.onHandleTimeUpdate = this.onHandleTimeUpdate.bind(this);
    this.saveEntry = this.saveEntry.bind(this);
    this.deleteEntry = this.deleteEntry.bind(this);
    this.onStartDrag = this.onStartDrag.bind(this);
    this.onClickBackground = this.onClickBackground.bind(this);
    this.onLockBackgroundClose = this.onLockBackgroundClose.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.onFullScreen = this.onFullScreen.bind(this);
    this.onShowOwnEntries = this.onShowOwnEntries.bind(this);
    this.onSwitchShowSharedCollectionEntries = this.onSwitchShowSharedCollectionEntries.bind(this);
    this.onDrag = this.onDrag.bind(this);
    this.onDragStop = this.onDragStop.bind(this);

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

  onChange() {
    this.setState(CalendarStore.getState());
  }

  canEditEntry(entry) {
    const currentUser = UserStore.getState().currentUser;
    return !entry.created_by || entry.created_by == currentUser.id;
  }

  buildNewEntry(entry) {
    const { eventable_type, eventable_id } = CalendarStore.getState();

    entry["title"] = "";
    entry["description"] = "";
    entry["kind"] = "";
    entry["eventable_id"] = eventable_id;
    entry["eventable_type"] = eventable_type;
    entry["accessible"] = true;

    return entry;
  }

  closeItemEditor() {
    this.setState({
      currentEntry: {},
      showTimeslotEditor: false,
      currentEntryEditable: false,
    });
  }

  selectEntry(entry) {
    if (entry.eventable_type) {
      CalendarActions.getEventableUsers({
        eventable_type: entry.eventable_type,
        eventable_id: entry.eventable_id
      });
    } else {
      CalendarActions.clearEventableUsers();
    }

    this.setState({
      currentEntry: entry,
      showTimeslotEditor: true,
      currentEntryEditable: this.canEditEntry(entry)
    });
  }

  selectSlotEvent(entry) {
    let { eventable_type, eventable_id } = CalendarStore.getState()

    if (eventable_type) {
      CalendarActions.getEventableUsers({ eventable_type, eventable_id });
    } else {
      CalendarActions.clearEventableUsers();
    }

    this.setState({
      currentEntry: this.buildNewEntry(entry),
      showTimeslotEditor: true,
      currentEntryEditable: this.canEditEntry(entry)
    });
  }

  handleEntryKeyUpdate(key, value) {
    let entry = this.state.currentEntry || {};
    entry[key] = value;
    this.setState({ entry });
  }

  onHandleTimeUpdate(ev) {
    let entry = ev.event;
    if(!entry || !this.canEditEntry(entry)) return;

    entry.start = ev.start;
    entry.end = ev.end;

    CalendarActions.updateEntry(entry);
  }

  saveEntry() {
    if(this.state.currentEntry.id)
      CalendarActions.updateEntry(this.state.currentEntry);
    else
      CalendarActions.createEntry(this.state.currentEntry);
    this.closeItemEditor();
  }

  deleteEntry() {
    CalendarActions.deleteEntry(this.state.currentEntry.id);
    this.closeItemEditor();
  }

  closeCalendar() {
    this.setState({
      currentEntry: null,
      showTimeslotEditor: false
    });

    CalendarActions.hideCalendar();
  }

  onSwitchShowSharedCollectionEntries(val) {
    const { start, end, eventable_type, eventable_id } = CalendarStore.getState();

    let params = {
      start,
      end,
      eventable_type,
      eventable_id,
      showSharedCollectionEntries: val
    }

    CalendarActions.setViewParams(params);
  }

  onRangeChange(range, view) {
    if(Array.isArray(range)) {
      if(range.length == 1) {
        range = { start: range[0], end: new Date((new Date(range[0])).setDate(range[0].getDate() + 1))}
      } else {
        let lastDate = range[range.length - 1]
        range = { start: range[0], end: new Date((new Date(lastDate)).setDate(lastDate.getDate() + 1))}
      }
    }

    const { start, end, eventable_type, eventable_id, showSharedCollectionEntries } = CalendarStore.getState();

    if(view) {
      this.setState({ currentView: view });
    }

    if(start <= range.start && end >= range.end) return

    let params = {
      ...range,
      eventable_type,
      eventable_id,
      showSharedCollectionEntries
    }


    CalendarActions.setViewParams(params);
  }

  eventStyleGetter(event, start, end, isSelected) {
    var style = {
      backgroundColor: getEntryColor(event),
      opacity: getEntryOpacity(event, currentUserId, currentEventableId, currentEventableType),
    };
    return { style };
  }

  onLockBackgroundClose(val) {
    this.setState({ backgroundClickToClose: val });
  }

  onFullScreen(val) {
    if(val) {
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
          left: "initial",
          top: "initial",
        } ,
        windowPreviewStateLast: WindowPreviewNone,
      });
    }
  }

  onShowOwnEntries(val) {
    this.setState({ showOwnEntries: val });
  }

  onClickBackground(ev) {
    console.log(ev)
    if(this.state.backgroundClickToClose) {
      this.closeCalendar();
      ev.stopPropagation();
      ev.preventDefault();
    }
  }

  handleResize() {
    this.onStartDrag();
  }

  getEventableIcon(type) {
    if(type === "Sample") {
      return "icon-sample";
    } else if(type == "Reaction") {
      return "icon-reaction";
    } else if(type == "Wellplate") {
      return "icon-wellplate";
    } else if(type == "Research Plan") {
      return "icon-research_plan";
    } else if(type == "Screen") {
      return "icon-screen";
    } else {
    }
  }

  filterEntries(entries, options) {
    if(options.eventable_type) {
      // eventable calendar
      if(this.state.showOwnEntries) {
        return entries;
      } else {
        return entries.filter(e => (e.eventable_id === options.eventable_id && e.eventable_type === options.eventable_type));
      }
    } else {
      // privat calendar
      return entries;
    }
  }

  onStartDrag(event, ui) {
    if(!event?.target) return;

    var evType = event.target.tagName;
    if(evType === "BUTTON" || evType === "I") {
      event.stopPropagation();
      event.preventDefault();
      return;
    }

    if(!this.draggleHtmlRef)
      this.draggleHtmlRef = document.querySelector(".calendarModal");

    const { clientWidth, clientHeight } = window?.document?.documentElement;
    const targetRect = this.draggleHtmlRef.getBoundingClientRect();
    const SmallScreen = ModalWidth >= clientWidth || ModalHeight >= clientHeight;

    const hideFactor = 1/3;
    const bounds = {
      left: -targetRect.width * (1-hideFactor),
      right: clientWidth - targetRect.width * hideFactor,
      top: 0,
      bottom: clientHeight - (targetRect.height * hideFactor)
    };

    if(SmallScreen) {
      this.setState({
        partialWindow: false,
        isFullScreen: true,
        bounds,
        windowStyleArgs: {
          width: clientWidth,
          height: clientHeight,
        }
      });
    }  else {
      this.setState({
        startDrag: true,
        partialWindow: false,
        isFullScreen: false,
        bounds,
        windowStyleArgs: {
          width: ModalWidth,
          height: ModalHeight,
        },
        windowOffsets: getWindowStyleOffsets(this.state.windowPreviewStateLast),
      });
    }
  }

  onDrag(ev) {
    if(!ev.target) return;

    var evType = ev.target.tagName;
    if(evType === "BUTTON" || evType === "I") {
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    const { clientWidth, clientHeight } = window.document.documentElement;
    const smallScreen = ModalWidth >= clientWidth || ModalHeight >= clientHeight;
    if(smallScreen) return;

    if(ev.x < DragTreshHold) {
      if(this.state.windowPreviewState != WindowPreviewLeft) {
        console.log(getPreviewStyleArgs(WindowPreviewLeft) )
        this.setState({
          windowPreviewState: WindowPreviewLeft,
          windowPreviewArgs: getPreviewStyleArgs(WindowPreviewLeft)
        });
      }
    } else if(clientWidth - ev.x < DragTreshHold) {
      if(this.state.windowPreviewState != WindowPreviewRight) {
        this.setState({
          windowPreviewState: WindowPreviewRight,
          windowPreviewArgs: getPreviewStyleArgs(WindowPreviewRight)
        });
      }
    } else if(ev.y < DragTreshHold) {
      if(this.state.windowPreviewState != WindowPreviewFullScreen) {
        this.setState({
          windowPreviewState: WindowPreviewFullScreen,
          windowPreviewArgs: getPreviewStyleArgs(WindowPreviewFullScreen)
        });
      }
    } else {
      if(this.state.windowPreviewState != WindowPreviewNone) {
        this.setState({
          windowPreviewState: WindowPreviewNone,
          windowPreviewArgs: getPreviewStyleArgs(WindowPreviewNone)
        });
      }
    }

    if(this.state.startDrag) {
      this.setState({
        startDrag: false
      })
    }
  }

  onDragStop(ev) {
    if(!ev.target) return;

    var evType = ev.target.tagName;
    if(evType === "BUTTON" || evType === "I") {
      ev.stopPropagation();
      ev.preventDefault();
      return;
    }

    if(ev.x < DragTreshHold) {
      this.setState({
        startDrag: false,
        partialWindow: true,
        windowPreviewState: WindowPreviewNone,
        windowPreviewStateLast: WindowPreviewLeft,
        windowPreviewArgs: getPreviewStyleArgs(WindowPreviewNone),
        windowStyleArgs: getPreviewStyleArgs(WindowPreviewLeft),
        windowOffsets: { x: 0, y: 0 }
      });
    } else if(window.document.documentElement.clientWidth - ev.x < DragTreshHold) {
      this.setState({
        startDrag: false,
        partialWindow: true,
        windowPreviewState: WindowPreviewNone,
        windowPreviewStateLast: WindowPreviewRight,
        windowPreviewArgs: getPreviewStyleArgs(WindowPreviewNone),
        windowStyleArgs: getPreviewStyleArgs(WindowPreviewRight),
        windowOffsets: { x: 0, y: 0 }
      });
    } else if(ev.y < DragTreshHold) {
      this.setState({
        startDrag: false,
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
        windowPreviewStateLast: WindowPreviewNone,
        windowOffsets: { x: 0, y: 0 }
      })
    }
  }


  render() {
    const { show, entries, eventable_type, eventable_id, showSharedCollectionEntries } = CalendarStore.getState();
    const {
      showTimeslotEditor,
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
      windowPreviewState,
      scrollTime,
      currentView
    } = this.state;
    const currentUser = UserStore.getState().currentUser;
    const { clientWidth, clientHeight } = window.document.documentElement;
    var smallScreen = ModalWidth >= clientWidth || ModalHeight >= clientHeight;

    var defaultPosition = {x: (clientWidth - ModalWidth)/2, y: (clientHeight - ModalHeight)/2};

    currentEventableType = eventable_type;
    currentEventableId = eventable_id;
    currentUserId = currentUser?.id;

    let filteredEntries = this.filterEntries(entries, { eventable_type, eventable_id, showSharedCollectionEntries });

    if(show && !currentView) {
      setTimeout(() => {
        this.setState({currentView: "week"})
      }, 10)
    }

    setCurentViewForEventRenderer(currentView);

    return(
      <div
        className="calendarModalBackground"
        style={{
          display: show ? "initial" : "none",
          pointerEvents: this.state.backgroundClickToClose ? "initial" : "none",
          backgroundColor: this.state.backgroundClickToClose ? "#50505050" : "transparent"
        }}
        onClick={this.onClickBackground}
      >
        <div
            className="calendarDragPreview"
            style={{
              ...windowPreviewArgs,
              opacity: (windowPreviewState === WindowPreviewNone ? 0 : 1)
            }}>
        </div>
        <Draggable
          handle=".handle"
          bounds={bounds}
          disabled={smallScreen}
          defaultPosition={defaultPosition}
          position={(smallScreen || isFullScreen) ? {x: 0, y: 0} : ((partialWindow || startDrag) ? windowOffsets : null)}
          onStart={this.onStartDrag}
          onDrag={this.onDrag}
          onStop={this.onDragStop}
        >
          <div
            style={windowStyleArgs}
            autoFocus={true}
            className="calendarModal"
            onClick={(ev) => {
              ev.stopPropagation();
              ev.preventDefault();
            }}
          >
            <div className='calendarHeader handle'>
              <header>
                { eventable_type ? <span><i className={this.getEventableIcon(eventable_type)}/> {eventable_type} - Calendar</span> : "Calendar" }
              </header>
              <div className="calendarHeaderActions">

                { eventable_type ?
                  <OverlayTrigger placement="bottom" overlay={<Tooltip id="showMyEntries">Show my entries</Tooltip>}>
                    <Button bsSize="small" type="button" bsStyle={showOwnEntries ? "success": "default"}
                        onClick={(e) => {
                          this.onShowOwnEntries(!showOwnEntries);
                          e.stopPropagation();
                          e.preventDefault();
                        }}

                    >
                      <i className="fa fa-user-plus" />&nbsp;
                    </Button>
                  </OverlayTrigger> :
                  <OverlayTrigger placement="bottom" overlay={<Tooltip id="showSharedCollectionEntries">Show shared collection entries</Tooltip>}>
                    <Button bsSize="small" type="button" bsStyle={showSharedCollectionEntries ? "success": "default"} onClick={(e) => {
                        this.onSwitchShowSharedCollectionEntries(!showSharedCollectionEntries);
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <i className="fa fa-files-o" />&nbsp;
                    </Button>
                  </OverlayTrigger>
                }
                { smallScreen ? null :
                  <OverlayTrigger placement="bottom" overlay={<Tooltip id="fullscreenCalendar">FullScreen</Tooltip>}>
                    <Button bsSize="small" type="button" bsStyle={isFullScreen ? "success": "default"} onClick={(e)=>{
                        this.onFullScreen(!isFullScreen);
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <i className="fa fa-expand" />&nbsp;
                    </Button>
                  </OverlayTrigger>
                }
                { smallScreen ? null :
                  <OverlayTrigger placement="bottom" overlay={<Tooltip id="prefCloseClendarBtn">Click in background without closing Calendar</Tooltip>}>
                    <Button
                        bsSize="small"
                        type="button"
                        bsStyle={backgroundClickToClose ? "default" : "info"}
                        onClick={(e)=>{
                          this.onLockBackgroundClose(!backgroundClickToClose);
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        >
                      { backgroundClickToClose ? <i className="fa fa-unlock"/>: <i className="fa fa-lock"/> }
                      &nbsp;
                    </Button>
                  </OverlayTrigger>
                }
                <OverlayTrigger placement="bottom" overlay={<Tooltip id="closeClendarBtn">Close Calendar</Tooltip>}>
                  <Button bsSize="small" type="button" bsStyle="danger" onClick={this.closeCalendar} >
                    <i className="fa fa-close" />&nbsp;
                  </Button>
                </OverlayTrigger>
              </div>

            </div>
            <div className='calendarBody'>
              <DragAndDropCalendar
                components={{
                  event: CalendarEvent
                }}
                localizer={localizer}
                events={filteredEntries}
                views={AllViews}
                view={currentView || "month"}
                startAccessor="start"
                endAccessor="end"
                className="calendar"
                selectable
                resizable
                onRangeChange={this.onRangeChange}
                onView={() => { }}                  // prevent warning message in browser
                onSelectEvent={this.selectEntry}
                onSelectSlot={this.selectSlotEvent}
                onEventDrop={this.onHandleTimeUpdate}
                onEventResize={this.onHandleTimeUpdate}
                step={15}
                scrollToTime={scrollTime}
                eventPropGetter={(this.eventStyleGetter)}
                showMultiDayTimes={false}
                // enableAutoScroll={true}
              />

              <CalendarEntryEditor
                show={showTimeslotEditor}
                closeModal={this.closeItemEditor}
                entry={currentEntry}
                updateEntry={this.handleEntryKeyUpdate}
                saveEntry={this.saveEntry}
                deleteEntry={this.deleteEntry}
                editable={currentEntryEditable}
                onShowLink={()=>{
                  this.onLockBackgroundClose(false)
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
    )
  }
}
