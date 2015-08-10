import React, {Component} from 'react';
import {DropdownButton, MenuItem} from 'react-bootstrap';
import NumeralInput from './NumeralInput';

export default class NumeralInputWithUnits extends Component {
  constructor(props) {
    super(props);

    let {value, units} = props;
    this.state = {
      unit: units[0],
      value: value
    };
  }

  _handleUnitSelect(nextUnit) {
    let {value, unit} = this.state;
    let convertedValue = this.props.convertValueFromUnitToNextUnit(unit, nextUnit, value);
    this.setState({
      unit: nextUnit,
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
    let {unit, value} = this.state;
    let buttonAfter = (units.length > 1) ? this._renderDropdownButtonAddon(unit) : '';
    let addonAfter = (units.length == 1) ? unit : '';
    return (
      <NumeralInput buttonAfter={buttonAfter} addonAfter={addonAfter} onChange={(value) => this._handleValueChange(value)}
        value={value} bsSize={bsSize} bsStyle={bsStyle} numeralFormat={numeralFormat}/>
    );
  }
}

NumeralInputWithUnits.defaultProps = {
  value: 0,
  numeralFormat: '0,0.0[000]',
  units: ['']
};
