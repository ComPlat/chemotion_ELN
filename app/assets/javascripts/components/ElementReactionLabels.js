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

    this.handleOnClick = this.handleOnClick.bind(this)
    this.closeWarning = this.closeWarning.bind(this)

    this.onStoreChange = this.onStoreChange.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    let {element} = nextProps
  }

  componentDidMount() {
    ElementStore.listen(this.onStoreChange)
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onStoreChange)
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

    ElementActions.tryFetchReactionById(element.tag.taggable_data.reaction_id)
    this.setState({clicked: true})
    e.stopPropagation()
  }

  render() {
    let {element} = this.props

    if (!element.tag || !element.tag.taggable_data ||
        !element.tag.taggable_data.reaction_id)
      return (<span></span>)

    let {showWarning, clicked} = this.state

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
