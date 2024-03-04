import React, { Component } from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import Wellplate from 'src/models/Wellplate';

function newOption(wellplate, optionsKey) {
  const size = (wellplate.width * wellplate.height).toString();
  const width = wellplate.width.toString();
  const height = wellplate.height.toString();
  return {
    value: optionsKey,
    label: `${size} (${width}x${height})`
  };
}

export default class WellplateSizeDropdown extends Component {
  constructor(props) {
    super(props);

    this.state = {
      options: [
        { value: '24;16', label: '384 (24x16)' },
        { value: '12;8', label: '96 (12x8)' },
        { value: '6;4', label: '24 (6x4)' },
        { value: '4;3', label: '12 (4x3)' }
      ]
    };
    const { wellplate } = this.props;
    this.state.currentSize = this.selectOptionOfWellplate(wellplate);
  }

  changeSizeOption(selectedOption) {
    const { wellplate, triggerUIUpdate } = this.props;
    wellplate.edited = true;
    this.setState({ currentSize: selectedOption });

    const width = parseInt(selectedOption.value.split(';')[0], 10);
    const height = parseInt(selectedOption.value.split(';')[1], 10);

    wellplate.changeSize(width, height);

    triggerUIUpdate({ type: 'size' });
  }

  selectOptionOfWellplate(wellplate) {
    const optionsKey = `${wellplate.width.toString()};${wellplate.height.toString()}`;

    const { options } = this.state;

    const option = options.find((o) => o.value === optionsKey);
    return option !== undefined ? option : newOption(wellplate, optionsKey);
  }

  render() {
    const { wellplate } = this.props;

    const isNew = wellplate.is_new;
    const { options } = this.state;

    return (
      <Select
        clearable={false}
        value={this.selectOptionOfWellplate(wellplate)}
        onChange={(option) => this.changeSizeOption(option)}
        options={options}
        disabled={!isNew}
      />
    );
  }
}

WellplateSizeDropdown.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  triggerUIUpdate: PropTypes.func.isRequired,
};
