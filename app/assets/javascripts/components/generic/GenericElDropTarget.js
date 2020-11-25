import React, { Component } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import { DropTarget } from 'react-dnd';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

const show = (opt, iconClass) => {
  if (opt.value && opt.value.el_id) {
    if (opt.value.el_type === 'molecule') {
      return <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>{opt.value.el_tip}</Tooltip>}><div className="data">{opt.value.el_label}</div></OverlayTrigger>;
    }
    return <OverlayTrigger placement="top" overlay={<Tooltip id={uuid.v4()}>{opt.value.el_tip}</Tooltip>}><div className="data">{opt.value.el_label}</div></OverlayTrigger>;
  }
  return (<span className={`icon-${iconClass} indicator`} />);
};

const source = (type, props) => {
  switch (type) {
    case 'molecule':
      return {
        el_id: props.molecule.id,
        el_type: 'molecule',
        el_label: props.molecule_name_label,
        el_tip: props.molecule_name_label,
      };
    default:
      return {
        el_id: props.id,
        el_type: props.type,
        el_label: props.short_label,
        el_tip: props.short_label,
      };
  }
};

const dropTarget = {
  drop(targetProps, monitor) {
    const sourceProps = monitor.getItem().element;
    const sourceTag = source(targetProps.opt.type.split('_')[1], sourceProps);
    targetProps.onDrop(sourceTag);
  },
  canDrop(targetProps, monitor) {
    return true;
  },
};

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class GenericElDropTarget extends Component {
  render() {
    const {
      connectDropTarget,
      isOver,
      canDrop,
      opt
    } = this.props;
    const iconClass = (opt.dndItems && opt.dndItems[0] === 'molecule' ? 'sample' : opt.dndItems[0]);
    const className = `target${isOver ? ' is-over' : ''}${canDrop ? ' can-drop' : ''}`;
    return connectDropTarget(<div className={className}>{show(opt, iconClass)}</div>);
  }
}

export default
DropTarget(props => props.opt.dndItems, dropTarget, dropCollect)(GenericElDropTarget);

GenericElDropTarget.propTypes = {
  connectDropTarget: PropTypes.func.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};
