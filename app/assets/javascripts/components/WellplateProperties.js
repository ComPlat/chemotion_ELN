import React, {Component} from 'react';
import {Input} from 'react-bootstrap';

export default class WellplateProperties extends Component {
  handleInputChange(type, event) {
    const {changeProperties} = this.props;
    const {value} = event.target;
    let properties = {};
    switch (type) {
      case 'name':
        properties.name = value;
        break;
      case 'size':
        properties.size = value;
        break;
      case 'description':
        properties.description = value;
        break;
    }
    changeProperties(properties);
  }

  render() {
    const {name, size, description} = this.props;
    return (
      <table width="100%">
        <tr>
          <td width="70%" className="padding-right">
            <Input
              type="text"
              label="Name"
              value={name}
              onChange={event => this.handleInputChange('name', event)}
              />
          </td>
          <td width="30%">
            <Input
              type="text"
              label="Size"
              value={size}
              onChange={event => this.handleInputChange('size', event)}
              disabled
              />
          </td>
        </tr>
        <tr>
          <td colSpan="2">
            <Input
              type="textarea"
              label="Description"
              value={description}
              onChange={event => this.handleInputChange('description', event)}
              />
          </td>
        </tr>
      </table>
    );
  }
}
