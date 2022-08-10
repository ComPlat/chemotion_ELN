/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, Glyphicon, PanelGroup, Panel, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { uniq } from 'lodash';
import Immutable from 'immutable';
import { stopEvent } from 'src/utilities/DomHelper';
import { Citation, CitationUserRow, literatureContent } from 'src/components/LiteratureCommon';

const citePan = (props) => {
  const {
    citation, content, userId, removeCitation
  } = props;
  return (
    <Panel key={`k_citation_${citation.id}`} eventKey={`citation_${citation.id}`} style={{ borderColor: 'white' }}>
      <Panel.Heading style={{ backgroundColor: 'unset' }}>
        <Panel.Title toggle style={{ fontSize: '14px' }}>
          <div className="padding-right" style={{ display: 'inline-block', width: '90%' }}>
            <Citation literature={citation} />
          </div>
          <div style={{ float: 'right' }}>
            <Button data-toggle="collapse" data-target={`#literature_id_${citation.id}`} aria-expanded="false" aria-controls={`literature_id_${citation.id}`} bsSize="xs">
              <Glyphicon glyph="chevron-right" title="Collapse/Uncollapse" style={{ cursor: 'pointer', color: '#337ab7', top: 0 }} />
            </Button>
            <OverlayTrigger placement="bottom" overlay={<Tooltip id="assign_button">copy to clipboard</Tooltip>}>
              <Button bsSize="xs" active className="clipboardBtn" data-clipboard-text={content} onClick={stopEvent}>
                <i className="fa fa-clipboard" aria-hidden="true" />
              </Button>
            </OverlayTrigger>
          </div>
        </Panel.Title>
      </Panel.Heading>
      <Panel.Body collapsible>
        <div className="padding-right" style={{ display: 'inline-block' }}><CitationUserRow literature={citation} userId={userId} /></div>
        <div style={{ float: 'right' }}>
          <Button bsSize="xs" bsStyle="danger" onClick={e => removeCitation(e, citation)}>
            <i className="fa fa-trash-o" aria-hidden="true" />
          </Button>
        </div>
      </Panel.Body>
    </Panel>
  );
};

export default class CitationTable extends Component {
  constructor(props, context) {
    super(props, context);
    this.state = { activeKey: '1' };
    this.handleSelect = this.handleSelect.bind(this);
    this.removeCitation = this.removeCitation.bind(this);
  }

  handleSelect(activeKey) {
    this.setState({ activeKey });
  }

  removeCitation(e, citation) {
    stopEvent(e);
    this.props.removeCitation(citation);
  }

  render() {
    const { rows, sortedIds, userId } = this.props;
    const pans = uniq(sortedIds).map((id) => {
      const citation = rows.get(id);
      const content = literatureContent(citation, true);
      return citePan({
        citation, content, userId, removeCitation: this.removeCitation
      });
    });
    return (
      <PanelGroup accordion id="citation-list-controlled" activeKey={this.state.activeKey} onSelect={this.handleSelect}>
        {pans}
      </PanelGroup>
    );
  }
}

CitationTable.propTypes = {
  rows: PropTypes.instanceOf(Immutable.Map),
  sortedIds: PropTypes.array,
  userId: PropTypes.number,
  removeCitation: PropTypes.func.isRequired
};

CitationTable.defaultProps = { rows: new Immutable.Map(), sortedIds: [], userId: 0 };
