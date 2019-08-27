import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { DropTarget } from 'react-dnd'
import DragDropItemTypes from '../DragDropItemTypes'

import ElementActions from '../actions/ElementActions';
import { UrlSilentNavigation } from '../utils/ElementUtils';
import ReactionsFetcher from '../fetchers/ReactionsFetcher'

const spec = {
  drop(props, monitor) {
    const { field, onChange } = props
    onChange({ reaction_id: monitor.getItem().element.id }, field.id)
  }
}

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
})

class ResearchPlanDetailsFieldReaction extends Component {

  constructor(props) {
    super(props);
    this.state = {
      idle: true,
      reaction: {
        id: null
      }
    }
  }

  componentDidUpdate() {
    const { field } = this.props
    const { idle, reaction } = this.state

    if (idle && field.value.reaction_id !== reaction.id) {
      this.setState({ idle: false }, this.fetch)
    }
  }

  fetch() {
    const { field } = this.props

    ReactionsFetcher.fetchById(field.value.reaction_id).then(reaction => {
      this.setState({ idle: true, reaction: reaction })
    })
  }

  showReaction() {
    const { reaction } = this.state;
    UrlSilentNavigation(reaction);
    ElementActions.fetchReactionById(reaction.id)
  }

  renderReaction(reaction) {
    const { edit } = this.props
    const title = reaction.title()

    let link
    if (edit) {
      link = (
        <p className="float-left">
          Reaction: <a role="link" tabIndex={0} onClick={() => this.showReaction()} style={{ cursor: 'pointer' }}>
            {title}
          </a>
        </p>
      )
    }

    return (
      <div className="research-plan-field-reaction">
        {link}
        <div className="image-container">
          <img src={reaction.svgPath} alt={title} />
          <p>{reaction.name}</p>
        </div>
      </div>
    )
  }

  renderEdit() {
    const { field, index, connectDropTarget, isOver, canDrop } = this.props
    const { reaction } = this.state

    let className = 'drop-target'
    if (isOver) className += ' is-over'
    if (canDrop) className += ' can-drop'

    return connectDropTarget(
      <div className={className}>
        {reaction.id ? this.renderReaction(reaction) : 'Drop reaction here.'}
      </div>
    )
  }

  renderStatic() {
    const { field } = this.props
    const { reaction } = this.state

    return reaction.id ? this.renderReaction(reaction) : ''
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit()
    } else {
      return this.renderStatic()
    }
  }
}

ResearchPlanDetailsFieldReaction.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
}

export default DropTarget(DragDropItemTypes.REACTION, spec, collect)(ResearchPlanDetailsFieldReaction);
