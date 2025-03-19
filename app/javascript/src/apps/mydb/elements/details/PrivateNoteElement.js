import React from 'react';
import PropTypes from 'prop-types';
import { Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PrivateNoteFetcher from 'src/fetchers/PrivateNoteFetcher';
import PrivateNote from 'src/models/PrivateNote';

export default class PrivateNoteElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      note: undefined,
      isSaving: false
    };
  }

  componentDidMount() {
    const { element } = this.props;
    this.fetchNote(element);
  }

  handleInputChange(value) {
    let { note } = this.state;
    if (note === undefined) {
      note = PrivateNote.buildEmpty();
    }
    note.content = value;
    this.setState({ note });
  }

  fetchNote(element) {
    if (element === undefined || element.is_new) {
      return;
    }

    PrivateNoteFetcher.fetchByNoteableId(element.id, element.type).then((note) => {
      if (note != null) {
        this.setState({ note });
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  saveNote() {
    const { note } = this.state;
    const { element } = this.props;
    if (!element || !note) {
      return;
    }
    this.setState({ isSaving: true });
    if (!note.created_at) {
      const params = {
        content: note.content,
        noteable_id: element.id,
        noteable_type: element.type
      };
      PrivateNoteFetcher.create(params).then((newNote) => {
        this.setState({ note: newNote, isSaving: false });
      }).catch((errorMessage) => {
        console.log(errorMessage);
        this.setState({ isSaving: false });
      });
    } else {
      PrivateNoteFetcher.update(note).then((newNote) => {
        this.setState({ note: newNote, isSaving: false });
      }).catch((errorMessage) => {
        console.log(errorMessage);
        this.setState({ isSaving: false });
      });
    }
  }

  render() {
    const { note, isSaving } = this.state;
    const content = note ? note.content : '';
    let disabled = this.props.disabled || false;
    const { element } = this.props;
    if (element && element.is_new) {
      disabled = true;
    }

    return (
      <div className="my-2">
        <Form.Group>
          <Form.Label>
            Private note
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id="private-note">Only you can see this note</Tooltip>
            }
            >
              <i className="ms-1 fa fa-info-circle" />
            </OverlayTrigger>
          </Form.Label>

          <i>{isSaving ? ' saving your note' : ''}</i>

          <Form.Control
            as="textarea"
            value={content ?? ''}
            onChange={(e) => this.handleInputChange(e.target.value)}
            rows={2}
            disabled={disabled}
            onBlur={() => this.saveNote()}
          />
        </Form.Group>
      </div>
    );
  }
}

PrivateNoteElement.propTypes = {
  element: PropTypes.object.isRequired,
  disabled: PropTypes.bool.isRequired,
};
