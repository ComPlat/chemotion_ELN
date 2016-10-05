import React from 'react';
import {Label} from 'react-bootstrap';

export default class ElementReactionLabels extends React.Component {
  constructor(props) {
    super(props);

    this.handleOnClick = this.handleOnClick.bind(this)
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
    if ((!element.reactions_product_samples || element.reactions_product_samples.length == 0) &&
       (!element.reactions_starting_material_samples || element.reactions_starting_material_samples.length == 0))
      return (<span></span>)

    let reaction = <i className='icon-reaction'/>
    let labelStyle = {
      backgroundColor:'white',
      color:'black',
      border: '1px solid grey'
    }

    return (
      <div style={{display: 'inline-block'}} onClick={this.handleOnClick}>
        <span className="collection-label" key={element.id}>
        <Label>{reaction}</Label>
        </span>
      </div>
    )
  }
}
