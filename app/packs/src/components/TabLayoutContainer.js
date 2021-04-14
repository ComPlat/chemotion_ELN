import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Immutable from 'immutable';

import ArrayUtils from './utils/ArrayUtils';
import TabLayoutCell from './TabLayoutCell'

export default class TabLayoutContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: Immutable.List(props.visible),
      hidden: Immutable.List(props.hidden)
    }

    this.moveLayout = this.moveLayout.bind(this)
  }

  moveLayout(dragItem, hoverItem) {
    let {visible, hidden} = this.state

    if (!dragItem.isHidden && hoverItem.isHidden && visible.size == 1) return

    if (dragItem.isHidden)
      hidden = hidden.splice(dragItem.index, 1)
    else if (visible.size > 1)
      visible = visible.splice(dragItem.index, 1)

    if (hoverItem.isHidden)
      hidden = hidden.splice(hoverItem.index, 0, dragItem.cell)
    else
      visible = visible.splice(hoverItem.index, 0, dragItem.cell)

    if (hidden.size == 0) {
      hidden = ArrayUtils.pushUniq(hidden, "hidden")
    } else if (hidden.size > 1) {
      hidden = ArrayUtils.removeFromListByValue(hidden, "hidden")
    }

    this.setState({visible: visible, hidden: hidden})
  }

  render() {
    const { visible, hidden } = this.state
    const { isElementDetails, tabTitles } = this.props
    let moveLayout = this.moveLayout

    return (
      <table className="layout-container">
      <tbody><tr>
        {visible.map(function(e, index) {
          return (<TabLayoutCell key={index + "_visible"} cell={e}
                                 isHidden={false} index={index}
                                 moveLayout={moveLayout}
                                 title={tabTitles[e] || e}
                                 isElementDetails={isElementDetails}/>)
        })}
        {hidden.map(function(e, index) {
          return (<TabLayoutCell key={index + "_hidden"} cell={e}
                                 isHidden={true} index={index}
                                 moveLayout={moveLayout}
                                 title={tabTitles[e] || e}	 
                                 isElementDetails={isElementDetails}/>)
        })}
      </tr></tbody>
      </table>
    )
  }
}

TabLayoutContainer.propTypes = {
  tabTitles: PropTypes.object,
}

TabLayoutContainer.defaultProps = {
  tabTitles: {},
}

