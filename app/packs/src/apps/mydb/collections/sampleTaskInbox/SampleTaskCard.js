import React, { useContext, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Panel } from 'react-bootstrap';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import { StoreContext } from 'src/stores/mobx/RootStore';

const SampleTaskCard = ({ sampleTask }) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;
  const [sample, setSample] = useState(null);
  const [_spec, dropRef] = useDrop({
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

  const removeSample = () => { setSample(null) };
  const saveSampleTask = () => { sampleTasksStore.assignSample(sample, sampleTask); }
  const panelHeading = () => {
    if (sampleTask.short_label && sampleTask.display_name) {
      return `${sampleTask.short_label} ${sampleTask.display_name}`
    } else {
      return sampleTask.description
    }
  }
  const sampleImage = () => {
    return sampleTask.sample_svg_file
      ? <img src={"/images/samples/" + sampleTask.sample_svg_file} />
      : 'no image available'
  }
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
  const contentForSampleTask = () => {
    if (sampleTask.scan_results.length > 0) {
      const scan_results = sampleTask.scan_results.map(scan_result => {
        return (
          <li>
            <a href={`/api/v1/attachments/image/${scan_result.attachment_id}`} target="_blank">
              {scan_result.title}: {scan_result.measurement_value}{scan_result.measurement_unit}
            </a>
          </li>
        )
      })
      const sample_task_result = sampleTask.result_value
        ? (<li><strong>Result:</strong> {sampleTask.result_value}{sampleTask.result_unit}</li>)
        : ''

      return (
        <ul>
          {scan_results}
          {sample_task_result}
        </ul>
      )
    } else {
      return "No scan data available";
    }
  }
  const droppedSample = () => {
    if (!sample) { return null; }

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

  const contentForSample = () => {
    console.debug(sampleTask)
    if (sampleTask.sample_id) { return sampleImage() }
    else if (sample) { return droppedSample() }
    else { return sampleDropzone() }
  }

  return (
    <Panel bsStyle="info">
      <Panel.Heading>
        {panelHeading()}
      </Panel.Heading>
      <Panel.Body>
        <div className="row">
          <div className="col-sm-6">
            {contentForSample(sampleTask, dropRef)}
          </div>
          <div className="col-sm-6">
            {contentForSampleTask(sampleTask)}
          </div>
        </div>
      </Panel.Body>
    </Panel>
  )
}
export default SampleTaskCard;
