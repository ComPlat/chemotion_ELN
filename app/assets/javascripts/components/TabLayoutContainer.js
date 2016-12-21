import React, {Component} from 'react';
import TabLayoutCell from './TabLayoutCell'

export default class TabLayoutContainer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: props.visible,
      hidden: props.hidden
    }

    this.moveLayout = this.moveLayout.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      visible: nextProps.visible,
      hidden: nextProps.hidden
    })
  }

  moveLayout(dragItem, hoverItem) {
    let {visible, hidden} = this.state;

    if (!dragItem.isHidden && hoverItem.isHidden && visible.length == 1) return;

    if (dragItem.isHidden)
      hidden.splice(dragItem.index, 1)
    else if (visible.length > 1)
      visible.splice(dragItem.index, 1)

    if (hoverItem.isHidden)
      hidden.splice(hoverItem.index, 0, dragItem.cell)
    else
      visible.splice(hoverItem.index, 0, dragItem.cell)

    if (hidden.length == 0) {
      hidden.push("hidden")
    }  else if (hidden.length > 1 && hidden[1] == "hidden") {
      hidden.splice(1, 1)
    }

    this.setState({visible: visible, hidden: hidden});
  }

  render() {
    let {visible, hidden} = this.state
    let moveLayout = this.moveLayout

    return (
      <table className="layout-container">
      <tbody><tr>
        {visible.map(function(e, index) {
          return (<TabLayoutCell key={index + "_visible"} cell={e}
                                 isHidden={false} index={index}
                                 moveLayout={moveLayout}/>)
        })}
        {hidden.map(function(e, index) {
          return (<TabLayoutCell key={index + "_hidden"} cell={e}
                                 isHidden={true} index={index}
                                 moveLayout={moveLayout}/>)
        })}
      </tr></tbody>
      </table>
    )
  }
}
