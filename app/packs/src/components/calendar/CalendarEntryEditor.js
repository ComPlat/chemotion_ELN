import React from 'react';
import DateTimePicker from 'react-datetime-picker/dist/entry.nostyle';
import {
  Form,
  ControlLabel,
  FormControl,
  FormGroup,
  Button,
  ButtonToolbar,
  Alert
} from 'react-bootstrap';
import Select from 'react-select';
import CalendarStore, { CalendarTypes } from 'src/stores/alt/stores/CalendarStore';
import { elementShowOrNew } from 'src/utilities/routesUtils';
import PropTypes from 'prop-types';

function capitalize(s) {
  return s && s[0].toUpperCase() + s.slice(1);
}

export default class CalendarEntryEditor extends React.Component {
  constructor(props) {
    super(props);

    this.onClickBackground = this.onClickBackground.bind(this);
    this.showDetails = this.showDetails.bind(this);
    this.navigationLink = this.navigationLink.bind(this);
  }

  componentDidUpdate(prevProps) {
    const { show } = this.props;
    if (show && (prevProps.show !== show)) {
      this.titleInput?.focus();
    }
  }

  onClickBackground(ev) {
    const { closeModal } = this.props;
    if (ev.target.className === 'calendarElementModal') closeModal();
  }

  showDetails(entry) {
    const { eventableId } = entry;
    let { eventableType } = entry;
    eventableType = eventableType.toLowerCase();

    const e = { type: eventableType, params: {} };
    e.params[`${eventableType}ID`] = eventableId;

    if (eventableType === 'element') {
      e.klassType = 'GenericEl';
    }

    const { onShowLink } = this.props;
    onShowLink();
    elementShowOrNew(e);
  }

  navigationLink(entry, accessible) {
    if (entry.eventableType && accessible) {
      return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            type="button"
            className="btn-link"
            style={{ marginLeft: '8px' }}
            onClick={() => this.showDetails(entry)}
          >
            {entry.element_name}
          </button>
        </div>
      );
    }

    if (entry.eventableType) {
      return (
        <div
          style={{
            fontStyle: 'italic',
            textAlign: 'end'
          }}
        >
          {entry.element_name}
        </div>
      );
    }

