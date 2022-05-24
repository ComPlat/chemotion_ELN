import React from 'react';
import PropTypes from 'prop-types';

export default class DeleteBtn extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  onClick(e) {
    const { param, onClick } = this.props;
    e.stopPropagation();
    e.preventDefault();
    onClick(param);
  }

  render() {
    const { pullLeft } = this.props;
    const className = pullLeft ? 'left-btn' : 'right-btn';

    return (
      <button
        className={`${className} btn btn-xs`}
        onClick={this.onClick}
      >
        <i className="fa fa-times" />
      </button>
    );
  }
}

DeleteBtn.propTypes = {
  onClick: PropTypes.func.isRequired,
  pullLeft: PropTypes.bool,
  param: PropTypes.object.isRequired // eslint-disable-line react/forbid-prop-types
};

DeleteBtn.defaultProps = {
  pullLeft: false,
};
