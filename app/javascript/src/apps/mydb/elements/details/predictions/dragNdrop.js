import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DropTarget } from 'react-dnd';
import {DragDropItemTypes} from 'src/utilities/DndConst';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import { UrlSilentNavigation } from 'src/utilities/ElementUtils';
import SampleName from 'src/components/common/SampleName';

const spec = {
  drop(props, monitor) {
    const { onChange } = props;
    onChange({ sample_id: monitor.getItem().element.id });
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

class DropTargetMolecule extends Component {
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
    // const { field } = this.props;
    // if (field && field.value && field.value.sample_id && hasAuth(field.value.sample_id)) {
    //   this.fetch();
    // this.fetch();
    // }
  }


  componentDidUpdate() {
    // const { idle, sample } = this.state;
    // if (idle && hasAuth(sample.id)) {
    // //   this.setState({ idle: false }, this.fetch);
    // }
  }
  
  
  render() {
    const { connectDropTarget, isOver, canDrop } = this.props;
    const { sample } = this.state;
    if (!hasAuth(sample.id)) {
      return noAuth(sample);
    }
    let className = 'drop-target';
    if (isOver) className += ' is-over';
    if (canDrop) className += ' can-drop';

    return connectDropTarget(<div className={className}>
        Drop sample here.
        </div>);
}

}
DropTargetMolecule.propTypes = {
  field: PropTypes.object,
  index: PropTypes.number,
  disabled: PropTypes.bool,
  onChange: PropTypes.func,
  edit: PropTypes.bool,
};

export default DropTarget(DragDropItemTypes.SAMPLE, spec, collect)(DropTargetMolecule);