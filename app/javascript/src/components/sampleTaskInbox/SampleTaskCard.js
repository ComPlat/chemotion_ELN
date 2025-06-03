import React, { useContext, useState } from 'react';
import { useDrop } from 'react-dnd';
import { Button, Card, Col, Container, Row } from 'react-bootstrap';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import { StoreContext } from 'src/stores/mobx/RootStore';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ConfirmModal from 'src/components/common/ConfirmModal';

const SampleTaskCard = ({ sampleTask }) => {
  const sampleTasksStore = useContext(StoreContext).sampleTasks;
  const [sample, setSample] = useState(null);
  const [showDeletionConfirmationDialog, setShowDeletionConfirmationDialog] = useState(false);
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
          <li key={`scanResult-${scan_result.id}`}>
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
    if (sampleTask.sample_id) { return sampleImage() }
    else if (sample) { return droppedSample() }
    else { return sampleDropzone() }
  }

  const deleteButton = () => {
    return (
      <Button variant="danger" className="pull-right" size="sm" onClick={() => setShowDeletionConfirmationDialog(true)}>
        <i className="fa fa-trash-o" />
      </Button>
    );
  }

  const deleteSampleTask = (confirmationResult) => {
    setShowDeletionConfirmationDialog(false);
    if (confirmationResult != true) return;

    sampleTasksStore
      .deleteSampleTask(sampleTask)
      .then(result => {
        let level = 'success'
        let message = 'Weighing task successfully deleted'

        if (result.error) {
          level = 'error'
          message = result.error
        }

        const notification = {
          title: message,
          message: message,
          level: level,
          dismissible: 'button',
          autoDismiss: 5,
          position: 'tr',
          uid: 'SampleTaskInbox'
        };
        NotificationActions.add(notification);
      });
  }

  const sampleTaskStillOpenReasons = () => {
    let reasons = [];
    if (sampleTask.sample_id == null) reasons.push('The task has no sample assigned');
    if (sampleTask.required_scan_results > sampleTask.scan_results.length) {
      let missing_scan_results = sampleTask.required_scan_results - sampleTask.scan_results.length;
      if (missing_scan_results == 1) reasons.push('The task needs one more scan result');
      if (missing_scan_results > 1) reasons.push(`The tasks needs ${missing_scan_results} more scan results`);
    }

    return reasons;
  }

  const deletionConfirmationContent = () => {
    return (
      <div>
        <p>Deletion of a Scan Task cannot be undone. Please check carefully</p>
        <p>The task is missing the following to be completed:</p>
        <ul>
          {
            sampleTaskStillOpenReasons().map((reason, index) => (
              <li key={`missingStepsForSampleTask_${sampleTask.id}_${index}`}>
                {reason}
              </li>
            ))
          }
        </ul>
      </div>
    );
  }

  return (
    <Card className="w-100 mt-3">
      <Card.Header>
        {panelHeading()}
        {deleteButton()}
      </Card.Header>
      <Card.Body>
        <Row className="gx-5">
          <Col>
            {contentForSample(sampleTask, dropRef)}
          </Col>
          <Col>
            {contentForSampleTask(sampleTask)}
          </Col>
        </Row>
      </Card.Body>
      <ConfirmModal
        showModal={showDeletionConfirmationDialog}
        title="Are you sure?"
        content={deletionConfirmationContent()}
        onClick={deleteSampleTask}
      />
    </Card>
  )
}
export default SampleTaskCard;
