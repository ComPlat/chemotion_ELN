import React from 'react';

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

  componentDidUpdate(prevProps) {
    const { value } = this.props;
    if (value !== prevProps.value) {
      this.setState({ val: value })
    }
  }

  handleBlur(e) {
    let { uid, type, onCellValueChange, inputOnChange } = this.props
    let newValue = inputOnChange(this.state.val, e.target.value)

    this.setState({
      editing: false,
      val: newValue
    }, onCellValueChange(uid, type, newValue))
  }

  handleChange(e) {
    let { inputOnChange } = this.props

    this.setState({ val: e.target.value })
  }

  handleDoubleClick() {
    this.setState({ editing: true })
  }

  render() {
    let { uid, inputPlaceholder } = this.props
    let { editing, val } = this.state

    let displayValue = editing ? '' : val

    let cellContent = ''
    let className = ''
    if (editing) {
      className = 'editable-selected'
      cellContent = (
        <input placeholder={inputPlaceholder} style={{ width: "100%" }} value={val}
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
