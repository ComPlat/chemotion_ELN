import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import { Button } from 'react-bootstrap';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { aviatorNavigation } from 'src/utilities/routesUtils';
import SampleName from 'src/components/common/SampleName';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';

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
  if (typeof id === 'string' && id.includes('error')) {
    return false;
  }
  return true;
};

const noAuth = (el) => (
  <div className="text-center border-gray-300 border-dashed">
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
      <span className="fw-bold">Internal Server Error: Sample can not be found!</span>
    </div>
  );
}

class ResearchPlanDetailsFieldSample extends Component {
  constructor(props) {
    super(props);
    this.state = {
      idle: true,
      sample: {
        id: null
      },
      error: false
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
    SamplesFetcher.fetchById(field.value.sample_id)
      .then((sample) => {
        if (sample && sample.id) {
          this.setState({ idle: true, sample });
        } else {
          console.error('Fetched sample does not contain an id or is in incorrect format:', sample);
          this.setState({ idle: true, error: true });
        }
      })
      .catch((error) => {
        console.error('Error fetching sample:', error);
        this.setState({ idle: true, error: true });
      });
  }

  showSample() {
    const { sample } = this.state;
    aviatorNavigation(sample.type, sample.id, true, false);
    ElementActions.fetchSampleById(sample.id);
  }

  renderSample(sample) {
    if (!hasAuth(sample.id)) {
      return noAuth(sample);
    }
    const { edit } = this.props;
    const link = (
      <div className="p-3">
        <Button
          variant="light"
          size="sm"
          onClick={() => this.showSample()}
          className="border-dark"
        >
          {sample.title()}
        </Button>
      </div>
      
    );

    let image;
    if (sample.svgPath) {
      image = <img src={sample.svgPath} alt={sample.title()} />;
    }

    return (
      <div className={`${!edit ? 'border' : ''} text-start`}>
        {link}
        <div className="text-center mb-0 mw-100">
          {image}
          <SampleName sample={sample} />
        </div>
      </div>
    );
  }

  renderEdit() {
    const { connectDropTarget, isOver, canDrop } = this.props;
    const { sample, error } = this.state;
    if (!hasAuth(sample.id)) {
      return noAuth(sample);
    }
    let content;
    if (error) {
      content = elementError();
    } else if (sample.id) {
      content = this.renderSample(sample);
    } else {
      content = 'Drop sample here.';
    }
    return connectDropTarget(
      <div
        className={`p-3 text-center mb-3 ${(isOver || canDrop)
          ? 'dnd-zone dnd-zone-over' : 'dnd-zone'}`}
      >
        {content}
      </div>
    );
  }

  renderStatic() {
    const { sample, error } = this.state;
    let content;
    if (error) {
      content = elementError();
    } else if (sample.id) {
      content = this.renderSample(sample);
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
