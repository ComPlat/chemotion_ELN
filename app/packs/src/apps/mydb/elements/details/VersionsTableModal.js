import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, Modal, Button, Alert
} from 'react-bootstrap';
import VersionsTableFields from 'src/apps/mydb/elements/details/VersionsTableFields';

function VersionsTableModal(props) {
  const { name, changes, handleRevert } = props;
  const [show, setshow] = useState(false);
  const [selectedFields, setSelectedFields] = useState([]);
  const handleClose = () => setshow(false);
  const handleShow = () => setshow(true);

  const fieldIndexDictionary = () => {
    const dictionary = {};

    changes.map(({ fields }, groupIndex) => fields
      .filter(
        (field) => field.kind !== 'hidden'
            && field.currentValue !== field.oldValue
            && field.revert.length > 0
      )
      .forEach((field, index) => {
        dictionary[`${groupIndex}${index}`] = field;
      }));

    return dictionary;
  };

  const allFieldIndexes = () => Object.keys(fieldIndexDictionary());

  const toggleAllFieldsCheckbox = (element) => {
    if (element.target.checked) {
      setSelectedFields(allFieldIndexes());
    } else {
      setSelectedFields([]);
    }
  };

  const toggleFieldCheckbox = (element) => {
    const selectedField = fieldIndexDictionary()[element];
    const affectedIndexes = [];
    changes.forEach(({ fields }, groupIndex) => {
      if (fields.includes(selectedField)) {
        fields
          .filter(
            (field) => field.kind !== 'hidden'
            && field.currentValue !== field.oldValue
            && field.revert.length > 0
          )
          .forEach((field, index) => {
            if (selectedField.revert.includes(field.name)) {
              affectedIndexes.push(`${groupIndex}${index}`);
            }
          });
      }
    });

    if (selectedFields.includes(element)) {
      setSelectedFields(
        selectedFields.filter((index) => !affectedIndexes.includes(index))
      );
    } else {
      setSelectedFields(selectedFields.concat(affectedIndexes));
    }
  };

  const change = changes.map((historyChange, index) => {
    const filteredFields = historyChange.fields.filter(
      (field) => field.currentValue !== field.oldValue && field.revert.length > 0
    );

    if (filteredFields.length > 0) {
      return (
        // eslint-disable-next-line react/no-array-index-key
        <React.Fragment key={index}>
          <ol className="history-table-breadcrumb">
            {historyChange.name.map((item) => (
              <li key={item} className="history-table-breadcrumb__element">
                {item}
              </li>
            ))}
          </ol>
          <VersionsTableFields
            fields={filteredFields}
            renderRevertView
            revertGroupIndex={index}
            handleRevertFieldToggle={toggleFieldCheckbox}
            revertSelectedFields={selectedFields}
          />
        </React.Fragment>
      );
    }

    return '';
  });

  const reversibleChanges = () => {
    const result = [];
    const dictionary = fieldIndexDictionary();

    changes.forEach((historyChange) => {
      const affectedChangeFields = [];

      selectedFields.forEach((fieldIndex) => {
        const selectedField = dictionary[fieldIndex];

        if (historyChange.fields.includes(selectedField)) {
          historyChange.fields
            .filter((f) => selectedField.revert.includes(f.name))
            .forEach((field) => {
              if (!affectedChangeFields.includes(field)) {
                affectedChangeFields.push(field);
              }
            });
        }
      });

      if (affectedChangeFields.length > 0) {
        result.push({
          db_id: historyChange.db_id,
          klass_name: historyChange.klass_name,
          fields: affectedChangeFields.map((field) => ({
            value: field.revertibleValue,
            name: field.name,
          })),
        });
      }
    });

    return result;
  };

  return (
    <>
      <Button onClick={handleShow}>Revert</Button>
      <Modal
        show={show}
        backdrop="static"
        onHide={handleClose}
        size="lg"
        className="history-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>{name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row bsStyle="change" style={{ marginRight: 0 }}>
            <Col xs={4}>
              <label
                className="history-checkbox-label"
                htmlFor="toggle-all"
              >
                <input
                  id="toggle-all"
                  type="checkbox"
                  onChange={toggleAllFieldsCheckbox}
                  checked={
                        allFieldIndexes().length === selectedFields.length
                      }
                />
                Select all
              </label>
            </Col>
            <Col xs={4}>
              current value
            </Col>
            <Col>
              before/new value
            </Col>
          </Row>

          <div className="history-table">{change}</div>
          <Alert bsStyle="warning" className="history-alert">
            Only reversible changes are are shown.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            bsStyle="primary"
            onClick={() => handleRevert(reversibleChanges()).then(() => handleClose())}
          >
            Revert
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

VersionsTableModal.propTypes = {
  name: PropTypes.string.isRequired,
  changes: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleRevert: PropTypes.func.isRequired,
};

export default VersionsTableModal;
