import React, { useContext, useEffect } from 'react';
import DateTimePicker from 'react-datetime-picker/dist/entry.nostyle';
import { Form, Button, ButtonToolbar, Alert, Modal, Popover, OverlayTrigger } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import { capitalizeWords } from 'src/utilities/textHelper';
import PropTypes from 'prop-types';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const CalendarEntryEditor = (props) => {
  const calendarStore = useContext(StoreContext).calendar;
  const { entry, resizeEditor } = props;

  const accessible = entry?.accessible === true;
  const notAccessible = !accessible;
  const editable = calendarStore.current_entry_editable;
  const disabled = !editable || notAccessible;
  const currentCalendarTypes = calendarStore.calendar_types[calendarStore.eventable_type] || calendarStore.calendar_types.default;
  const calendarTypes = currentCalendarTypes.map((type) => (
    { label: capitalizeWords(type), value: type }
  ));

  const notifyUserList = calendarStore.collectionUsers?.map((user) => (
    { label: user.label, value: user.id }
  )) || [];

  useEffect(() => {
    if (calendarStore.show_time_slot_editor) {
      resizeEditor();
    }
  }, [calendarStore.show_time_slot_editor]);

  const closeEditor = () => {
    calendarStore.resetEditorValues();
  }

  const updateEntry = (key, value) => {
    calendarStore.changeCurrentEntry(key, value);
  }

  const saveEntry = () => {
    if (!calendarStore.current_entry.title) {
      calendarStore.changeErrorMessage('Please enter a title.');
      return;
    }
    if (calendarStore.current_entry.id) {
      calendarStore.updateEntry(calendarStore.current_entry);
    } else {
      calendarStore.createEntry(calendarStore.current_entry);
    }
    closeEditor();
  }

  const deleteEntry = () => {
    calendarStore.deleteEntry(calendarStore.current_entry.id);
    closeEditor();
  }

  const showDetails = () => {
    calendarStore.openElement();
    const { clientWidth, clientHeight } = window.document.documentElement;
    calendarStore.changeModalDimension({ width: Math.round((48 / 100) * clientWidth), height: clientHeight });
    resizeEditor();
    calendarStore.navigateToElement(entry);
  }

  const createdBy = () => {
    if (!entry.user_name_abbreviation) { return null; }

    return (
      <div className="fst-italic text-end">
        {`created by ${entry.user_name_abbreviation} `}
        <span>({entry.user_email})</span>
      </div>
    );
  }

  const linkToElement = () => {
    if (entry.eventable_type && accessible) {
      return (
        <div className="d-flex justify-content-end mb-2">
          <Button
            variant="link"
            className="ms-2 text-decoration-none"
            onClick={() => showDetails()}
          >
            {entry.element_name}
          </Button>
        </div>
      );
    }

    if (entry.eventable_type) {
      return (
        <div className="fst-italic text-end">
          {entry.element_name}
        </div>
      );
    }
  }

  const deleteEntryButton = () => {
    if (entry.id === undefined || !editable) { return null; }

    const popover = (
      <Popover id="popover-delete-entry">
        <Popover.Header as="h3">Are you sure you want to delete the calendar entry?</Popover.Header>
        <Popover.Body>
          <ButtonToolbar className="gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={() => deleteEntry()}>
              Yes
            </Button>
            <Button size="sm" variant="warning">
              No
            </Button>
          </ButtonToolbar>
        </Popover.Body>
      </Popover>
    );

    return (
      <OverlayTrigger placement="top" trigger="focus" overlay={popover}>
        <Button variant="danger">
          Delete
        </Button>
      </OverlayTrigger>
    );
  }

  // https://www.npmjs.com/package/react-datetime-picker

  return (
    <Modal
      backdrop={calendarStore.editor_backdrop}
      keyboard={false}
      show={calendarStore.show_time_slot_editor}
      onHide={closeEditor}
      data-type="calendar-editor"
      style={{
        transform: `translate(${calendarStore.delta_position_editor.x}px, ${calendarStore.delta_position_editor.y}px)`,
        maxWidth: '500px'
      }}
    >
      <Modal.Body>
        {createdBy()}
        {linkToElement()}
        {calendarStore.error ? (
          <Alert variant="danger">
            {calendarStore.error}
          </Alert>
        ) : null}
        <Form>
          <Form.Group controlId="calendarTitle" className="mb-3">
            <Form.Label>Title*</Form.Label>
            <Form.Control
              disabled={disabled}
              value={entry.title || ''}
              onChange={(ev) => updateEntry('title', ev.target.value)}
              autoFocus
            />
          </Form.Group>

          <Form.Group controlId="calendarDescription" className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control
              disabled={disabled}
              as="textarea"
              value={entry.description || ''}
              onChange={(ev) => updateEntry('description', ev.target.value)}
              style={{ resize: 'none' }}
              rows={4}
            />
          </Form.Group>

          <Form.Group controlId="calendarEntryType" className="mb-3">
            <Form.Label>Type</Form.Label>
            <Select
              isDisabled={disabled}
              isClearable
              value={calendarTypes.find(({value}) => value === entry.kind)}
              onChange={(ev) => updateEntry('kind', ev?.value || '')}
              options={calendarTypes}
            />
          </Form.Group>

          <Form.Group
            controlId="calendarEntryEmailNotification"
            className={`mb-3 ${notifyUserList.length > 0 ? 'd-block' : 'd-none'}`}
          >
            <Form.Label>Notify Users</Form.Label>
            <Select
              isDisabled={disabled}
              isClearable
              isMulti
              value={notifyUserList.filter(({value}) => entry.notify_users?.includes(value))}
              onChange={(list) => updateEntry('notify_users', list)}
              options={notifyUserList}
            />
          </Form.Group>

          <Form.Group
            controlId="calendarEntryNotifiedUsers"
            className={`mb-3 ${notifyUserList.length > 0 ? 'd-block' : 'd-none'}`}
          >
            <Form.Label>Notified Users</Form.Label>
            <Form.Control
              disabled
              as="textarea"
              value={entry.notified_users}
              style={{ resize: 'none' }}
              rows={4}
            />
          </Form.Group>

          <Form.Group controlId="calendarStartEntry" className="mb-3">
            <Form.Label className="w-100">Start*</Form.Label>
            <DateTimePicker
              disabled={disabled}
              clearIcon={null}
              value={entry.start}
              onChange={(date) => updateEntry('start', date)}
              format="dd-MM-y H:mm"
              className="w-100"
            />
          </Form.Group>

          <Form.Group controlId="calendarEndEntry" className="mb-3">
            <Form.Label className="w-100">End*</Form.Label>
            <DateTimePicker
              disabled={disabled}
              clearIcon={null}
              value={entry.end}
              onChange={(date) => updateEntry('end', date)}
              format="dd-MM-y H:mm"
              className="w-100"
            />
          </Form.Group>
          {notAccessible ? (
            <Alert variant="danger">
              Your access to {entry.element_name} was removed.
            </Alert>
          ) : null}
          <ButtonToolbar className="d-flex align-items-center gap-2">
            <div className="flex-grow-1">
              {(entry.eventable_type && accessible && entry.id !== undefined) ? (
                <div>
                  <a
                    href={`/api/v1/calendar_entries/ical?id=${entry.id}`}
                    onClick={() => window.open(`/api/v1/calendar_entries/ical?id=${entry.id}`)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    ical - download
                  </a>
                </div>
              ) : null}
            </div>
            <Button variant="primary" onClick={closeEditor}>Cancel</Button>
            {deleteEntryButton()}
            {(editable && accessible) ? <Button variant="warning" onClick={saveEntry}>Save</Button> : null}
          </ButtonToolbar>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default observer(CalendarEntryEditor);

CalendarEntryEditor.defaultProps = {
  entry: undefined,
};

CalendarEntryEditor.propTypes = {
  resizeEditor: PropTypes.func.isRequired,
  entry: PropTypes.shape({
    accessible: PropTypes.bool,
    id: PropTypes.number,
    eventable_type: PropTypes.string,
    user_email: PropTypes.string,
    user_name_abbreviation: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    kind: PropTypes.string,
    notified_users: PropTypes.string,
    element_name: PropTypes.string,
    notify_users: PropTypes.arrayOf(PropTypes.string),
    start: PropTypes.instanceOf(Date),
    end: PropTypes.instanceOf(Date),
  }),
};
