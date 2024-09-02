// eslint-disable-next-line max-classes-per-file
import React, { Component } from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import Wellplate from 'src/models/Wellplate';

class Option {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  get label() {
    const size = this.height * this.width;
    if (size === 0) {
      return 'not yet chosen';
    }
    return `${size} (${this.width}x${this.height})`;
  }
}

export default class WellplateSizeDropdown extends Component {
  constructor(props) {
    super(props);

    const rawOptions = [
      new Option(0, 0),
      new Option(24, 16),
      new Option(12, 8),
      new Option(6, 4),
      new Option(4, 3)];

    const options = rawOptions.map((option) => (
      { value: option, label: option.label }
    ));

    this.state = { options };

    const { wellplate } = this.props;
    this.state.currentSize = this.selectOptionOfWellplate(wellplate);
  }

  changeSizeOption(selectedOption) {
    const { wellplate, triggerUIUpdate } = this.props;
    wellplate.edited = true;
    this.setState({ currentSize: selectedOption });

    const width = parseInt(selectedOption.value.width, 10);
    const height = parseInt(selectedOption.value.height, 10);

    wellplate.changeSize(width, height);

    triggerUIUpdate({ type: 'size' });
  }

  selectOptionOfWellplate(wellplate) {
    const { options } = this.state;

    const option = options.find((o) => o.width === wellplate.width && o.height === wellplate.height);
    return option !== undefined ? option : new Option(wellplate.width, wellplate.height);
  }

  render() {
    const { wellplate } = this.props;

    const shouldBeDisabled = !wellplate.is_new && wellplate.originalSize > 0;
    const { options } = this.state;

    return (
      <Select
        clearable={false}
        value={this.selectOptionOfWellplate(wellplate)}
        onChange={(option) => this.changeSizeOption(option)}
        options={options}
        disabled={shouldBeDisabled}
      />
    );
  }
}

WellplateSizeDropdown.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  triggerUIUpdate: PropTypes.func.isRequired,
};
