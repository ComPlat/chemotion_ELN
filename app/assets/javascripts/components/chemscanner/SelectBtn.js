import React from 'react';
import PropTypes from 'prop-types';

export default class SelectBtn extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    const {
      uid, cdIdx, idx, onClick
    } = this.props;
    onClick(uid, cdIdx, idx);
  }

  render() {
    const { selected } = this.props;
    const className = selected ? 'fa-check-circle' : 'fa-check-circle-o';

    return (
      <button
        className="remove-btn btn btn-xs"
        onClick={this.onClick}
      >
        <i className={`fa ${className}`} />
      </button>
    );
  }
}

SelectBtn.propTypes = {
  onClick: PropTypes.func.isRequired,
  uid: PropTypes.string.isRequired,
  idx: PropTypes.number.isRequired,
  cdIdx: PropTypes.number.isRequired,
  selected: PropTypes.bool.isRequired
};
