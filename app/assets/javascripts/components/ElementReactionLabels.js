import React from 'react';
import {Label} from 'react-bootstrap';

export default class ElementReactionLabels extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hover: false
    }

    this.toggleHover = this.toggleHover.bind(this)
    this.handleOnClick = this.handleOnClick.bind(this)
  }

  toggleHover() {
    this.setState({
      hover: !this.state.hover
    })
  }

  handleOnClick(e) {
    let {element} = this.props

    let reaction_id = element.reactions_product_samples.length > 0
                      ? element.reactions_product_samples[0].reaction_id
                      : element.reactions_starting_material_samples[0].reaction_id

    let url = "/collection/" + element.collection_labels[0].id +
               "/reaction/" + reaction_id
    Aviator.navigate(url)

    e.stopPropagation()
  }

  render() {
    let {element} = this.props

    // If the Sample has no role in any reaction. Don't display the icon
    if (element.reactions_product_samples.length == 0 &&
        element.reactions_starting_material_samples.length == 0)
      return (<div></div>)

    let reaction = <i className='icon-reaction'/>
    let labelStyle = {
      backgroundColor:'white',
      color:'black',
      border: '1px solid grey'
    }

    let {hover} = this.state
    if (hover == true) {
     labelStyle.backgroundColor = '#19B5FE'
    } else {
      labelStyle.backgroundColor = 'white'
    }

    return (
      <div style={{display: 'inline-block'}} onClick={this.handleOnClick}>
        <span className="collection-label" key={element.id}>
        <Label style={labelStyle}
               onMouseEnter={this.toggleHover}
               onMouseLeave={this.toggleHover}>
          {reaction}
        </Label>
        </span>
      </div>
    )
  }
}
