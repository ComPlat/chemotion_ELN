import React, {Component} from 'react';
import {FormGroup, FormControl, ControlLabel} from 'react-bootstrap';

import QuillEditor from './QuillEditor'

export default class WellplateProperties extends Component {

  handleInputChange(type, event) {
    const {changeProperties} = this.props;
    const {value} = event.target;
    changeProperties({type: type, value: value});
  }

  render() {
    const {name, size, description} = this.props;
    return (
      <table width="100%"><tbody>
        <tr>
          <td width="70%" className="padding-right">
            <FormGroup>
              <ControlLabel>Name</ControlLabel>
              <FormControl type="text"
                value={name || ''}
                onChange={event => this.handleInputChange('name', event)}
                disabled={name == '***'}
              />
            </FormGroup>
          </td>
          <td width="30%">
            <FormGroup>
              <ControlLabel>Size</ControlLabel>
              <FormControl type="text"
                value={size || ''}
                onChange={event => this.handleInputChange('size', event)}
                disabled
              />
            </FormGroup>
          </td>
        </tr>
        <tr>
          <td colSpan="2">
            <FormGroup>
              <ControlLabel>Description</ControlLabel>
              <QuillEditor value={description}
                onChange={event => this.handleInputChange('description', {target: {value: event}})}
                disabled={description == '***'}
              />
            </FormGroup>
          </td>
        </tr>
      </tbody></table>
    );
  }
}
