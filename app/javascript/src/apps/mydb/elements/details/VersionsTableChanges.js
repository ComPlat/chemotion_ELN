import React from 'react';
import PropTypes from 'prop-types';
import VersionsTableFields from 'src/apps/mydb/elements/details/VersionsTableFields';
import VersionsTableModal from 'src/apps/mydb/elements/details/VersionsTableModal';
import { Alert } from 'react-bootstrap';

function VersionsTableChanges(props) {
  const {
    id, changes, handleRevert, isEdited
  } = props;

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
    <>
      {change}
      {isRevertible > 0 ? <VersionsTableModal name={`# ${id}`} changes={changes} handleRevert={handleRevert} />
        : (
          <Alert bsStyle="warning" className="history-alert">
            {alertText}
          </Alert>
        )}
    </>
  );
}

VersionsTableChanges.propTypes = {
  id: PropTypes.number.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  changes: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleRevert: PropTypes.func.isRequired,
  isEdited: PropTypes.bool.isRequired,
};

export default VersionsTableChanges;
