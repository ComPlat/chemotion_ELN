import React, {Component} from 'react';
import NumeralInput from '../NumeralInput'
import NumeralInputWithUnits from '../NumeralInputWithUnits'

export default class NumeralInputWithUnitsExample extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let ajaxCall = (unit, nextUnit, value) => {
      console.log("ajax call with unit: " + unit + " nextUnit: " + nextUnit + " and value: " + value);
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
    };
    return (
      <div>
        NumeralInput-Component with success and large and defaultValue
        <NumeralInput bsStyle='success' bsSize='large' value='10'/>
        NumeralInput-Component with defaultValue and numeralFormat
        <NumeralInput value='10.2' numeralFormat='0,0.0'/>
        NumeralInputWithUnits-Component with no props ~= NumeralInput-Component
        <NumeralInputWithUnits />
        NumeralInputWithUnits-Component with just one unit
        <NumeralInputWithUnits units={['t']}/>
        NumeralInputWithUnits-Component with unit-select and convertCallback
        <NumeralInputWithUnits units={['g', 'mol']}
                               convertValueFromUnitToNextUnit={(unit, nextUnit, value) => ajaxCall(unit, nextUnit, value)}/>
      </div>
    );
  }
}
