import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { UrlSilentNavigation } from 'src/utilities/routesUtils';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';

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
  <div className="research-plan-no-auth">
    <h4>
      {el.id.split(':')[2]}
      &nbsp;
      <i className="fa fa-eye-slash" aria-hidden="true" />
    </h4>
  </div>
);

function elementError() {
  return (
    <div style={{ color: 'red', textAlign: 'center' }}>
      <i className="fa fa-exclamation-triangle" aria-hidden="true" style={{ marginRight: '5px' }} />
      <span style={{ fontWeight: 'bold' }}>Internal Server Error: Reaction can not be found!</span>
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
    UrlSilentNavigation(reaction);
    ElementActions.fetchReactionById(reaction.id);
  }

  renderReaction(reaction) {
    if (!hasAuth(reaction.id)) {
      return noAuth(reaction);
    }
    const { edit } = this.props;
    const link = (
      <button
        type="button"
        style={{
          cursor: 'pointer',
          color: '#003366',
          backgroundColor: 'transparent',
          border: '1px solid #003366',
          borderRadius: '4px',
          margin: '5px',
          outline: 'none',
        }}
        onClick={() => this.showReaction()}
      >
        {reaction.title()}
      </button>
    );

    let image;
    if (reaction.svgPath) {
      image = <img src={reaction.svgPath} alt={reaction.title()} />;
    }

    const reactionStyle = edit ? {} : {
      border: '1px solid #cccccc',
      padding: '5px',
    };

    return (
      <div className="research-plan-field-reaction" style={reactionStyle}>
        {link}
        <div className="image-container">
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
    let className = 'drop-target';
    if (isOver) className += ' is-over';
    if (canDrop) className += ' can-drop';
    let content;
    if (error) {
      content = elementError();
    } else if (reaction.id) {
      content = this.renderReaction(reaction);
    } else {
      content = 'Drop reaction here.';
    }
    return connectDropTarget(
      <div className={className}>
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
