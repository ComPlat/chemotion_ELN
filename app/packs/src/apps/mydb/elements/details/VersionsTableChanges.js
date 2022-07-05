import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, FormControl, Button, Table } from 'react-bootstrap';
import moment from 'moment';
import QuillViewer from 'src/components/QuillViewer';
import SVG from 'react-inlinesvg';
import ReactJson from 'react-json-view';
import EditableCell from './lineChart/EditableCell'

const SolventDetails = ({ solvent }) => {
  if (!solvent) {
    return (<></>)
  }

  return (
    <tr>
      <td width="5%"></td>
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
      <td>
      </td>
    </tr>
  )
};

function VersionsTableChanges(props) {
  const { changes } = props;

  const date = (input) => (
    input ? moment(input).format('YYYY-MM-DD HH:mm') : ''
  );

  const quill = (input) => (
    input ? <QuillViewer value={JSON.parse(input)} /> : ''
  );

  const numrange = input => (
    input ? `${input.slice(1, -1).split(',')[0]} - ${input.slice(1, -1).split(',')[1]}`: ''
  );

  const treeselect = (input) => (
    (input || '').split(' | ', 2)[1] || input
  );

  const svg = input => (
    input ? <SVG src={`/images/samples/${input}`} key={input} /> : ''
  );

  const solvent = input => {
    let contents = []
    if (input) {
      input.forEach((solv) => {
        contents.push((
          <SolventDetails
            solvent={solv}
          />
        ))
      })
    }

    return input ? (<div>
      <table width="100%" className="reaction-scheme">
        <thead>
          <tr>
            <th width="5%"></th>
            <th width="50%">Label</th>
            <th width="26%">Ratio</th>
            <th width="3%" />
          </tr>
        </thead>
        <tbody>
          {contents.map(item => item)}
        </tbody>
      </table>
    </div>) : <></>;
  };

  const temperature = input => {
    if (input) {
      var rows = []
      var data = input.data;
      for (let i = 0; i < data.length; i = i + 1) {
        let row = (
          <tr key={"rows_" + i}>
            <td className="table-cell">
              <EditableCell type="time" value={data[i].time} />
            </td>
            <td className="table-cell">
              <div>
                <div style={{ width: "65%", float: "left" }}>
                  <EditableCell key={"value_cell_" + i} type="value" value={data[i].value}  />
                </div>
              </div>
            </td>
          </tr>
        )
        rows.push(row)
      }

      return input ? (<div>
        <span>Temperature: {input.userText} {input.valueUnit} </span>
        <Table className="editable-table" style={{ backgroundColor: 'transparent' }}>
          <thead>
            <tr>
              <th> Time (hh:mm:ss) </th>
              <th> Temperature ({input.valueUnit}) </th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </Table>
      </div>) : <></>;
    }
  }

  const handleRevert = (name, kind, value) => {
    props.updateParent(name, kind, value);
  }

  const renderRevertButton = (name, kind, oldValue) => {
    if (['location', 'name', 'external_label', 'real_amount_value', 'description', 'solvent',
      'real_amount_unit', 'showed_name', 'target_amount_unit', 'target_amount_value', 'boiling_point',
      'melting_point', 'short_label', 'purity', 'density', 'molarity_value', 'data', 'temperature'].includes(name)) {
      return (<Button
        bsSize="xsmall"
        type="button"
        bsStyle='default'
        style={{ marginLeft: '5px' }}
        onClick={() => handleRevert(name, kind, oldValue)}
      >
        <i className="fa fa-undo" />
      </Button>);
    }
  }

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
        changes.map(({
          name, label, kind, oldValue, newValue
        }) => (
          <div>
            <Row key={name} bsStyle="version-history">
              <Col xs={12}>
                <strong>{label}</strong>
                {renderRevertButton(name, kind, oldValue)}
              </Col>
            </Row>
            <Row bsStyle="version-history">
              <Col xs={6} className="bg-danger" style={{ whiteSpace: 'pre-line' }}>
                {formatValue(kind, oldValue)}
              </Col>
              <Col xs={6} className="bg-success" style={{ whiteSpace: 'pre-line' }}>
                {formatValue(kind, newValue)}
              </Col>
            </Row>
          </div>
        ))
      }
    </>
  );
}

VersionsTableChanges.propTypes = {
  changes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default VersionsTableChanges;
