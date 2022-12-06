import React from 'react';
// import moment from 'moment';
import DateTimePicker from 'react-datetime-picker/dist/entry.nostyle';
import { Form, ControlLabel, FormControl, FormGroup, Button, ButtonToolbar, Alert } from 'react-bootstrap';
import Select from 'react-select';
import CalendarStore, { CalendarTypes } from 'src/stores/alt/stores/CalendarStore';
import { elementShowOrNew } from 'src/utilities/routesUtils';


function capitalize(s) {
  return s && s[0].toUpperCase() + s.slice(1);
}


export default class CalendarEntryEditor extends React.Component {
  constructor(props) {
    super(props);

    this.onClickBackground = this.onClickBackground.bind(this);
    this.showDetails = this.showDetails.bind(this);
  }

  onClickBackground(ev) {
    if(ev.target.className == "calendarElementModal")
      this.props.closeModal()
  }

  componentDidUpdate(prevProps) {
    if (this.props.show && (prevProps.show !== this.props.show)) {
      this.titleInput?.focus();
    }
  }


  showDetails(entry) {
    let { eventable_id, eventable_type } = entry;
    eventable_type = eventable_type.toLowerCase()

    const e = { type: eventable_type, params: {} };
    e.params[`${eventable_type}ID`] = eventable_id;

    if (eventable_type == "element") {
      e.klassType = 'GenericEl';
    }

    this.props.onShowLink();
    elementShowOrNew(e)
  }

  render() {
    const { show, entry, closeModal, updateEntry, saveEntry, deleteEntry, editable } = this.props;
    const { eventable_type, collectionUsers } = CalendarStore.getState();
    const currentCalendarTypes = CalendarTypes[eventable_type] || CalendarTypes["default"];
    const calendarTypes = currentCalendarTypes.map((type) => ({label: capitalize(type), value: type}));
    const notifyUserList = collectionUsers?.map((user) => ({label: user.label, value: user.id})) || [];
    const accessible = entry?.accessible == true;
    const notAccessible = !accessible;

    return entry ? (
        <div
          className="calendarElementModal"
          style={{display: (show ? "block": "none")}}
          onClick={this.onClickBackground}
          role="dialog"
        >
          <section
            className="calendarElementModalBox"
            role="document"
          >
            { entry.user_name_abbreviation ?
                (<div
                  style={{
                    fontStyle: "italic",
                    textAlign: "end"
                  }}
                >created by {entry.user_name_abbreviation}<span> ({entry.user_email})</span></div>) : null
            }
            { (entry.eventable_type && accessible) ?
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <a
                  target="_blank"
                  style={{marginLeft: "8px"}}
                  onClick={() => this.showDetails(entry)}
                >
                  {entry.element_name}
                </a>
              </div> : (entry.eventable_type ?
              (<div
                style={{
                  fontStyle: "italic",
                  textAlign: "end"
                }}
              >{entry.element_name}</div>) : null)
            }
            <Form className="entryForm" >
              <FormGroup className="entryGroup" controlId="calendarTitle">
                <ControlLabel>Title*</ControlLabel>
                <FormControl
                  disabled={!editable || notAccessible}
                  inputRef={ref => { this.titleInput = ref; }}
                  type="text"
                  value={entry.title || ""}
                  onChange={(ev) => updateEntry("title", ev.target.value)}
                  autoComplete="off"
                  // inputRef={(m) => { this.state.name = m; }}
                  />
              </FormGroup>
              <FormGroup className="entryGroup" controlId="calendarDescription">
                <ControlLabel>Description</ControlLabel>
                <FormControl
                  disabled={!editable || notAccessible}
                  type="text"
                  componentClass="textarea"
                  value={entry.description || ""}
                  onChange={(ev) => updateEntry("description", ev.target.value)}
                  style={{
                    height: 100,
                    resize: "none"
                  }}
                />
              </FormGroup>

              <FormGroup className="entryGroup" controlId="calendarEntryType">
                <ControlLabel>Type</ControlLabel>
                <Select
                  disabled={!editable || notAccessible}
                  // key={entry.kind || ""}
                  value={entry.kind || ""}
                  onChange={(ev) => updateEntry("kind", ev?.value || "")}
                  options={calendarTypes}
                />
              </FormGroup>

              <FormGroup
                className="entryGroup"
                controlId="calendarEntryEmailNotification"
                style={{display: (notifyUserList.length > 0 ? "block": "none")}}
              >
                <ControlLabel>Notify Users</ControlLabel>
                <Select
                  disabled={!editable || notAccessible}
                  clearable
                  searchable
                  multi={true}
                  value={entry.notifyUsers || ""}
                  onChange={(list) => updateEntry("notifyUsers", list || "")}
                  options={notifyUserList}
                />
              </FormGroup>

              <FormGroup
                className="entryGroup"
                controlId="calendarEntryNotifiedUsers"
                style={{ display: (entry.notified_users ? "block" : "none") }}
              >
                <ControlLabel>Notified Users</ControlLabel>
                <FormControl
                  disabled={true}
                  type="text"
                  componentClass="textarea"
                  value={entry.notified_users}
                  style={{
                    height: 100,
                    // resize: "none"
                  }}
                />
              </FormGroup>

              <FormGroup className="entryGroup" controlId="calendarStartEntry">
                <ControlLabel>Start*</ControlLabel>
                <DateTimePicker
                  disabled={!editable || notAccessible}
                  clearIcon={null}
                  value={entry.start}
                  onChange={(date) => updateEntry("start", date)}
                  format="y-MM-dd H:mm"
                  style={{
                    alignItems: "baseline",
                  }}
                  />
              </FormGroup>

              <FormGroup className="entryGroup" controlId="calendarEndEntry">
                <ControlLabel>End*</ControlLabel>
                {/* https://www.npmjs.com/package/react-datetime-picker */}
                <DateTimePicker
                  disabled={!editable || notAccessible}
                  clearIcon={null}
                  value={entry.end}
                  onChange={(date) => updateEntry("end", date)}
                  format="y-MM-dd H:mm"
                />
              </FormGroup>
            {notAccessible ? <Alert bsStyle="danger">Your access to {entry.element_name} was removed.</Alert>: null}
              <ButtonToolbar
                style={{
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div style={{flexGrow: 20}}>
                {(entry.eventable_type && accessible && entry.id != undefined) ?
                  <div >
                    <a
                      href={"/api/v1/calendar_entries/ical?id=" + entry.id}
                      onClick={() => window.open("/api/v1/calendar_entries/ical?id=" + entry.id)}
                      style={{marginLeft: "8px"}}
                      target="_blank"
                    >
                      ical - download
                    </a>
                  </div> : null
                }
                </div>
                <Button bsStyle="primary" onClick={closeModal}>Cancel</Button>
                { entry.id != undefined && editable ?
                  <Button bsStyle="danger" onClick={() => {
                      if(confirm("Are you sure you want to delete the calendar entry?")) {
                        deleteEntry()
                      }
                    }}
                  >
                    Delete
                  </Button> :
                  null
                }
                { (editable && accessible) ?
                  <Button bsStyle="warning" onClick={saveEntry}>Save</Button> :
                  null
                }

              </ButtonToolbar>
            </Form>
          </section>
        </div>
      ) : null;
  }
}