    return <div />;
  }

  render() {
    const {
      show,
      entry,
      closeModal,
      updateEntry,
      saveEntry,
      deleteEntry,
      editable
    } = this.props;
    const { eventableType, collectionUsers } = CalendarStore.getState();
    const currentCalendarTypes = CalendarTypes[eventableType] || CalendarTypes.default;
    const calendarTypes = currentCalendarTypes.map((type) => (
      { label: capitalize(type), value: type }
    ));
    const notifyUserList = collectionUsers?.map((user) => (
      { label: user.label, value: user.id }
    )) || [];
    const accessible = entry?.accessible === true;
    const notAccessible = !accessible;

    function createdBy() {
      return (
        <>
          { `created by ${entry.user_name_abbreviation} ` }
          <span>
            (
            {entry.user_email}
            )
          </span>
        </>
      );
    }

    return entry ? (
      <div
        role="button"
        tabIndex="-1"
        onKeyUp={() => { }}
        className="calendarElementModal"
        style={{ display: (show ? 'block' : 'none') }}
        onClick={this.onClickBackground}
      >
        <section
          className="calendarElementModalBox"
          role="document"
        >
          { entry.user_name_abbreviation ? (
            <div
              style={{
                fontStyle: 'italic',
                textAlign: 'end'
              }}
            >
              {createdBy()}
            </div>
          ) : null }
          {this.navigationLink(entry, accessible)}
          <Form className="entryForm">
            <FormGroup className="entryGroup" controlId="calendarTitle">
              <ControlLabel>Title*</ControlLabel>
              <FormControl
                disabled={!editable || notAccessible}
                inputRef={(ref) => { this.titleInput = ref; }}
                type="text"
                value={entry.title || ''}
                onChange={(ev) => updateEntry('title', ev.target.value)}
                autoComplete="off"
              />
            </FormGroup>
            <FormGroup className="entryGroup" controlId="calendarDescription">
              <ControlLabel>Description</ControlLabel>
              <FormControl
                disabled={!editable || notAccessible}
                type="text"
                componentClass="textarea"
                value={entry.description || ''}
                onChange={(ev) => updateEntry('description', ev.target.value)}
                style={{
                  height: 100,
                  resize: 'none'
                }}
              />
            </FormGroup>

            <FormGroup className="entryGroup" controlId="calendarEntryType">
              <ControlLabel>Type</ControlLabel>
              <Select
                disabled={!editable || notAccessible}
                // key={entry.kind || ""}
                value={entry.kind || ''}
                onChange={(ev) => updateEntry('kind', ev?.value || '')}
                options={calendarTypes}
              />
            </FormGroup>

            <FormGroup
              className="entryGroup"
              controlId="calendarEntryEmailNotification"
              style={{ display: (notifyUserList.length > 0 ? 'block' : 'none') }}
            >
              <ControlLabel>Notify Users</ControlLabel>
              <Select
                disabled={!editable || notAccessible}
                clearable
                searchable
                multi
                value={entry.notifyUsers || ''}
                onChange={(list) => updateEntry('notifyUsers', list || '')}
                options={notifyUserList}
              />
            </FormGroup>

            <FormGroup
              className="entryGroup"
              controlId="calendarEntryNotifiedUsers"
              style={{ display: (entry.notified_users ? 'block' : 'none') }}
            >
              <ControlLabel>Notified Users</ControlLabel>
              <FormControl
                disabled
                type="text"
                componentClass="textarea"
                value={entry.notified_users}
                style={{
                  height: 100,
                }}
              />
            </FormGroup>

            <FormGroup className="entryGroup" controlId="calendarStartEntry">
              <ControlLabel>Start*</ControlLabel>
              <DateTimePicker
                disabled={!editable || notAccessible}
                clearIcon={null}
                value={entry.start}
                onChange={(date) => updateEntry('start', date)}
                format="y-MM-dd H:mm"
                style={{
                  alignItems: 'baseline',
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
                onChange={(date) => updateEntry('end', date)}
                format="y-MM-dd H:mm"
              />
            </FormGroup>
            {notAccessible ? (
              <Alert bsStyle="danger">
                Your access to
                &nbsp;
                {entry.element_name}
                &nbsp;
                was removed.
              </Alert>
            ) : null}
            <ButtonToolbar
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <div style={{ flexGrow: 20 }}>
                { (entry.eventableType && accessible && entry.id !== undefined) ? (
                  <div>
                    <a
                      href={`/api/v1/calendar_entries/ical?id=${entry.id}`}
                      onClick={() => window.open(`/api/v1/calendar_entries/ical?id=${entry.id}`)}
                      style={{ marginLeft: '8px' }}
                      target="_blank"
                      rel="noreferrer"
                    >
                      ical - download
                    </a>
                  </div>
                ) : null }
              </div>
              <Button bsStyle="primary" onClick={closeModal}>Cancel</Button>
              { entry.id !== undefined && editable ? (
                <Button
                  bsStyle="danger"
                  onClick={() => {
                    // eslint-disable-next-line no-restricted-globals, no-alert
                    if (confirm('Are you sure you want to delete the calendar entry?')) {
                      deleteEntry();
                    }
                  }}
                >
                  Delete
                </Button>
              ) : null }
              { (editable && accessible) ? <Button bsStyle="warning" onClick={saveEntry}>Save</Button> : null }
            </ButtonToolbar>
          </Form>
        </section>
      </div>
    ) : null;
  }
}

CalendarEntryEditor.defaultProps = {
  entry: undefined,
};

CalendarEntryEditor.propTypes = {
  show: PropTypes.bool.isRequired,
  closeModal: PropTypes.func.isRequired,
  onShowLink: PropTypes.func.isRequired,
  updateEntry: PropTypes.func.isRequired,
  saveEntry: PropTypes.func.isRequired,
  deleteEntry: PropTypes.func.isRequired,
  editable: PropTypes.bool.isRequired,
  entry: PropTypes.shape({
    accessible: PropTypes.bool,
    id: PropTypes.number,
    eventableType: PropTypes.string,
    user_email: PropTypes.string,
    user_name_abbreviation: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    kind: PropTypes.string,
    notified_users: PropTypes.string,
    element_name: PropTypes.string,
    notifyUsers: PropTypes.arrayOf(PropTypes.string),
    start: PropTypes.instanceOf(Date),
    end: PropTypes.instanceOf(Date),
  }),
};
