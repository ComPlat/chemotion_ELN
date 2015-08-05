import React, {Component} from 'react';
import {DropdownButton, MenuItem} from 'react-bootstrap';
import NumeralInput from './NumeralInput';

export default class NumeralInputWithUnits extends Component {
  constructor(props) {
    super(props);

    let {value, units} = props;
    this.state = {
      selectedUnit: units[0],
      value: value
    };
  }

  _handleUnitSelect(unit) {
    let {value, selectedUnit} = this.state;
    let convertedValue = this.props._convertValueFromUnitToNextUnit(selectedUnit, unit, value);
    this.setState({
      selectedUnit: unit,
      value: convertedValue
    });
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
        <MenuItem key={'unit_' + index} onSelect={() => this._handleUnitSelect(unit)}>
          {unit}
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
    let {units, bsSize, bsStyle, numeralFormat} = this.props;
    let {selectedUnit, value} = this.state;
    let buttonAfter = (units.length > 1) ? this._renderDropdownButtonAddon(selectedUnit) : '';
    let addonAfter = (units.length == 1) ? selectedUnit : '';
    return (
      <NumeralInput buttonAfter={buttonAfter} addonAfter={addonAfter} onChange={(value) => this._handleValueChange(value)}
        value={value} bsSize={bsSize} bsStyle={bsStyle} numeralFormat={numeralFormat}/>
    );
  }
}

NumeralInputWithUnits.defaultProps = {
  value: 0,
  numeralFormat: '0,0.0[000]',
  units: ['g', 'mol'],
  _convertValueFromUnitToNextUnit: (unit, nextUnit, value) => {

    console.log("ajax call with unit: " + unit + " nextUnit: " + nextUnit + " and value: " + value);
    // will be in backend
    let convertedValue = value;
    if (unit && nextUnit && unit != nextUnit) {
      switch (unit) {
        case 'g':
          if (nextUnit == 'mol') {
            convertedValue = value * 2;
          }
          break;
        case 'mol':
          if (nextUnit == 'g') {
            convertedValue = value / 2;
          }
          break;
      }
    }
    console.log("result:" + convertedValue);
    return convertedValue;
  }
};
