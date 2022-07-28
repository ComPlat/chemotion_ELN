/* eslint-disable object-shorthand, no-trailing-spaces, 
object-property-newline, semi, react/no-unused-prop-types, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import PrivateNoteFetcher from './fetchers/PrivateNoteFetcher';
import PrivateNote from './models/PrivateNote';

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

  fetchNote(element) {
    if (element === undefined || element.is_new) {
      return;
    }

    PrivateNoteFetcher.fetchByNoteableId(element.id, element.type).then((note) => {
      if (note != null) {
        this.setState({ note: note });
      }
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  handleInputChange(value) {
    let { note } = this.state;
    if (note === undefined) {
      note = PrivateNote.buildEmpty();
    }
    note.content = value;
    this.setState({ note: note });
  }

  saveNote() {
    const { note } = this.state;
    const { element } = this.props;
    if (!element || !note) {
      return;
    }
    this.setState({ isSaving: true })
    if (!note.created_at) {
      const params = {
        content: note.content, noteable_id: element.id,
        noteable_type: element.type
      };
      PrivateNoteFetcher.create(params).then((newNote) => {
        this.setState({ note: newNote, isSaving: false });
      }).catch((errorMessage) => {
        console.log(errorMessage);
        this.setState({ isSaving: false })
      });
    } else {
      PrivateNoteFetcher.update(note).then((newNote) => {
        this.setState({ note: newNote, isSaving: false });
      }).catch((errorMessage) => {
        console.log(errorMessage);
        this.setState({ isSaving: false })
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
      <FormGroup>
        <OverlayTrigger
          placement="top"
          overlay={
            <Tooltip id='private-note'>Only you can see this note</Tooltip>
          }
        >
          <ControlLabel>
            Private Note <span className="glyphicon glyphicon-info-sign" />
          </ControlLabel>
        </OverlayTrigger>

        <i>{isSaving ? " saving your note" : ""}</i>

        <FormControl
          componentClass="textarea"
          ref={(input) => { this.noteInput = input; }}
          placeholder={content}
          value={content ?? ''}
          onChange={e => this.handleInputChange(e.target.value)}
          rows={2}
          disabled={disabled}
          onBlur={() => this.saveNote()}
        />
      </FormGroup>
    )
  }
}

PrivateNoteElement.propTypes = {
  element: PropTypes.object,
  handlePrivateNoteChanged: PropTypes.func,
};
