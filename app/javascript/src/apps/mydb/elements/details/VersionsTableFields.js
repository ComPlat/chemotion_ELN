/* eslint-disable react/no-array-index-key */
import React from 'react';
import PropTypes from 'prop-types';
import {
  FormControl, Table
} from 'react-bootstrap';
import moment from 'moment';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import QuillViewer from 'src/components/QuillViewer';
import { AgGridReact } from 'ag-grid-react';

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

function VersionsTableFields(props) {
  const {
    renderRevertView
  } = props;

  let { fields } = props;

  const date = (input) => (
    input ? moment(input).format('YYYY-MM-DD HH:mm') : ''
  );

  const quill = (input) => (
    input ? <QuillViewer value={input} /> : ''
  );

  const numrange = (input) => (
    input ? `${input.slice(1, -1).split(',')[0]} - ${input.slice(1, -1).split(',')[1]}` : ''
  );

  const treeselect = (input) => (
    (input || '').split(' | ', 2)[1] || input
  );

  const image = (input, title) => (input ? (
    <SvgWithPopover
      placement="top"
      hasPop
      previewObject={{
        txtOnly: '',
        isSVG: input.endsWith('.svg'),
        src: input,
        className: input.endsWith('.svg') ? 'molecule ' : 'image-with-full-width',
      }}
      popObject={{
        title,
        src: input,
        height: '40vh',
        width: '40vw'
      }}
    />
  ) : (
    ''
  ));

  const solvent = (input) => {
    const contents = [];
    if (input) {
      input.forEach((solv, index) => {
        contents.push((
          <SolventDetails
            // eslint-disable-next-line react/no-array-index-key
            key={index}
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
              <tr key={index}>
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

  const table = (input) => {
    const { columns, rows } = input;

    // eslint-disable-next-line react/no-array-index-key
    const th = columns.map((column, index) => <th key={index}>{column.headerName}</th>);

    const tr = rows.map((row, i) => {
      const td = columns.map((column, j) => (
        // eslint-disable-next-line react/no-array-index-key
        <td style={{ height: '37px' }} key={j}>
          {row[column.colId]}
        </td>
      ));

      return (
        // eslint-disable-next-line react/no-array-index-key
        <tr key={i}>
          {td}
        </tr>
      );
    });

    return (
      <table className="table table-bordered">
        <thead>
          <tr>
            {th}
          </tr>
        </thead>
        <tbody>
          {tr}
        </tbody>
      </table>
    );
  };

  const string = (input) => (
    input
      .toString()
      .split('\n')
      .map((line, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <React.Fragment key={index}>
          <div>
            {line}
          </div>
        </React.Fragment>
      ))
  );

  const boolean = (input) => (
    <i className={input ? 'fa fa-check-square-o' : 'fa fa-square-o '} />
  );

  const json = (input) => {
    const array = Array.isArray(input) ? input : [input];
    const formatters = {
      quill,
      image,
      table,
      string,
    };

    const replacer = (key, value) => {
      if (key === 'uuid') return undefined; // omit uuid
      return value;
    };

    return array.map((jsonObject, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <div key={i}>
        {Array.isArray(jsonObject) ? jsonObject.map((object, j) => {
          const { title, content, kind } = object;

          return (
            // eslint-disable-next-line react/no-array-index-key
            <React.Fragment key={j}>
              <strong>{title}</strong>
              <br />
              <div>
                {(formatters[kind] || formatters.string)(content, title)}
              </div>
            </React.Fragment>
          );
        }) : <pre>{JSON.stringify(jsonObject, replacer, 2)}</pre>}
      </div>
    ));
  };

  const formatValue = (kind, value, label) => {
    if (value == null) return '';

    const formatters = {
      date,
      quill,
      numrange,
      treeselect,
      solvent,
      temperature,
      string,
      image,
      boolean,
      json,
    };

    return (
      formatters[kind] || formatters.string
    )(value, label);
  };

  const autoSizeColumns = (params) => {
    params.api.autoSizeColumns(['checkbox']);
  };

  const columns = [
    {
      field: 'checkbox',
      headerName: '',
      cellRenderer: 'agCheckboxCellRenderer',
      cellEditor: 'agCheckboxCellEditor',
      hide: !renderRevertView,
      editable: true,
    },
    {
      field: 'label',
      headerName: 'Label',
      cellStyle: {
        fontWeight: 'bold',
      },
      wrapText: true,
      autoHeight: true,
      flex: 1,
    },
    {
      field: 'oldValue',
      headerName: 'previous version',
      cellStyle: {
        backgroundColor: '#f2dede',
      },
      cellRenderer: (input) => formatValue(input.data.kind, input.value, input.data.label),
      wrapText: true,
      autoHeight: true,
      flex: 2,
    },
    {
      field: 'newValue',
      headerName: 'updated version',
      cellStyle: {
        backgroundColor: '#dff0d8',
      },
      cellRenderer: (input) => formatValue(input.data.kind, input.value, input.data.label),
      wrapText: true,
      autoHeight: true,
      flex: 2,
    },
    {
      field: 'currentValue',
      headerName: 'current version',
      cellRenderer: (input) => formatValue(input.data.kind, input.value, input.data.label),
      wrapText: true,
      autoHeight: true,
      flex: 2,
    },
  ];

  fields = fields.filter((field) => (field.kind !== 'hidden'));
  if (renderRevertView) {
    fields = fields.filter((field) => (field.currentValue !== field.oldValue
    && field.revert.length > 0));
  }

  return (
    <div className="ag-theme-balham" key="fields_show">
      <AgGridReact
        columnDefs={columns}
        rowData={fields}
        domLayout="autoHeight"
        onColumnVisible={autoSizeColumns}
      />
    </div>
  );
}

VersionsTableFields.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  fields: PropTypes.arrayOf(PropTypes.object).isRequired,
  renderRevertView: PropTypes.bool.isRequired,
};

export default VersionsTableFields;
