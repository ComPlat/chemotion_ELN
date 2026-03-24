import React from 'react';
import PropTypes from 'prop-types';
import { Card, Button } from 'react-bootstrap';
import QuillViewer from 'src/components/QuillViewer';
import DetailCard from 'src/apps/mydb/elements/details/LegacyDetailCard';

const tryParse = function TryParseToJson(obj) {
  if (typeof obj === 'object') return obj;
  return JSON.parse(obj);
};

function ElementAnalyses({ element, idx }) {
  const children = element.children?.map((x) => (
    <ElementAnalyses key={x.id} element={x} />
  ));

  let analyses = element.analyses.map((x) => {
    let kind = x.extended_metadata.kind || '';
    kind = (kind.split('|')[1] || kind).trim();
    const header = `Analysis name: ${x.name} - Type: ${kind}`;
    return (
      <Card key={x.id}>
        <Card.Header>
          {header}
        </Card.Header>
        <Card.Body>
          <QuillViewer value={tryParse(x.extended_metadata.content)} />
        </Card.Body>
      </Card>
    );
  });

  if (element.analyses.length === 0) {
    analyses = (
      <p>
        This
        {element.type}
        {' '}
        does not have any analysis.
      </p>
    );
  }

  return (
    <Card
      key={element.id}
      eventKey={idx}
    >
      <Card.Header>
        {`${element.type}: ${element.short_label}`}
      </Card.Header>
      <Card.Body>
        {children}
        {analyses}
      </Card.Body>
    </Card>
  );
}

ElementAnalyses.propTypes = {
  element: PropTypes.shape({
    type: PropTypes.string.isRequired,
    short_label: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired,
    children: PropTypes.arrayOf(PropTypes.shape({})),
    analyses: PropTypes.arrayOf(PropTypes.shape({}))
  }).isRequired,
  idx: PropTypes.number
};

ElementAnalyses.defaultProps = {
  idx: null
};

function FormatDetailsHeader({ onClose, onSave, onFormat }) {
  return (
    <div className="d-flex gap-1 align-items-baseline">
      <span className="flex-grow-1">Analyses Formatting</span>
      <Button
        key="formatBtn"
        onClick={onFormat}
        variant="info"
        size="xxsm"
      >
        <i className="fa fa-magic" />
      </Button>
      <Button
        key="saveBtn"
        onClick={onSave}
        variant="warning"
        size="xxsm"
      >
        <i className="fa fa-floppy-o" />
      </Button>
      <Button
        key="closeBtn"
        onClick={onClose}
        variant="danger"
        size="xxsm"
      >
        <i className="fa fa-times" />
      </Button>
    </div>
  );
}

FormatDetailsHeader.propTypes = {
  onSave: PropTypes.func.isRequired,
  onFormat: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

function FormatDetails({
  list, isPendingToSave, onSave, onFormat, onClose
}) {
  return (
    <DetailCard
      isPendingToSave={isPendingToSave}
      header={<FormatDetailsHeader onSave={onSave} onFormat={onFormat} onClose={onClose} />}
    >
      {list.map((el, idx) => (
        <ElementAnalyses key={el.id} element={el} idx={idx} />
      ))}
    </DetailCard>
  );
}

FormatDetails.propTypes = {
  list: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  isPendingToSave: PropTypes.bool,
  onSave: PropTypes.func.isRequired,
  onFormat: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

FormatDetails.defaultProps = {
  isPendingToSave: false
};

export default FormatDetails;
