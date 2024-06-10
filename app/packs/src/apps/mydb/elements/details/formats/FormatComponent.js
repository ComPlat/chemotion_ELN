import React from 'react';
import PropTypes from 'prop-types';
import { Accordion, Button } from 'react-bootstrap';
import QuillViewer from 'src/components/QuillViewer';

import PanelHeader from 'src/components/common/PanelHeader';
import Panel from 'src/components/legacyBootstrap/Panel'

const tryParse = function TryParseToJson(obj) {
  if (typeof obj === 'object') return obj;
  return JSON.parse(obj);
};

function ElementAnalyses({ element, idx }) {
  const children = element.children.map(x => (
    <ElementAnalyses key={x.id} element={x} />
  ));

  let analyses = element.analyses.map((x) => {
    let kind = x.extended_metadata.kind || '';
    kind = (kind.split('|')[1] || kind).trim();
    const header = `Analysis name: ${x.name} - Type: ${kind}`;
    return (
      <Panel key={x.id}>
        <Panel.Heading>
          {header}
        </Panel.Heading>
        <Panel.Body>
          <QuillViewer value={tryParse(x.extended_metadata.content)} />
        </Panel.Body>
      </Panel>
    );
  });

  if (element.analyses.length === 0) {
    analyses = (
      <p> This {element.type} does not have any analysis.</p>
    );
  }

  return (
    <Panel
      key={element.id}
      eventKey={idx}
    >
      <Panel.Heading>
        {`${element.type}: ${element.short_label}`}
      </Panel.Heading>
      <Panel.Body>
      {children}
      {analyses}
      </Panel.Body>
    </Panel>
  );
}

function FormatComponentHeader({ onClose, onSave, onFormat }) {
  const closeBtn = (
    <Button
      key="closeBtn"
      onClick={onClose}
      variant="danger"
      size="sm"
    >
      <i className="fa fa-times" />
    </Button>
  );
  const saveBtn = (
    <Button
      key="saveBtn"
      onClick={onSave}
      variant="warning"
      size="sm"
    >
      <i className="fa fa-floppy-o" />
    </Button>
  );
  const formatBtn = (
    <Button
      key="formatBtn"
      onClick={onFormat}
      variant="info"
      size="sm"
    >
      <i className="fa fa-magic" />
    </Button>
  );
  const btns = [closeBtn, saveBtn, formatBtn];

  return <PanelHeader title="Analyses Formatting" btns={btns} />;
}

function FormatComponent({
  list, variant, onSave, onFormat, onClose
}) {
  const elements = list.map((el, idx) => (
    <ElementAnalyses key={el.id} element={el} idx={idx} />
  ));
  const header = (
    <FormatComponentHeader
      onSave={onSave}
      onFormat={onFormat}
      onClose={onClose}
    />
  );

  return (
    <Panel
      variant={variant}
      className="format-analysis-panel"
    >
      <Panel.Heading>
        {header}
      </Panel.Heading>
      <Panel.Body>
        <Accordion>{elements}</Accordion>
      </Panel.Body>
    </Panel>
  );
}

ElementAnalyses.propTypes = {
  element: PropTypes.shape({
    type: PropTypes.string.isRequired,
    short_label: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired,
    children: PropTypes.arrayOf(PropTypes.object),
    analyses: PropTypes.arrayOf(PropTypes.object)
  }).isRequired,
  idx: PropTypes.number
};

ElementAnalyses.defaultProps = {
  idx: null
};

FormatComponentHeader.propTypes = {
  onSave: PropTypes.func.isRequired,
  onFormat: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

FormatComponent.propTypes = {
  list: PropTypes.arrayOf(PropTypes.object).isRequired,
  variant: PropTypes.string,
  onSave: PropTypes.func.isRequired,
  onFormat: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
};

FormatComponent.defaultProps = {
  variant: 'info'
};

export default FormatComponent;
