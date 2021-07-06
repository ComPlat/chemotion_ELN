import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from '../DragDropItemTypes';
import ElementActions from '../actions/ElementActions';
import { UrlSilentNavigation } from '../utils/ElementUtils';
import SampleName from '../common/SampleName';
import SamplesFetcher from '../fetchers/SamplesFetcher';

const spec = {
  drop(props, monitor) {
    const { field, onChange } = props;
    onChange({ sample_id: monitor.getItem().element.id }, field.id);
  }
};

const collect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

const hasAuth = (id) => {
  if (typeof id === 'string' && id.includes('error')) return false; return true;
};

const noAuth = el => (
  <div className="research-plan-no-auth">
    <h4>{el.id.split(':')[2]}&nbsp;<i className="fa fa-eye-slash" aria-hidden="true" /></h4>
  </div>
);

class ResearchPlanDetailsFieldSample extends Component {
  constructor(props) {
    super(props);
    this.state = {
      idle: true,
      sample: {
        id: null
      }
    };
  }

  componentDidMount() {
    const { field } = this.props;
    if (field && field.value && field.value.sample_id && hasAuth(field.value.sample_id)) {
      this.fetch();
    }
  }

  componentDidUpdate() {
    const { field } = this.props;
    const { idle, sample } = this.state;
    if (idle && field.value.sample_id !== sample.id && hasAuth(sample.id)) {
      this.setState({ idle: false }, this.fetch);
    }
  }

  fetch() {
    const { field } = this.props;
    SamplesFetcher.fetchById(field.value.sample_id).then((sample) => {
      this.setState({ idle: true, sample });
    });
  }

  showSample() {
    const { sample } = this.state;
    UrlSilentNavigation(sample);
    ElementActions.fetchSampleById(sample.id);
  }

  // modified from sampleInfo in SampleDetails.js
  renderSample(sample) {
    if (!hasAuth(sample.id)) {
      return noAuth(sample);
    }
    const { edit } = this.props;
    const title = sample.title();
    let link;
    if (edit) {
      link = (
        <p>
          Sample:
          <a role="link" tabIndex={0} onClick={() => this.showSample()} style={{ cursor: 'pointer' }}>
            {title}
          </a>
        </p>
      );
    }
    return (
      <div className="research-plan-field-image">
        {link}
        <div className="image-container">
          <img src={sample.svgPath} alt={title} />
          <SampleName sample={sample} />
        </div>
      </div>
    );
  }

  renderEdit() {
    const { connectDropTarget, isOver, canDrop } = this.props;
    const { sample } = this.state;
    if (!hasAuth(sample.id)) {
      return noAuth(sample);
    }
    let className = 'drop-target';
    if (isOver) className += ' is-over';
    if (canDrop) className += ' can-drop';
    return connectDropTarget(<div className={className}>{sample.id ? this.renderSample(sample) : 'Drop sample here.'}</div>);
  }

  renderStatic() {
    const { sample } = this.state;
    return sample.id ? this.renderSample(sample) : '';
  }

  render() {
    if (this.props.edit) {
      return this.renderEdit();
    }
    return this.renderStatic();
  }
}

ResearchPlanDetailsFieldSample.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  edit: PropTypes.bool,
};

export default DropTarget(DragDropItemTypes.SAMPLE, spec, collect)(ResearchPlanDetailsFieldSample);
