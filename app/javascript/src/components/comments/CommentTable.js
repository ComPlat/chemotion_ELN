import React, { useCallback, useContext, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import DeleteComment from 'src/components/common/DeleteComment';
import CommentFetcher from 'src/fetchers/CommentFetcher';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { formatSection } from 'src/utilities/CommentHelper';
import { formatDate } from 'src/utilities/timezoneHelper';

const CommentTable = ({ element, comments, editComment, deleteComment, showSection }) => {
  const gridRef = useRef();
  const { currentUser } = useContext(StoreContext).userStore;

  const markCommentResolved = (comment) => {
    const params = {
      content: comment.content,
      status: 'Resolved',
    };
    CommentFetcher.updateComment(comment, params)
      .then(() => {
        CommentActions.fetchComments(element);
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  };

  const getRowId = useCallback((params) => params.data.id, []);

  const disableEditComment = (comment) => comment.status === 'Resolved';

  const commentByCurrentUser = (comment) => currentUser.id === comment.created_by;

  const renderSection = (node) => formatSection(node.data.section, element.type);

  const renderDate = (node) => (<span className="text-info">{formatDate(node.data.created_at)}</span>);

  const renderActions = (node) => {
    const comment = node.data;

    return (
      <ButtonToolbar className="flex-nowrap my-2">
        <Button
          disabled={disableEditComment(comment)}
          onClick={() => markCommentResolved(comment)}
          variant="light"
          className="me-2"
        >
          {comment.status === 'Resolved' ? 'Resolved' : 'Resolve'}
        </Button>
        {
          commentByCurrentUser(comment)
          && (
            <Button
              size="xsm"
              variant="primary"
              onClick={() => editComment(comment)}
              disabled={disableEditComment(comment)}
            >
              <i className="fa fa-edit" />
            </Button>
          )
        }
        {
          commentByCurrentUser(comment)
          && (
            <DeleteComment
              comment={comment}
              onDelete={() => deleteComment(comment)}
            />
          )
        }
      </ButtonToolbar>
    );
  };

  let columnDefs = [
    {
      headerName: 'Date',
      minWidth: 200,
      maxWidth: 200,
      cellRenderer: renderDate,
    },
    {
      headerName: 'Comment',
      field: 'content',
      wrapText: true,
      cellClass: ['lh-base', 'p-2', 'border-end'],
    },
    {
      headerName: 'From User',
      field: 'submitter',
    },
    {
      headerName: 'Actions',
      cellRenderer: renderActions,
    },
    {
      headerName: 'Resolved By',
      field: 'resolver_name',
    },
  ];

  if (showSection) {
    columnDefs = [
      ...columnDefs.slice(0, 0),
      {
        headerName: 'Column',
        minWidth: 100,
        maxWidth: 100,
        cellRenderer: renderSection,
      },
      ...columnDefs.slice(0)
    ];
  }

  const defaultColDef = {
    editable: false,
    flex: 1,
    autoHeight: true,
    sortable: false,
    resizable: false,
    suppressMovable: true,
    cellClass: ['border-end', 'px-2'],
    headerClass: ['border-end', 'px-2']
  };

  return (
    <div className="ag-theme-alpine mb-4">
      <AgGridReact
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowData={comments || []}
        rowHeight="auto"
        domLayout="autoHeight"
        autoSizeStrategy={{ type: 'fitGridWidth' }}
        getRowId={getRowId}
      />
    </div>
  );
};

export default CommentTable;

CommentTable.propTypes = {
  element: PropTypes.object.isRequired,
  editComment: PropTypes.func.isRequired,
  deleteComment: PropTypes.func.isRequired,
  showSection: PropTypes.bool.isRequired,
};
