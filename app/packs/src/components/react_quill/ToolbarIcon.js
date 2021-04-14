import React from 'react';
import PropTypes from 'prop-types';

export default class ToolbarIcon extends React.Component {
  constructor(props) {
    super(props);

    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    const { onClick } = this.props;
    if (onClick) onClick();
  }

  render() {
    const { icon } = this.props;
    if (React.isValidElement(icon)) {
      return (
        <button
          style={{ width: 'auto' }}
          onClick={this.onClick}
        >
          {icon}
        </button>
      );
    }

    return (
      <button
        className={`ql_${icon}`}
        style={{ width: 'auto' }}
        onClick={this.onClick}
      >
        <span>
          {icon.toUpperCase()}
        </span>
      </button>
    );
  }
}

ToolbarIcon.propTypes = {
  icon: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.element
  ]),
  onClick: PropTypes.func
};

ToolbarIcon.defaultProps = {
  icon: <span />,
  onClick: null
};
