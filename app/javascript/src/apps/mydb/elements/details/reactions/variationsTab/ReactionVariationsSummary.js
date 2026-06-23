import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert, Spinner, Badge, Table, Collapse, Button
} from 'react-bootstrap';
import Reaction from 'src/models/Reaction';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import UIActions from 'src/stores/alt/actions/UIActions';
import {
  collectSummaryGroups, getColumns, formatCell
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsSummaryUtils';

function SummaryTable({ table }) {
  const items = table.items ?? [];
  if (items.length === 0) {
    return null;
  }
  const columns = getColumns(items);

  return (
    <div className="mt-2" style={{ overflowX: 'auto' }}>
      <Table bordered hover size="sm" className="bg-white mb-0">
        <thead className="bg-light">
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column}>{formatCell(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

SummaryTable.propTypes = {
  table: PropTypes.shape({
    id: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.objectOf(
      PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool])
    )),
  }).isRequired,
};

function PlotsSection({ plots }) {
  const [open, setOpen] = useState(false);
  if (plots.length === 0) {
    return null;
  }
  return (
    <div className="mt-2">
      <Button
        variant="link"
        size="sm"
        className="p-0 text-decoration-none"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <i className={`fa fa-caret-${open ? 'down' : 'right'} me-1`} aria-hidden="true" />
        {`Plots (${plots.length})`}
      </Button>
      <Collapse in={open}>
        <div>
          {plots.map((plot) => (
            <img
              key={plot.id}
              src={`/api/v1/attachments/image/${plot.id}`}
              alt={plot.filename}
              className="img-fluid d-block mt-2"
              style={{ maxWidth: '1000px' }}
            />
          ))}
        </div>
      </Collapse>
    </div>
  );
}

PlotsSection.propTypes = {
  plots: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    filename: PropTypes.string,
  })).isRequired,
};

export default function ReactionVariationsSummary({ reaction }) {
  const [summariesById, setSummariesById] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [freshContainer, setFreshContainer] = useState(null);

  const container = freshContainer ?? reaction.container;
  const summaryGroups = collectSummaryGroups(container);
  const attachmentIds = summaryGroups
    .flatMap((group) => group.attachments.map((attachment) => attachment.id))
    .join(',');

  useEffect(() => {
    const ids = attachmentIds ? attachmentIds.split(',') : [];
    if (ids.length === 0) {
      setSummariesById({});
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(
      ids.map((id) => AttachmentFetcher
        .fetchAttachmentText(id)
        .then((text) => {
          const data = JSON.parse(text);
          return [id, typeof data === 'string' ? JSON.parse(data) : data];
        }))
    )
      .then((entries) => { if (!cancelled) setSummariesById(Object.fromEntries(entries)); })
      .catch(() => { if (!cancelled) setError('Could not load the statistics summary.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [attachmentIds]);

  const refreshResults = () => {
    setRefreshing(true);
    setError(null);
    fetch(`/api/v1/reactions/${reaction.id}.json`, { credentials: 'same-origin' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to reload reaction ${reaction.id}`);
        }
        return response.json();
      })
      .then((json) => setFreshContainer(json?.reaction?.container ?? null))
      .catch(() => setError('Could not reload the reaction.'))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshResults();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reaction.id]);

  const analysisIndex = (analysisId) => reaction.analysisContainers()
    .findIndex((analysis) => analysis.id === analysisId);

  const openAnalysis = (analysisId) => {
    const index = analysisIndex(analysisId);
    if (index === -1) {
      return;
    }
    UIActions.selectActiveAnalysis({ type: 'reaction', analysisIndex: index });
    UIActions.selectActiveAnalysisTab(4.1);
    UIActions.selectTab({ type: 'reaction', tabKey: 'analyses' });
  };

  const busySpinner = (loading || refreshing)
    ? <Spinner animation="border" size="sm" className="ms-2" /> : null;

  return (
    <div className="mt-3">
      <div className="d-flex align-items-center mb-1">
        <h5 className="mb-0">Statistics summary</h5>
        {busySpinner}
      </div>
      {error && <Alert variant="warning">{error}</Alert>}
      {summaryGroups.length === 0 && (
        <span className="text-body-secondary">
          No statistics results yet.
        </span>
      )}
      {/*
      Only the `Output` array is displayed; the envelope fields (id, request_id,
      element_info) are not shown. Each Output entry becomes its own read-only table.
      */}
      {summaryGroups.map((group) => (
        <div key={group.analysisId} className="border rounded p-2 mb-3">
          <div className="d-flex align-items-center gap-2 mb-1">
            <strong>{group.analysisName}</strong>
            <Badge
              bg="info"
              role="button"
              onClick={() => openAnalysis(group.analysisId)}
            >
              Open analysis
              {' '}
              <i className="fa fa-external-link" aria-hidden="true" />
            </Badge>
          </div>
          {group.attachments.flatMap((attachment) => {
            const summary = summariesById[attachment.id];
            return (summary?.Output ?? []).map((table) => (
              <SummaryTable key={`${attachment.id}-${table.id}`} table={table} />
            ));
          })}
          <PlotsSection plots={group.plots} />
        </div>
      ))}
    </div>
  );
}

ReactionVariationsSummary.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
};
