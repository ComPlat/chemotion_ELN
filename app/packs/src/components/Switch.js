import React from 'react';

export default class Switch extends React.Component {
  constructor(props) {
    super(props)

    this.toggle = this.toggle.bind(this)
  }

  toggle(checked) {
    this.props.onChange(checked)
  }

  render() {
    const {
      checked,
      checkedChildren,
      unCheckedChildren,
      ...restProps
    } = this.props

    let className = "switch "
    className += checked ? "switch-checked" : ""

    return (
      <span tabIndex="0" onClick={() => this.toggle(checked)}
        className={className} {...restProps}>
        <span className="switch-inner">
          {checked ? checkedChildren : unCheckedChildren}
        </span>
      </span>
    )
  }
}

