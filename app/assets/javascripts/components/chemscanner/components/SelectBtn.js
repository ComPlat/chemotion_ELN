import React from 'react';
import PropTypes from 'prop-types';

export default class SelectBtn extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    const {
      itemId, onClick
    } = this.props;
    onClick(itemId);
  }

  render() {
    const { selected } = this.props;
    const className = selected ? 'fa-check-circle' : 'fa-check-circle-o';

    return (
      <button
        className="right-btn btn btn-xs"
        onClick={this.onClick}
      >
        <i className={`fa ${className}`} />
      </button>
    );
  }
}

SelectBtn.propTypes = {
  onClick: PropTypes.func.isRequired,
  itemId: PropTypes.number.isRequired,
  selected: PropTypes.bool.isRequired
};
