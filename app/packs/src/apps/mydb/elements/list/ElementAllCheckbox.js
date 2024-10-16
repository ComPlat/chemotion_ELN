import React from 'react'
import PropTypes from 'prop-types'
import Immutable from 'immutable'

import UIActions from 'src/stores/alt/actions/UIActions'

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

  showOptions() {
    this.setState({ showOptions: !this.state.showOptions })
  }

  selectAll(option) {
    if (option == null) option = this.state.currentOption
    let range = this.options[option]

    UIActions.checkAllElements({
      type: this.props.type,
      range: range
    })
    this.setState({
      showOptions: false,
      currentOption: option
    })
  }

  render() {
    const { showOptions } = this.state;
    const { checkedAll, checkedIds } = this.props;

    let checkMarkClass = '';
    if (checkedAll == true) {
      checkMarkClass = 'fa-check';
    } else if (checkedIds && checkedIds.size > 0) {
      checkMarkClass = 'fa-minus';
    }

    return (
      <div className="all-checkbox" onClick={this.showOptions}>
        <div className="checkbox-dropdown">
          <span className="span-checkbox" onClick={this.toggleCheckbox}>
            <i className={`fa ${checkMarkClass}`}/>
          </span>
          <i className="fa fa-caret-down ms-2" />
        </div>
        {showOptions && (
          <div className="checkbox-options">
            <div onClick={() => this.selectAll(0)}>Current page</div>
            <div onClick={() => this.selectAll(1)}>All pages</div>
            <div onClick={() => this.selectAll(2)}>None</div>
          </div>
        )}
      </div>
    )
  }
}

ElementAllCheckbox.propTypes = {
  type: PropTypes.string.isRequired,
  checkedAll: PropTypes.bool.isRequired,
  checkedIds: PropTypes.instanceOf(Immutable.List),
}
