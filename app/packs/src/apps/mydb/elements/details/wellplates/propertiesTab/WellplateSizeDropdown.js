import React, { Component } from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';

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
  }

  render() {
    const isNew = this.props.wellplate.is_new;
    const { options } = this.state;

    return (
      <Select
        clearable={false}
        value={this.selectOptionOfWellplate(this.props.wellplate)}
        onChange={(option) => this.changeSizeOption(option)}
        options={options}
        disabled={!isNew}
      />
    );
  }

  changeSizeOption(selectedOption) {
    this.props.wellplate.edited = true;
    this.setState({ currentSize: selectedOption });

    const width = parseInt(selectedOption.value.split(';')[0]);
    const height = parseInt(selectedOption.value.split(';')[1]);

    this.props.wellplate.changeSize(width, height);
  }

  selectOptionOfWellplate(wellplate) {
    const optionsKey = `${wellplate.width.toString()};${wellplate.height.toString()}`;

    let foundOption = null;
    this.state.options.forEach((option) => {
      if (option.value === optionsKey) {
        foundOption = option;
      }
    });

    if (foundOption == null) {
      const createdLabel = `${(wellplate.width * wellplate.height).toString()} (${wellplate.width.toString()}x${wellplate.height.toString()})`;
      foundOption = { value: optionsKey, label: createdLabel };
    }

    return foundOption;
  }
}

WellplateSizeDropdown.propTypes = {
  wellplate: PropTypes.object.isRequired,
};
