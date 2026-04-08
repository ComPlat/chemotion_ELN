import React from 'react';
import PropTypes from 'prop-types';
import { Card } from 'react-bootstrap';
import QuillViewer from 'src/components/QuillViewer';
import DetailCard from 'src/apps/mydb/elements/details/DetailCard';
import { detailFooterButton } from 'src/apps/mydb/elements/details/DetailCardButton';

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

function FormatDetails({
  list, isPendingToSave, onSave, onFormat, onClose
}) {
  const footerToolbar = (
    <>
      {detailFooterButton({
        label: 'Format',
        iconClass: 'fa fa-magic',
        onClick: onFormat,
      })}
      {detailFooterButton({
        label: 'Save',
        iconClass: 'fa fa-floppy-o',
        variant: 'primary',
        onClick: onSave,
        disabled: !isPendingToSave,
      })}
    </>
  );

  return (
    <DetailCard
      title="Analyses Formatting"
      onClose={onClose}
      footerToolbar={footerToolbar}
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
