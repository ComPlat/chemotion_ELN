import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import VersionsTableFields from 'src/apps/mydb/elements/details/VersionsTableFields';
import { Alert, Button, ButtonGroup } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import moment from 'moment';

function VersionsTableChanges(props) {
  const {
    data, handleRevert, isEdited, renderRevertView, toggleRevertView
  } = props;

  if (typeof data === 'undefined') {
    return '';
  }

  const [checkboxTick, setCheckboxTick] = useState(0);

  const {
    changes, createdAt, userName
  } = data;
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

  const change = changes.sort((a, b) => {
    const nameA = a.name[0] || '';
    const nameB = b.name[0] || '';
    return nameA.localeCompare(nameB, undefined, { numeric: true });
  }).map(({ name, fields }, index) => (
    // eslint-disable-next-line react/no-array-index-key
    <React.Fragment key={index}>
      {name.map((item) => (
        <li key={item} className="history-table-breadcrumb__element">
          {item}
        </li>
      ))}
      <VersionsTableFields
        fields={fields}
        renderRevertView={renderRevertView}
        setCheckboxTick={setCheckboxTick}
      />
    </React.Fragment>
  ));

  const reversibleChanges = () => {
    const result = [];

    changes.forEach((historyChange) => {
      const affectedChangeFields = [];

      historyChange.fields.filter((f) => f.checkbox).forEach((field) => {
        if (!affectedChangeFields.includes(field)) {
          affectedChangeFields.push(field);
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

  const isRevertible = revertibleFields();
  let alertText = 'You cannot undo changes. ';
  if (isRevertible === 0) {
    alertText += 'Every change is either up to date or irreversible';
  } else if (isRevertible === -1) {
    alertText += 'You have unsaved data which would be lost.';
  } else {
    alertText += 'Either it is the first version or all changes are irreversible.';
  }

  const changesToRevert = useMemo(
    () => reversibleChanges(),
    [checkboxTick]
  );

  return (
    <>
      <h2>
        {`# ${moment(createdAt).format('YYYY-MM-DD HH:mm:ss')}${userName ? ` by ${userName}` : ''}`}
      </h2>
      <ol className="history-table-breadcrumb">
        {change}
      </ol>
      {isRevertible > 0 ? (
        <ButtonGroup className="mb-2">
          <Button variant="warning" onClick={toggleRevertView}>
            {renderRevertView ? 'Cancel' : 'Revert'}
          </Button>
          {renderRevertView ? (
            <Button
              variant="danger"
              disabled={changesToRevert.length === 0}
              onClick={() => { toggleRevertView(); handleRevert(changesToRevert); }}
            >
              Revert
            </Button>
          ) : ''}
        </ButtonGroup>
      )
        : (
          <Alert variant="warning">
            {alertText}
          </Alert>
        )}
    </>
  );
}

VersionsTableChanges.propTypes = {
  data: PropTypes.instanceOf(AgGridReact.data).isRequired,
  handleRevert: PropTypes.func.isRequired,
  isEdited: PropTypes.bool.isRequired,
  renderRevertView: PropTypes.bool.isRequired,
  toggleRevertView: PropTypes.func.isRequired,
};

export default VersionsTableChanges;
