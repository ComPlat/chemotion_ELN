import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { Button } from 'react-bootstrap';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import { aviatorNavigation } from 'src/utilities/routesUtils';

const spec = {
  drop(props, monitor) {
    const { field, onChange } = props;
    onChange({ reaction_id: monitor.getItem().element.id }, field.id);
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

const hasAuth = (id) => {
  if (typeof id === 'string' && id.includes('error')) {
    return false;
  }
  return true;
};

const noAuth = (el) => (
  <div className="text-center dnd-zone">
    <h4>
      {el.id.split(':')[2]}
      <i className="fa fa-eye-slash ms-1" aria-hidden="true" />
    </h4>
  </div>
);

function elementError() {
  return (
    <div className="text-danger text-center">
      <i className="fa fa-exclamation-triangle me-1" aria-hidden="true" />
      <span className="fw-bold">Internal Server Error: Reaction can not be found!</span>
    </div>
  );
}

class ResearchPlanDetailsFieldReaction extends Component {
  constructor(props) {
    super(props);
    this.state = {
      idle: true,
      reaction: {
        id: null
      },
      error: false
    };
  }

  componentDidMount() {
    const { field } = this.props;
    if (field && field.value && field.value.reaction_id && hasAuth(field.value.reaction_id)) {
      this.fetch();
    }
  }

  componentDidUpdate() {
    const { field } = this.props;
    const { idle, reaction } = this.state;
    if (idle && field.value.reaction_id !== reaction.id && hasAuth(reaction.id)) {
      this.setState({ idle: false }, this.fetch);
    }
  }

  fetch() {
    const { field } = this.props;
    ReactionsFetcher.fetchById(field.value.reaction_id)
      .then((reaction) => {
        if (reaction && reaction.id) {
          this.setState({ idle: true, reaction });
        } else {
          console.error('Fetched reaction does not contain an id or is in incorrect format:', reaction);
          this.setState({ idle: true, error: true });
        }
      })
      .catch((error) => {
        console.error('Error fetching reaction:', error);
        this.setState({ idle: true, error: true });
      });
  }

  showReaction() {
    const { reaction } = this.state;
    aviatorNavigation(reaction.type, reaction.id, true, false);
    ElementActions.fetchReactionById(reaction.id);
  }

  renderReaction(reaction) {
    if (!hasAuth(reaction.id)) {
      return noAuth(reaction);
    }
    const { edit } = this.props;
    const link = (
      <div className="p-3">
        <Button
          variant="light"
          size="sm"
          onClick={() => this.showReaction()}
          className="border-dark"
        >
          {reaction.title()}
        </Button>
      </div>
    );

    let image;
    if (reaction.svgPath) {
      image = <img src={reaction.svgPath} alt={reaction.title()} className="img-fluid w-100" />;
    }

    return (
      <div className={`${!edit ? 'border' : ''} text-start`}>
        {link}
        <div className="text-center mb-0 mw-100">
          {image}
        </div>
      </div>
    );
  }

  renderEdit() {
    const { connectDropTarget, isOver, canDrop } = this.props;
    const { reaction, error } = this.state;
    if (!hasAuth(reaction.id)) {
      return noAuth(reaction);
    }
    let content;
    if (error) {
      content = elementError();
    } else if (reaction.id) {
      content = this.renderReaction(reaction);
    } else {
      content = 'Drop reaction here.';
    }
    return connectDropTarget(
      <div className={`p-3 text-center mb-3 ${(isOver || canDrop)
        ? 'dnd-zone dnd-zone-over' : 'dnd-zone'} `}
      >
        {content}
      </div>
    );
  }

  renderStatic() {
    const { reaction, error } = this.state;
    let content;
    if (error) {
      content = elementError();
    } else if (reaction.id) {
      content = this.renderReaction(reaction);
    } else {
      content = null;
    }
    return content;
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit();
    }
    return this.renderStatic();
  }
}

ResearchPlanDetailsFieldReaction.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  edit: PropTypes.bool,
};

export default DropTarget(DragDropItemTypes.REACTION, spec, collect)(ResearchPlanDetailsFieldReaction);
