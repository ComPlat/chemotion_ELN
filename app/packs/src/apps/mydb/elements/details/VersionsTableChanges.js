import React from 'react';
import PropTypes from 'prop-types';
import VersionsTableFields from 'src/apps/mydb/elements/details/VersionsTableFields';
import VersionsTableModal from 'src/apps/mydb/elements/details/VersionsTableModal';
import {
  Row, Col, Alert, Modal
} from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';

function VersionsTableChanges(props) {
  const {
    data, stopEditing, handleRevert, isEdited
  } = props;

  const { id, changes } = data;
  const revertibleFields = () => {
    if (isEdited) return -1;

    let filteredFields = [];

    changes.forEach(({ fields }) => {
      filteredFields = filteredFields.concat(
        fields.filter((field) => (field.revert.length > 0))
      );
    });

    if (filteredFields.length === 0) {
      return -2;
    }

    filteredFields = filteredFields.filter((field) => (field.currentValue !== field.oldValue));

    return filteredFields.length;
  };

  const change = changes.map(({ name, fields }, index) => (
    // eslint-disable-next-line react/no-array-index-key
    <React.Fragment key={index}>
      <ol className="history-table-breadcrumb">
        {name.map((item) => (
          <li key={item} className="history-table-breadcrumb__element">
            {item}
          </li>
        ))}
      </ol>
      <VersionsTableFields fields={fields} renderRevertView={false} />
    </React.Fragment>
  ));

  const isRevertible = revertibleFields();
  let alertText = 'You cannot undo changes. ';
  if (isRevertible === 0) {
    alertText += 'Every change is either up to date or irreversible';
  } else if (isRevertible === -1) {
    alertText += 'You have unsaved data which would be lost.';
  } else {
    alertText += 'Either it is the first version or all changes are irreversible.';
  }

  return (
    <Modal show size="lg" backdrop="static" className="history-modal">
      <Modal.Header closeButton onHide={() => stopEditing()}>
        <Modal.Title>{`# ${id} `}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row bsStyle="change" style={{ marginRight: 0 }}>
          <Col xs={3}>
            legend: param
          </Col>
          <Col xs={3}>
            old value
          </Col>
          <Col xs={3}>
            new value
          </Col>
          <Col>
            current value
          </Col>
        </Row>
        {change}
      </Modal.Body>
      <Modal.Footer>
        {isRevertible > 0 ? <VersionsTableModal name={`# ${id}`} changes={changes} handleRevert={handleRevert} />
          : (
            <Alert bsStyle="warning" className="history-alert">
              {alertText}
            </Alert>
          )}
      </Modal.Footer>
    </Modal>
  );
}

VersionsTableChanges.propTypes = {
  data: PropTypes.instanceOf(AgGridReact.data).isRequired,
  stopEditing: PropTypes.instanceOf(AgGridReact.value).isRequired,
  handleRevert: PropTypes.func.isRequired,
  isEdited: PropTypes.bool.isRequired,
};

export default VersionsTableChanges;
