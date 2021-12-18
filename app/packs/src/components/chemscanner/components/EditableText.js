import React from 'react';
import PropTypes from 'prop-types';

export default class EditableText extends React.Component {
  constructor(props) {
    super(props);

    this.state = { editing: false };

    this.handleDoubleClick = this.handleDoubleClick.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }

  handleBlur(e) {
    const { id, field, onFinishUpdate } = this.props;
    if (!id) return;

    const newValue = e.target.value;
    this.setState({ editing: false }, onFinishUpdate(id, field, newValue));
  }

  handleDoubleClick() {
    if (!this.props.id) return;

    this.setState({ editing: true });
  }

  render() {
    const { field, value } = this.props;
    const { editing } = this.state;

    let cellContent = value;
    if (editing) {
      cellContent = (
        <input
          style={{ width: '100%' }}
          defaultValue={value}
          onBlur={this.handleBlur}
        />
      );
    }

    return (
      <div onDoubleClick={this.handleDoubleClick}>
        <b>{field}: </b>
        {cellContent}
      </div>
    );
  }
}

EditableText.propTypes = {
  id: PropTypes.number,
  field: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onFinishUpdate: PropTypes.func.isRequired
};

EditableText.defaultProps = {
  id: 0,
};
