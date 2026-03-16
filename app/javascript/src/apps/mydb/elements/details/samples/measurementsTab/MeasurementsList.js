import Aviator from 'aviator';
import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { observer } from 'mobx-react';

import { StoreContext } from 'src/stores/mobx/RootStore';
import { researchPlanShowOrNew } from 'src/utilities/routesUtils';
import ConfirmModal from 'src/components/common/ConfirmModal';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

const MeasurementsList = ({ sample }) => {
  const context = useContext(StoreContext);
  const [measurementToDelete, setMeasurementToDelete] = useState(null);
  const measurementsStore = context.measurements;
  const sampleIds = [...sample.ancestor_ids, sample.id].filter(a => a);


  // currently only research plan is supported as source
  const navigateToSource = (measurement) => {
    const { uri } = Aviator.getCurrentRequest();
    Aviator.navigate(`${uri}/${measurement.source_type}/${measurement.source_id}`, { silent: true });
    if (measurement.source_type == 'research_plan') {
      researchPlanShowOrNew({ params: { research_planID: measurement.source_id } });
    }
  }

  const handleDeleteConfirmation = (confirm) => {
    if (confirm) {
      LoadingActions.start();
      context.measurements.deleteMeasurement(
        measurementToDelete.id,
        () => {
          setMeasurementToDelete(null);
          LoadingActions.stop();
        }
      )
    } else {
      setMeasurementToDelete(null);
    }
  }

  const renderDeleteButton = (measurement) => {
    return (
      <Button
        variant="danger"
        size="sm"
        key={`Measurement${measurement.id}-DeleteButton`}
        onClick={() => {
          setMeasurementToDelete(measurement)
        }}
      >
        <i className="fa fa-trash" />
      </Button>
    );
  }

  const renderEntry = (sampleHeader, measurements) => {
    measurements = measurements.map(measurement => {
      let measurementDisplay;
      if (measurement.source_id) {
        measurementDisplay = (
          <a
            key={`Measurement${measurement.id}-SourceLink`}
            onClick={() => navigateToSource(measurement)}
            role="button"
          >
            {measurement.description}: {measurement.value}{measurement.unit}
          </a>
        );
      } else {
        measurementDisplay = (
          <span key={`Measurement${measurement.id}-Display`}>
            {measurement.description}: {measurement.value}{measurement.unit}
          </span>
        );
      }

      return (
        <tr key={`Measurement${measurement.id}`}>
          <td>
            {measurementDisplay}
          </td>
          <td>
            {renderDeleteButton(measurement)}
          </td>
        </tr>
      );
    });

    return (
      <div key={`MeasurementListEntry${sampleHeader.id}`}>
        <h4 key={`MeasurementListEntry${sampleHeader.id}-SampleName`}>
          {sampleHeader.short_label} {sampleHeader.name}
        </h4>
        <table className="table table-sm table-hover">
          <thead>
            <tr>
              <th>Measurement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="table-group-divider">
            {measurements}
          </tbody>
        </table>
      </div>
    );
  }
  
  return (
    <div className="measurementList">
      {sampleIds.map(sampleId => {
        if (measurementsStore.dataForSampleAvailable(sampleId)) {
          return renderEntry(
            measurementsStore.sampleHeader(sampleId),
            measurementsStore.measurementsForSample(sampleId)
          );
        }
      })}
      <ConfirmModal
        showModal={measurementToDelete != null}
        onClick={handleDeleteConfirmation}
        title="Delete Measurement"
        content={measurementToDelete ? ("Are you sure you want to delete " + measurementToDelete.description + "?") : ""}
      />
    </div>
  );
}

MeasurementsList.propTypes = {
  sample: PropTypes.object.isRequired
};

export default observer(MeasurementsList);
