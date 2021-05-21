import React, { Component } from 'react';
import { FormGroup, InputGroup, FormControl, ControlLabel, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

import QuillEditor from './QuillEditor';

export default class WellplateProperties extends Component {
  handleInputChange(type, event) {
    const { changeProperties } = this.props;
    const { value } = event.target;
    changeProperties({ type, value });
  }

  addReadoutTitle() {
    const { readoutTitles, changeProperties, handleAddReadout } = this.props;
    const currentTitles = readoutTitles || [];
    const newTitles = currentTitles.concat('Readout');
    changeProperties({ type: 'readoutTitles', value: newTitles });
    handleAddReadout();
  }

  removeReadoutTitle(index) {
    const { readoutTitles, changeProperties, handleRemoveReadout } = this.props;
    const currentTitles = readoutTitles || [];
    currentTitles.splice(index, 1);
    changeProperties({ type: 'readoutTitles', value: currentTitles });
    handleRemoveReadout(index);
  }

  updateReadoutTitle(index, newValue) {
    const { readoutTitles, changeProperties } = this.props;
    const currentTitles = readoutTitles || [];
    currentTitles[index] = newValue;
    changeProperties({ type: 'readoutTitles', value: currentTitles });
  }

  render() {
    const {
      name, size, description, readoutTitles
    } = this.props;
    return (
      <table width="100%">
        <tbody>
          <tr>
            <td width="80%" className="padding-right">
              <FormGroup>
                <ControlLabel>Name</ControlLabel>
                <FormControl
                  type="text"
                  value={name || ''}
                  onChange={event => this.handleInputChange('name', event)}
                  disabled={name === '***'}
                />
              </FormGroup>
            </td>
            <td width="20%">
              <FormGroup>
                <ControlLabel>Size</ControlLabel>
                <FormControl
                  type="text"
                  value={size || ''}
                  onChange={event => this.handleInputChange('size', event)}
                  disabled
                />
              </FormGroup>
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              <ControlLabel>Readout Titles</ControlLabel>
              <Button className="button-right" bsStyle="success" bsSize="small" onClick={() => this.addReadoutTitle()}>
                <i className="fa fa-plus" />
              </Button>
            </td>
          </tr>
          {readoutTitles && readoutTitles.map((readoutTitle, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index}>
              {/* TODO: why does colSpan={2} not work here? */}
              <td>
                <FormGroup>
                  <InputGroup>
                    <FormControl
                      type="text"
                      value={readoutTitle}
                      onChange={event => this.updateReadoutTitle(index, event.target.value)}
                    />
                    <InputGroup.Button>
                      <Button bsStyle="danger" className="button-right" onClick={() => this.removeReadoutTitle(index)}>
                        <i className="fa fa-trash-o" />
                      </Button>
                    </InputGroup.Button>
                  </InputGroup>
                </FormGroup>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan="2">
              <FormGroup>
                <ControlLabel>Description</ControlLabel>
                <QuillEditor
                  value={description}
                  onChange={event => this.handleInputChange('description', { target: { value: event } })}
                  disabled={description === '***'}
                />
              </FormGroup>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

WellplateProperties.propTypes = { /* eslint-disable react/forbid-prop-types */
  changeProperties: PropTypes.func.isRequired,
  handleAddReadout: PropTypes.func.isRequired,
  handleRemoveReadout: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  size: PropTypes.number.isRequired,
  description: PropTypes.object.isRequired,
  readoutTitles: PropTypes.array.isRequired,
};
