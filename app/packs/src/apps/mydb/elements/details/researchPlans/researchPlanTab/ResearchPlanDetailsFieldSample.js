import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { UrlSilentNavigation } from 'src/utilities/ElementUtils';
import SampleName from 'src/components/common/SampleName';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';

const spec = {
  drop(props, monitor, component) {
    const { field, onChange } = props;
    field.value.sample_id = monitor.getItem().element.id;
    onChange({ sample_id: monitor.getItem().element.id }, field.id);

    // trigger immediate update of the state after dropping
    component.onDropSample(monitor.getItem().element.id);
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

const noAuth = (el) => (
  <div className="research-plan-no-auth">
    <h4>
      {el.id.split(':')[2]}
      &nbsp;
      <i className="fa fa-eye-slash" aria-hidden="true" />
    </h4>
  </div>
);

class ResearchPlanDetailsFieldSample extends Component {
  constructor(props) {
    super(props);
    this.state = {
      idle: true,
      sample: {
        id: null
      },
      wasSampleSet: false
    };
    this.onDropSample = this.onDropSample.bind(this);
  }

  componentDidMount() {
    const { field } = this.props;
    if (field?.value?.sample_id && hasAuth(field?.value?.sample_id) && !this.state.sample.id) {
      this.fetch();
    }

    if (this.state.sampleDropped) {
      this.onDropSample(this.props.field?.value?.sample_id);
      this.setState({ sampleDropped: false });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    const { field } = this.props;
    const { idle } = this.state;
    if (
      idle
      && field?.value?.sample_id
      && (prevState.sample?.id !== field?.value?.sample_id
        || (prevState.sample?.id === null && field?.value?.sample_id !== null))
      && hasAuth(field?.value?.sample_id)
    ) {
      this.setState(
        {
          idle: false,
          // set wasSampleSet to true if a sample_id exists in the field's value
          wasSampleSet: field?.value?.sample_id !== undefined,
        },
        this.fetch
      );
    }

    if (this.state.sampleDropped) {
      this.onDropSample(this.props.field?.value?.sample_id);
      this.setState({ sampleDropped: false });
    }
  }

  onDropSample(sample_id) {
    SamplesFetcher.fetchById(sample_id)
      .then((sample) => {
        if (sample_id === sample.id) {
          this.setState({ idle: true, sample });
        }
      })
      .catch(() => {
        // handle case when the sample is not found
        if (sample_id === this.state.sample.id) {
          this.setState({ idle: true, sample: { id: null }, wasSampleSet: true });
        }
      });
  }

  fetch() {
    const { field } = this.props;

    // check if the field's sample_id exists and if the sample id in the state is different from the one in the field's value
    if (
      field?.value?.sample_id
      && this.state.sample?.id !== field?.value?.sample_id
    ) {
      SamplesFetcher.fetchById(field.value.sample_id)
        .then((sample) => {
          // only update state if the fetched sample's id is the same as the current field's sample_id
          if (field?.value?.sample_id === sample.id) {
            this.setState({ idle: true, sample });
          }
        })
        .catch(() => {
          // handle case when the sample is not found
          if (field?.value?.sample_id === this.state.sample?.id) {
            this.setState({ idle: true, sample: { id: null }, wasSampleSet: true });
          }
        });
    } else if (!field?.value?.sample_id) {
      // if there is no sample_id in the field's value, set the state to idle and sample to null
      this.setState({ idle: true, sample: { id: null }, wasSampleSet: false });
    }
  }

  showSample() {
    const { sample } = this.state;
    UrlSilentNavigation(sample);
    ElementActions.fetchSampleById(sample?.id);
  }

  static renderElementError() {
    return (
      <div style={{ color: 'red', textAlign: 'left' }}>
        <i className="fa fa-exclamation-triangle" aria-hidden="true" style={{ marginRight: '5px' }} />
        <span style={{ fontWeight: 'bold' }}>Element not found!</span>
      </div>
    );
  }

  renderSample(sample) {
    if (!hasAuth(sample?.id)) {
      return noAuth(sample);
    }

    if (!sample?.id) {
      this.renderElementError();
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
        onClick={() => this.showSample()}
      >
        {sample.title()}
      </button>
    );

    let image;
    if (sample.svgPath) {
      image = <img src={sample.svgPath} alt={sample.title()} />;
    }

    const sampleStyle = edit ? {} : {
      border: '1px solid #cccccc',
      padding: '5px',
    };

    return (
      <div className="research-plan-field-image" style={sampleStyle}>
        {link}
        <div className="image-container">
          {image}
          <SampleName sample={sample} />
        </div>
      </div>
    );
  }

  renderEdit() {
    const { connectDropTarget, isOver, canDrop } = this.props;
    const { sample, wasSampleSet } = this.state;

    if (!hasAuth(sample?.id)) {
      return noAuth(sample);
    }

    let className = 'drop-target';
    if (isOver) className += ' is-over';
    if (canDrop) className += ' can-drop';

    let content;
    if (sample?.id) {
      content = this.renderSample(sample);
    } else if (wasSampleSet) {
      content = this.renderElementError();
    } else {
      content = 'Drop sample here.';
    }

    return connectDropTarget(
      <div className={className}>
        {content}
      </div>
    );
  }

  renderStatic() {
    const { sample, wasSampleSet } = this.state;

    let content;
    if (sample?.id) {
      content = this.renderSample(sample);
    } else if (wasSampleSet) {
      content = this.renderElementError();
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

ResearchPlanDetailsFieldSample.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  edit: PropTypes.bool,
};

export default DropTarget(DragDropItemTypes.SAMPLE, spec, collect)(ResearchPlanDetailsFieldSample);
