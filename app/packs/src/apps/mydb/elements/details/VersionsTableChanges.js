import React from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, FormControl, Button, Table
} from 'react-bootstrap';
import moment from 'moment';
import SVG from 'react-inlinesvg';
import QuillViewer from 'src/components/QuillViewer';

function SolventDetails({ solvent }) {
  if (!solvent) {
    return (null);
  }

  return (
    <tr>
      <td width="5%" />
      <td width="50%">
        <FormControl
          bsClass="bs-form--compact form-control"
          bsSize="small"
          type="text"
          name="solvent_label"
          value={solvent.label}
          disabled
        />
      </td>
      <td width="26%">
        <FormControl
          bsClass="bs-form--compact form-control"
          bsSize="small"
          type="number"
          name="solvent_ratio"
          value={solvent.ratio}
          disabled
        />
      </td>
      <td />
    </tr>
  );
}

SolventDetails.propTypes = {
  solvent: PropTypes.shape({
    label: PropTypes.string.isRequired,
    ratio: PropTypes.string.isRequired,
  }).isRequired,
};

function VersionsTableChanges(props) {
  const { type, klass, changes } = props;

  const showRevertButton = (change) => {
    const whiteList = [
      'location',
      'name',
      'external_label',
      'real_amount_value',
      'description',
      'solvent',
      'real_amount_unit',
      'showed_name',
      'target_amount_unit',
      'target_amount_value',
      'boiling_point',
      'melting_point',
      'short_label',
      'purity',
      'density',
      'molarity_value',
      'data',
      'temperature',
      'molfile',
      'sample_svg_file',
    ];
    return (
      ((klass === 'Reaction' && type === 'reactions')
        || (klass === 'Sample' && type === 'samples'))
      && whiteList.includes(change.name)
    );
  };

  const date = (input) => (
    input ? moment(input).format('YYYY-MM-DD HH:mm') : ''
  );

  const quill = (input) => (
    input ? <QuillViewer value={JSON.parse(input)} /> : ''
  );

  const numrange = (input) => (
    input ? `${input.slice(1, -1).split(',')[0]} - ${input.slice(1, -1).split(',')[1]}` : ''
  );

  const treeselect = (input) => (
    (input || '').split(' | ', 2)[1] || input
  );

  const svg = (input) => (input ? (
    <SVG
      src={`/images/samples/${input}`}
      key={input}
      className="molecule-mid"
    />
  ) : (
    ''
  ));

  const solvent = (input) => {
    const contents = [];
    if (input) {
      input.forEach((solv) => {
        contents.push((
          <SolventDetails
            solvent={solv}
          />
        ));
      });
    }

    return input ? (
      <div>
        <table width="100%" className="reaction-scheme">
          <thead>
            <tr>
              <th width="5%" aria-label="first-row" />
              <th width="50%">Label</th>
              <th width="26%">Ratio</th>
              <th width="3%" aria-label="last-row" />
            </tr>
          </thead>
          <tbody>
            {contents.map((item) => item)}
          </tbody>
        </table>
      </div>
    ) : null;
  };

  const temperature = (input) => (input ? (
    <div>
      <p>
        {input.userText}
        {' '}
        {input.valueUnit}
      </p>
      {input.data.length > 0 && (
        <Table style={{ marginTop: '1em', backgroundColor: 'transparent' }}>
          <thead>
            <tr>
              <th> Time (hh:mm:ss) </th>
              <th>
                {' '}
                Temperature (
                {input.valueUnit}
                )
                {' '}
              </th>
            </tr>
          </thead>
          <tbody>
            {input.data.map(({ time, value }, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <tr key={`rows_${index}`}>
                <td>{time}</td>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  ) : (
    null
  ));

  const handleRevert = (change) => {
    // eslint-disable-next-line react/destructuring-assignment
    props.handleRevert(change, changes);
  };

  const renderRevertButton = (change) => {
    if (showRevertButton(change)) {
      return (
        <Button
          bsSize="xsmall"
          type="button"
          bsStyle="default"
          style={{ marginLeft: '5px' }}
          onClick={() => handleRevert(change)}
        >
          <i className="fa fa-undo" />
        </Button>
      );
    }
    return '';
  };

  const formatValue = (kind, value) => {
    const formatters = {
      date,
      quill,
      numrange,
      treeselect,
      svg,
      solvent,
      temperature,
      string: () => JSON.stringify(value),
    };

    return (
      formatters[kind] || formatters.string
    )(value);
  };

  return (
    <>
      {
        changes.map((change) => (
          <Row key={change.name} bsStyle="version-history">
            <Col xs={12}>
              <strong>{change.label}</strong>
              {renderRevertButton(change)}
            </Col>
            <Col xs={6} className="bg-danger" style={{ whiteSpace: 'pre-line' }}>
              {formatValue(change.kind, change.oldValue)}
            </Col>
            <Col xs={6} className="bg-success" style={{ whiteSpace: 'pre-line' }}>
              {formatValue(change.kind, change.newValue)}
            </Col>
          </Row>
        ))
      }
    </>
  );
}

VersionsTableChanges.propTypes = {
  type: PropTypes.string.isRequired,
  klass: PropTypes.string.isRequired,
  changes: PropTypes.arrayOf(PropTypes.object).isRequired,
  handleRevert: PropTypes.func.isRequired,
};

export default VersionsTableChanges;
