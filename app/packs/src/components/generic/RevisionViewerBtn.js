/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';

import { PreviewModal } from 'chem-generic-ui';
import { camelize, pascalize } from 'humps';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import { notification } from 'src/apps/generic/Utils';

const RevisionViewerBtn = props => {
  if (props.generic.is_new) return null;
  const [showModal, setShowModal] = useState(false);

  const handleRetrieve = (revision, cb) => {
    setShowModal(false);
    return props.fnRetrieve(revision, cb);
  };

  const handleDelete = (params, cb) => {
    const klass = pascalize(props.generic.properties.klass);
    GenericElsFetcher.deleteRevisions({
      id: params.id,
      element_id: props.generic.id,
      klass,
    }).then(response => {
      if (response.error) {
        notification({
          title: 'Delete Revision',
          lvl: 'error',
          msg: response.error,
        });
      } else {
        cb();
      }
    });
  };

  return (
    <>
      <OverlayTrigger
        delayShow={1000}
        placement="top"
        overlay={<Tooltip id={uuid.v4()}>click to view the revisions</Tooltip>}
      >
        <Button
          onClick={() => setShowModal(!showModal)}
          bsSize="xsmall"
          bsStyle="primary"
        >
          <i className="fa fa-book" aria-hidden="true" /> Revision
        </Button>
      </OverlayTrigger>
      <PreviewModal
        fnRetrieve={handleRetrieve}
        fnDelete={handleDelete}
        showModal={showModal || false}
        fnClose={() => setShowModal(false)}
        fetcher={GenericElsFetcher}
        element={props.generic}
        fetcherFn={camelize(
          `fetch_${props.generic.properties.klass}_revisions`
        )}
      />
    </>
  );
};

RevisionViewerBtn.propTypes = {
  generic: PropTypes.object.isRequired,
  fnRetrieve: PropTypes.func,
};
RevisionViewerBtn.defaultProps = { fnRetrieve: () => {} };
export default RevisionViewerBtn;
