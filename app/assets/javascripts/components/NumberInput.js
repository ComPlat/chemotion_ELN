import React, {Component} from 'react';
import {DropdownButton, MenuItem} from 'react-bootstrap';
import NumeralInput from './NumeralInput';

export default class NumberInput extends Component {
  constructor(props) {
    super(props);

    let {defaultValue, units} = props;
    this.state = {
      selectedUnitName: units[0].name,
      value: defaultValue
    };
  }

  _handleUnitSelect(unit) {
    this.setState({
      selectedUnitName: unit.name
    });

    // jquery, findDomNode, flux-store, callback
    let {value} = this.state;
    unit.callback(value);
  }

  //_handleValueChange(){
  //  console.log(42);
  //}

  _renderUnitsAsMenuItems() {
    let {units} = this.props;
    return units.map((unit, index) => {
      return (
          <MenuItem key={'unit_' + index} onSelect={this._handleUnitSelect.bind(this, unit)}>
            {unit.name}
          </MenuItem>
      );
    });
  }

  _renderInnerDropdown() {
    return (
        <DropdownButton title='unit'>
          {this._renderUnitsAsMenuItems()}
        </DropdownButton>
    );
  }

  render() {
    let {selectedUnitName} = this.state;
    let {units} = this.props;
    let innerDropdown = (units.length > 1) ? this._renderInnerDropdown() : '';
    return (
        <NumeralInput addonBefore={selectedUnitName} addonAfter={innerDropdown}
                      //onChange={this._handleValueChange.bind(this)}
                      {...this.props} />
    );
  }
}

NumberInput.defaultProps = {
  defaultValue: '0.000',
  numeralFormat: '0,0.000',
  bsSize: 'large',
  units: [{
    name: 'g',
    callback: value => {
      console.log('unit g selected');
      console.log("value: " + value);
    }
  },
    {
      name: 'ml',
      callback: value => {
        console.log('unit ml selected');
        console.log("value: " + value);
      }
    },
    {
      name: 'mol',
      callback: value => {
        console.log('unit mol selected');
        console.log("value: " + value);
      }
    }
  ]
};
