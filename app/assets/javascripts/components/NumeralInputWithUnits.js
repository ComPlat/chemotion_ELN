import React, {Component} from 'react';
import {DropdownButton, MenuItem} from 'react-bootstrap';
import NumeralInput from './NumeralInput';

export default class NumeralInputWithUnits extends Component {
  constructor(props) {
    super(props);

    let {defaultValue, units} = props;
    this.state = {
      selectedUnit: units[0].name,
      value: defaultValue
    };
  }

  _handleUnitSelect(unit) {
    this.setState({
      selectedUnit: unit.name
    });

    let {value} = this.state;
    unit.callback(value);
  }

  _handleValueChange(value) {
    this.setState({
      value: value
    });
  }

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

  _renderDropdownButtonAddon(title) {
    return (
        <DropdownButton title={title}>
          {this._renderUnitsAsMenuItems()}
        </DropdownButton>
    );
  }

// TODO fix css-issue with wrong z-index
  render() {
    //extract value from props so it is not passed down
    let {value, units, ...other} = this.props;
    let {selectedUnit} = this.state;
    let buttonAfter = (units.length > 1) ? this._renderDropdownButtonAddon(selectedUnit) : '';
    let addonAfter = (units.length == 1) ? selectedUnit : '';
    return (
        <NumeralInput buttonAfter={buttonAfter} addonAfter={addonAfter}
                      onChange={this._handleValueChange.bind(this)} {...other} />
    );
  }
}

NumeralInputWithUnits.defaultProps = {
  defaultValue: 0,
  numeralFormat: '[0],0.0[000]',
  bsSize: 'medium',
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
