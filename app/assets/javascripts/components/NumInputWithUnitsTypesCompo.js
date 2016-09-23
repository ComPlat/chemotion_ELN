import React, {Component} from 'react';
import { FormGroup,FormControl, ControlLabel, InputGroup,Button } from 'react-bootstrap';
import { metPreConv, metPrefSymbols } from './utils/metricPrefix';

export default class NumInputWithUnitsTypesCompo extends Component {
  constructor(props) {
    super(props);

    this.state = {
      editMode: false,
      editValue: this.initEditValue(),
      displayedUnit: this.identifyUnit(this.props.material.amount_unit),
      metricPrefix: this.props.metricPrefix,
    }
  }

  valueBaseOnUnit(inputUnit, metricPrefix) {
    const { material, precision } = this.props;
    let value;
    switch(inputUnit) {
      case 'g':
        value = material.amount_g;
        break;
      case 'l':
        value = material.amount_l;
        break;
      case 'mol':
        value = material.amount_mol;
        break;
    }
    return metPreConv(value, "none", metricPrefix).toPrecision(precision)
  }

  initEditValue() {
    const { material, metricPrefix } = this.props;
    const initDisplayedUnit = this.identifyUnit(material.amount_unit)
    return this.valueBaseOnUnit(initDisplayedUnit, metricPrefix);
  }

  displayedValue() {
    const { editMode, editValue, metricPrefix, displayedUnit } = this.state;
    return editMode
      ? editValue
      : this.valueBaseOnUnit(displayedUnit, metricPrefix);
  }

  identifyUnit(inputUnit) {
    const { unitTypes } = this.props;
    const ind = unitTypes.indexOf(inputUnit);
    return ind === -1 ? 'g' : unitTypes[ind];
  }

  onFocus(e, displayedValue) {
    this.setState({
      editValue: displayedValue,
      editMode: true
    });
  }

  onInputChange(e, displayedUnit, metricPrefix) {
    const newValue = e.target.value;
    const amount = {
      value: metPreConv(newValue, metricPrefix, "none"),
      unit: displayedUnit,
    };
    this.setState({ editValue: newValue });
    this.updateMaterial(amount);
  }

  onBlur(e) {
    this.setState({ editMode: false });
  }

  updateMaterial(amount) {
    this.props.onChange(amount);
  }

  render() {
    const { material, metricPrefixes, precision, unitTypeSwitch,
            unitTypes, bsStyle, bsSize, disabled } = this.props;
    const { metricPrefix } = this.state;
    const displayedUnit = this.identifyUnit(this.state.displayedUnit);
    const displayedValue = this.displayedValue(displayedUnit);

    return (
      <div>
        <InputGroup>
          <UnitTypeSwitch that={this}
                          material={material}
                          show={unitTypeSwitch}
                          metricPrefix={metricPrefix}
                          metricPrefixes={metricPrefixes}
                          bsSize={bsSize}
                          displayedUnit={displayedUnit} />
          <FormControl type='text'
                        disabled={disabled}
                        bsStyle={bsStyle}
                        bsSize={bsSize}
                        value={displayedValue}
                        onFocus={ e => this.onFocus(e, displayedValue) }
                        onChange={ e => this.onInputChange(e, displayedUnit, metricPrefix) }
                        onBlur={ e => this.onBlur(e) } />
          <PrefixSwitch that={this}
                        material={material}
                        metricPrefix={metricPrefix}
                        metricPrefixes={metricPrefixes}
                        bsSize={bsSize}
                        displayedUnit={displayedUnit} />
        </InputGroup>
      </div>
    );
  }
}

const UnitTypeSwitch = ({ that, material, show, metricPrefix, metricPrefixes, bsSize, displayedUnit }) => {
  let unitType, typeSwitchBsStyle;
  switch(displayedUnit) {
    case 'g':
      unitType = 'M';
      typeSwitchBsStyle = 'success';
      break;
    case 'l':
      unitType = 'V';
      typeSwitchBsStyle = 'primary';
      break;
    case 'mol':
      unitType = 'ML';
      typeSwitchBsStyle = 'warning';
      break;
  }
  typeSwitchBsStyle = material.error_mass ? 'danger' : typeSwitchBsStyle;

  const toggleUnitType = () => {
    const currentUnit = displayedUnit;
    const nextUnit = currentUnit === 'l' ? 'g' : 'l';
    const amount = {
      value: metPreConv(that.state.editValue, metricPrefix, "none"),
      unit: nextUnit,
    };
    that.updateMaterial(amount);
    that.setState({ displayedUnit: nextUnit });
  }

  return(
    show
      ? <InputGroup.Button>
          <Button active
                  onClick={toggleUnitType}
                  bsStyle={typeSwitchBsStyle}
                  bsSize={bsSize}
                  style={{padding:"7px 2px", minWidth: 20}}>
            { unitType }
          </Button>
        </InputGroup.Button>
      : null
  );
}

const PrefixSwitch = ({ that, material, metricPrefix, metricPrefixes, bsSize, displayedUnit }) => {
  const prefixAndUnit = metPrefSymbols[metricPrefix] + displayedUnit;

  const togglePrefix = () => {
    const ind = metricPrefixes.indexOf(metricPrefix);
    const nextInd = (ind + 1) % metricPrefixes.length;
    that.setState({ metricPrefix: metricPrefixes[nextInd] });
  }

  return(
    <InputGroup.Button>
      <Button active
              onClick={togglePrefix}
              bsSize={bsSize}
              style={{padding:"7px 2px", minWidth: 20}}>
        { prefixAndUnit }
      </Button>
    </InputGroup.Button>
  );
}

NumInputWithUnitsTypesCompo.propTypes = {
  material: React.PropTypes.object,
  metricPrefix: React.PropTypes.string,
  metricPrefixes: React.PropTypes.array,
  precision: React.PropTypes.number,
  unitTypeSwitch: React.PropTypes.bool,
  unitTypes: React.PropTypes.array,
  bsStyle: React.PropTypes.string,
  bsSize: React.PropTypes.string,
  disabled: React.PropTypes.bool,
  onChange: React.PropTypes.func,
};

NumInputWithUnitsTypesCompo.defaultProps = {
  material: {},
  metricPrefix: 'milli',
  metricPrefixes: ['milli','none','micro'],
  precision: 3,
  unitTypeSwitch: false,
  unitTypes: ['g', 'l', 'mol'],
  bsStyle: "default",
  bsSize: "small",
  disabled: false,
};
