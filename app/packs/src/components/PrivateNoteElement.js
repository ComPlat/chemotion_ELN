/* eslint-disable object-shorthand, no-trailing-spaces, 
object-property-newline, semi, react/no-unused-prop-types, react/prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { FormGroup, ControlLabel, FormControl, Button } from 'react-bootstrap';
import PrivateNoteFetcher from './fetchers/PrivateNoteFetcher';
import PrivateNote from './models/PrivateNote';

export default class PrivateNoteElement extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      note: undefined
    };
  }

  componentDidMount() {
    const { element } = this.props;
    this.fetchNote(element);
  }

  fetchNote(element) {
    if (element === undefined) {
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
    if (!note.created_at) {
      const params = { 
        content: note.content, noteable_id: element.id, 
        noteable_type: element.type 
      };
      PrivateNoteFetcher.create(params).then((newNote) => {
        this.setState({ note: newNote });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    } else {
      PrivateNoteFetcher.update(note).then((newNote) => {
        this.setState({ note: newNote });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    }
  }

  render() {
    const { note } = this.state;
    const content = note ? note.content : '';
    let disabled = this.props.disabled || false;
    const { element } = this.props;
    if (element && element.is_new) {
      disabled = true;
    }

    return (
      <FormGroup>
        <ControlLabel>Private Note</ControlLabel>
        <FormControl
          componentClass="textarea"
          ref={(input) => { this.noteInput = input; }}
          placeholder={content}
          value={content}
          onChange={e => this.handleInputChange(e.target.value)}
          rows={10}
          disabled={disabled}
        />
        <Button 
          bsStyle="warning" 
          onClick={() => this.saveNote()}
          disabled={disabled}>Save note</Button>
      </FormGroup>
    )
  }
}

PrivateNoteElement.propTypes = {
  element: PropTypes.object,
  handlePrivateNoteChanged: PropTypes.func,
};
