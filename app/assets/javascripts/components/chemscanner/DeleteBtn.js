import React from 'react';
import PropTypes from 'prop-types';

export default class DeleteBtn extends React.Component {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  onClick() {
    const { obj, onClick } = this.props;
    onClick(obj);
  }

  render() {
    return (
      <button
        className="remove-btn btn btn-xs"
        onClick={this.onClick}
      >
        <i className="fa fa-times" />
      </button>
    );
  }
}

DeleteBtn.propTypes = {
  onClick: PropTypes.func.isRequired,
  obj: PropTypes.object.isRequired
};
