import React from 'react'

import { ButtonGroup, DropdownButton, MenuItem, Button } from 'react-bootstrap'
import UIActions from './actions/UIActions'
import Select from 'react-select'

export default class ElementAllCheckbox extends React.Component {
  constructor(props) {
    super(props)

    this.state =  {
      showOptions: false,
      currentOption: 2
    }

    this.options = ["current", "all", "none"]

    this.toggleCheckbox = this.toggleCheckbox.bind(this)
    this.showOptions = this.showOptions.bind(this)
    this.selectAll = this.selectAll.bind(this)
  }

  toggleCheckbox(e) {
    let {currentOption} = this.state
    currentOption = (currentOption + 1) % 3

    this.setState({currentOption: currentOption}, this.selectAll)

    e.preventDefault()
    e.stopPropagation()
  }

  showOptions(e) {
    this.setState({ showOptions: !this.state.showOptions })
  }

  selectAll(option) {
    if (option == null) option = this.state.currentOption
    let range = this.options[option]

    let newChecked = !this.props.checked
    let params = {
      type: this.props.type,
      range: range
    }

    if(newChecked) {
      UIActions.checkAllElements(params)
    } else {
      UIActions.uncheckAllElements(params)
    }

    this.setState({ showOptions: false, currentOption: option })
  }

  render() {
    let {showOptions, currentOption} = this.state
    let {ui, type} = this.props

    let checkMarkClass = "fa "
    if (ui.checkedAll == true) {
      checkMarkClass += "fa-check"
    } else if (ui.checkedIds && ui.checkedIds.size > 0) {
      checkMarkClass += "fa-minus"
    }
    let checkMark = (<i className={checkMarkClass}/>)

    let optionStyle = {}
    if (showOptions) {
      optionStyle.display = "block"
    } else {
      optionStyle.display = "none"
    }

    return (
      <div className="all-checkbox" onClick={this.showOptions}>
        <div className="checkbox-dropdown">
          <span className="span-checkbox" onClick={this.toggleCheckbox}>
            {checkMark}
          </span>
          &nbsp;&nbsp;
          <i className="fa fa-caret-down"/>
        </div>
        <div className="checkbox-options" style={optionStyle}>
          <div onClick={() => this.selectAll(0)}>Current page</div>
          <div onClick={() => this.selectAll(1)}>All pages</div>
          <div onClick={() => this.selectAll(2)}>None</div>
        </div>
      </div>
    )
  }
}
