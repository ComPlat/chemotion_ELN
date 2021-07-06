import React, { Component } from 'react';

export default class CommonInput extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.value,
    };

    this.onBlur = this.onBlur.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  onBlur(e) {
    this.props.onCompleteEdit(e.target.value);
  }

  onChange(e) {
    this.setState({ value: e.target.value });
  }

  render() {
    const { placeholder } = this.props;
    const { value } = this.state;

    return (
      <input
        value={value || ''}
        placeholder={placeholder || ''}
        onBlur={this.onBlur}
        onChange={this.onChange}
      />
    );
  }
}
