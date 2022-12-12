import React, { useState, useContext } from 'react';
import { useDrop } from 'react-dnd';
import { Button, Panel } from 'react-bootstrap';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import { StoreContext } from 'src/stores/mobx/RootStore';

const FreeScanCard = ({ sampleTask }) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;
  const [sample, setSample] = useState(null);
  const [spec, dropRef] = useDrop({
    accept: [
      DragDropItemTypes.SAMPLE,
      DragDropItemTypes.MATERIAL
    ],
    drop: (item, monitor) => {
      if (monitor.getItemType() === 'sample') {
        setSample(item.element);
      }
      if (monitor.getItemType() === 'material') {
        setSample(item.material);
      }
    }
  });

  const sampleDropzone = () => {
    const style = {
      padding: 10,
      borderStyle: 'dashed',
      textAlign: 'center',
      color: 'gray',
      marginTop: '12px',
      marginBottom: '8px'
    };

    return (
      <div style={style} ref={dropRef}>
        Drop Sample here to write scanned data into it.
      </div>
    );
  };


  const removeSample = () => { setSample(null) };
  const saveSampleTask = () => {
    sampleTasksStore.assignSampleToOpenFreeScan(sample, sampleTask);
  }
  const droppedSample = () => {
    if (!sample) {
      return null;
    }

    return (
      <div>
        <div>
          {sample.short_label}: {sample.showed_name}
        </div>
        <button className="btn btn-danger" type="button" onClick={removeSample}>clear Sample</button>
        <button className="btn btn-success pull-right" type="button" onClick={saveSampleTask}>save data to Sample</button>
      </div>
    );
  };

  return (
    <Panel bsStyle="info">
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
        {droppedSample() || sampleDropzone()}
      </Panel.Footer>
    </Panel>
  );
}

export default FreeScanCard;
