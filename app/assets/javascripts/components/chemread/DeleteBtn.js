import React from 'react';

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
  onClick: React.PropTypes.func.isRequired,
  obj: React.PropTypes.object.isRequired
};
