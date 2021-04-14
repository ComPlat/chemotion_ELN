import React from 'react';
// import PropTypes from 'prop-types';

export default class EditableCell extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      editing: false,
      val: props.value
    }

    this.handleChange = this.handleChange.bind(this)
    this.handleDoubleClick = this.handleDoubleClick.bind(this)
    this.handleBlur = this.handleBlur.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    this.setState({val: nextProps.value})
  }

  handleBlur(e) {
    let newValue = e.target.value
    let {uid, type, onCellValueChange} = this.props

    this.setState({
      editing: false,
      val: newValue
    }, onCellValueChange(uid, type, newValue))
  }

  handleChange(e) {
    let {inputOnChange} = this.props
    let newValue = inputOnChange(this.state.val, e.target.value)

    this.setState({val: newValue})
  }

  handleDoubleClick() {
    this.setState({editing: true})
  }

  render() {
    let {uid, inputPlaceholder} = this.props
    let {editing, val} = this.state

    let displayValue = editing ? '' : val

    let cellContent = ''
    let className = ''
    if (editing) {
      className = 'editable-selected'
      cellContent = (
        <input placeholder={inputPlaceholder} style={{width: "100%"}} value={val}
               onChange={this.handleChange} onBlur={this.handleBlur} />
      )
    }

    return (
      <div className={className} onDoubleClick={this.handleDoubleClick}>
        {cellContent}
        <span>
          {displayValue}
        </span>
      </div>
    )
  }
}

// EditableCell.propTypes = {
//   inputOnChange: PropTypes.func.isRequired,
//   onCellValueChange: PropTypes.func.isRequired
// }
