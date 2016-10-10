import React from 'react';
import {Label, Modal, Button} from 'react-bootstrap';

import ElementActions from './actions/ElementActions'
import ElementStore from './stores/ElementStore'

export default class ElementReactionLabels extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      showWarning: false,
      clicked: false
    }

    let {element} = props
    this.reaction_id = this.getReactionId(element)

    this.handleOnClick = this.handleOnClick.bind(this)
    this.closeWarning = this.closeWarning.bind(this)

    this.onStoreChange = this.onStoreChange.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    let {element} = nextProps
    this.reaction_id = this.getReactionId(element)
  }

  componentDidMount() {
    ElementStore.listen(this.onStoreChange)
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onStoreChange)
  }

  getReactionId(element) {
    if (element.reactions_product_samples && element.reactions_product_samples.length > 0) {
      return element.reactions_product_samples[0].reaction_id
    }

    if (element.reactions_starting_material_samples && element.reactions_starting_material_samples.length > 0) {
      return element.reactions_starting_material_samples[0].reaction_id
    }
  }

  onStoreChange(state) {
    if (this.state.showWarning != state.elementWarning) {
      this.setState({
        showWarning: state.elementWarning
      })
    }
  }

  closeWarning() {
    this.setState({showWarning: false})
    ElementActions.closeWarning()
  }

  handleOnClick(e) {
    let {element} = this.props

    ElementActions.tryFetchReactionById(this.reaction_id)
    this.setState({clicked: true})
    e.stopPropagation()
  }

  render() {
    let {element} = this.props
    let {showWarning, clicked} = this.state

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
      <div style={{display: 'inline-block'}}>
        <div onClick={this.handleOnClick}>
          <span className="collection-label" key={element.id}>
            <Label>{reaction}</Label>
          </span>
        </div>
        {/* <div style={{clear: 'both'}} /> */}
        <div className="center">
          <Modal show={showWarning && clicked} onHide={this.closeWarning}>
            <Modal.Header closeButton>
              <Modal.Title>No Access to Element</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              Sorry, you cannot access this Reaction.
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={this.closeWarning}>Close</Button>
            </Modal.Footer>
          </Modal>
        </div>
      </div>
    )
  }
}
