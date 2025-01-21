import React from 'react';
import PropTypes from 'prop-types';
import VersionsTableFields from 'src/apps/mydb/elements/details/VersionsTableFields';
import VersionsTableModal from 'src/apps/mydb/elements/details/VersionsTableModal';
import { Alert } from 'react-bootstrap';

function VersionsTableChanges(props) {
  const {
    id, changes, handleRevert
  } = props;

  const revertable = () => {
    let filteredFields = [];

    changes.forEach(({ fields }) => {
      filteredFields = filteredFields.concat(
        fields.filter((field) => (field.currentValue !== field.oldValue && field.revert.length > 0))
      );
    });

    return filteredFields.length > 0;
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

  return (
    <>
      {change}
      {revertable() ? <VersionsTableModal name={`# ${id}`} changes={changes} handleRevert={handleRevert} /> : <Alert bsStyle="warning" className="history-alert">You cannot undo these changes. Either the changes are up to date, it is the first version or all changes are irreversible.</Alert>}
    </>
  );
}

VersionsTableChanges.propTypes = {
  id: PropTypes.number.isRequired,
  changes: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleRevert: PropTypes.func.isRequired,
};

export default VersionsTableChanges;
