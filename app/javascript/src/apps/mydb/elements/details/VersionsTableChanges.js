import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col } from 'react-bootstrap';
import moment from 'moment';
import QuillViewer from 'src/components/QuillViewer';

function VersionsTableChanges(props) {
  const { changes } = props;

  const date = (input) => (
    input ? moment(input).format('YYYY-MM-DD HH:mm') : ''
  );

  const quill = (input) => (
    input ? <QuillViewer value={JSON.parse(input)} /> : ''
  );

  const numrange = (input) => (
    input ? input.slice(1, -1).split(',', 1) : ''
  );

  const treeselect = (input) => (
    (input || '').split(' | ', 2)[1] || input
  );

  const formatValue = (kind, value) => {
    const formatters = {
      date,
      quill,
      numrange,
      treeselect,
      string: () => value,
    };

    return (
      formatters[kind] || formatters.string
    )(value);
  };

  return (
    <>
      {
        changes.map(({
          name, label, kind, oldValue, newValue
        }) => (
          <Row key={name} bsStyle="version-history">
            <Col xs={12}>
              <strong>{label}</strong>
            </Col>
            <Col xs={6} className="bg-danger" style={{ whiteSpace: 'pre-line' }}>
              {formatValue(kind, oldValue)}
            </Col>
            <Col xs={6} className="bg-success" style={{ whiteSpace: 'pre-line' }}>
              {formatValue(kind, newValue)}
            </Col>
          </Row>
        ))
      }
    </>
  );
}

VersionsTableChanges.propTypes = {
  changes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default VersionsTableChanges;
