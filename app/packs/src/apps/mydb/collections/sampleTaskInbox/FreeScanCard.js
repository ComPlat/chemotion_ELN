import React from 'react';
import PropTypes from 'prop-types';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import { Button, Panel } from 'react-bootstrap';
import { DropTarget } from 'react-dnd';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const target = {
  drop(props, monitor) {
    const { assignSampleToTask, sampleTask } = props;
    const item = monitor.getItem();
    const itemType = monitor.getItemType();

    if (itemType === 'sample' || itemType === 'material') {
      assignSampleToTask(item.element, sampleTask);
    }
  },
  canDrop(_props, monitor) {
    const itemType = monitor.getItemType();
    return (itemType === 'sample' || itemType === 'material')
  }
}

const collect = (connector, monitor) => ({
  connectDropTarget: connector.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop()
});

class FreeScanCard extends React.Component {
  static contextType = StoreContext;
  static propTypes = {
    sampleTask: PropTypes.object,
    assignSampleToTask: PropTypes.func.isRequired,
    isOver: PropTypes.bool.isRequired, // injected by react-dnd
    canDrop: PropTypes.bool.isRequired, // injected by react-dnd
    connectDropTarget: PropTypes.func.isRequired // injected by react-dnd
  };

  sampleDropzone() {
    const style = {
      padding: 10,
      borderStyle: 'dashed',
      textAlign: 'center',
      color: 'gray',
      marginTop: '12px',
      marginBottom: '8px'
    };

    return this.props.connectDropTarget(
      <div style={style}>
        Drop Sample here to write scanned data into it.
      </div>
    );
  }

  render() {
    let { sampleTask } = this.props;
    return (
      <Panel byStyle="info">
        <Panel.Heading>
          {sampleTask.description}
        </Panel.Heading>
        <Panel.Body>
          <ul>
            <li><strong>Measurement value:</strong> {sampleTask.measurement_value}</li>
            <li><strong>Measurement unit:</strong> {sampleTask.measurement_unit}</li>
            <li><strong>Additional note:</strong> {sampleTask.additional_note}</li>
            <li><strong>Private note:</strong> {sampleTask.private_note}</li>
          </ul>
        </Panel.Body>
        <Panel.Footer>
          {this.sampleDropzone()}
        </Panel.Footer>
      </Panel>
    );
  }
}

export default DropTarget(
  [DragDropItemTypes.SAMPLE, DragDropItemTypes.MATERIAL],
  target,
  collect
)(observer(FreeScanCard));
