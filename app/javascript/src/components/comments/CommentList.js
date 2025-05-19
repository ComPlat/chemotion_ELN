import React from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import CommentStore from 'src/stores/alt/stores/CommentStore';
import { getSectionComments } from 'src/utilities/CommentHelper';
import { formatDate } from 'src/utilities/timezoneHelper';

const CommentList = ({ section }) => {
  const { comments } = CommentStore.getState();
  const sectionComments = getSectionComments(comments, section)?.filter((cmt) => cmt.status === 'Pending');

  if (sectionComments.length === 0) { return null; }

  const renderDate = (node) => {
    return formatDate(node.data.created_at);
  }

  const columnDefs = [
    {
      headerName: "Date",
      minWidth: 200,
      maxWidth: 200,
      cellRenderer: renderDate,
    },
    {
      headerName: "Comment",
      field: "content",
      wrapText: true,
      cellClass: ["lh-base", "p-2", "border-end"],
    },
    {
      headerName: "From User",
      field: "submitter",
    },
  ];

  const defaultColDef = {
    editable: false,
    flex: 1,
    autoHeight: true,
    sortable: false,
    resizable: false,
    suppressMovable: true,
    cellClass: ["border-end", "px-2"],
    headerClass: ["border-end", "px-2"]
  };

  return (
    <div className="ag-theme-alpine w-100 mb-4">
      <AgGridReact
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowData={sectionComments || []}
        rowHeight="auto"
        domLayout="autoHeight"
        autoSizeStrategy={{ type: 'fitGridWidth' }}
      />
    </div>
  );
}

export default CommentList;

CommentList.propTypes = {
  section: PropTypes.string,
};

CommentList.defaultProps = {
  section: 'header',
};
