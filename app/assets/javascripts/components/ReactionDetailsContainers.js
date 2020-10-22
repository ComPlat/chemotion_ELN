import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  PanelGroup,
  Panel,
  Button,
} from 'react-bootstrap';
import Container from './models/Container';
import ContainerComponent from './ContainerComponent';
import PrintCodeButton from './common/PrintCodeButton';
import QuillViewer from './QuillViewer';
import ImageModal from './common/ImageModal';
import { hNmrCount, cNmrCount, instrumentText } from './utils/ElementUtils';
import { contentToText } from './utils/quillFormat';
import { chmoConversions } from './OlsComponent';
import { previewContainerImage } from './utils/imageHelper';

const nmrMsg = (reaction, container) => {
  if (container.extended_metadata &&
      (typeof container.extended_metadata.kind === 'undefined' ||
      (container.extended_metadata.kind.split('|')[0].trim() !== chmoConversions.nmr_1h.termId && container.extended_metadata.kind.split('|')[0].trim() !== chmoConversions.nmr_13c.termId)
      )) {
    return '';
  }
  const nmrStr = container.extended_metadata && contentToText(container.extended_metadata.content);

  if ((container.extended_metadata.kind || '').split('|')[0].trim() === chmoConversions.nmr_1h.termId) {
    const msg = hNmrCount(nmrStr);
    return (<div style={{ display: 'inline', color: 'black' }}>&nbsp;(<sup>1</sup>H: {msg})</div>);
  } else if ((container.extended_metadata.kind || '').split('|')[0].trim() === chmoConversions.nmr_13c.termId) {
    const msg = cNmrCount(nmrStr);
    return (<div style={{ display: 'inline', color: 'black' }}>&nbsp;(<sup>13</sup>C: {msg})</div>);
  }
};

export default class ReactionDetailsContainers extends Component {
  constructor(props) {
    super();
    const {reaction} = props;
    this.state = {
      reaction,
      activeContainer: 0
    };

    this.handleChange = this.handleChange.bind(this);
    this.handleAdd = this.handleAdd.bind(this);
    this.handleRemove = this.handleRemove.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.handleOnClickRemove = this.handleOnClickRemove.bind(this);
    this.handleAccordionOpen = this.handleAccordionOpen.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      reaction: nextProps.reaction,
    });
  }

  handleChange(container) {
    const { reaction } = this.state;

    this.props.parent.handleReactionChange(reaction);
  }

  handleUndo(container) {
    const { reaction } = this.state;
    container.is_deleted = false;
    this.props.parent.handleReactionChange(reaction, { schemaChanged: false });
  }

  handleAdd() {
    const { reaction } = this.state;
    const container = Container.buildEmpty();
    container.container_type = 'analysis';
    container.extended_metadata.content = { ops: [{ insert: '' }] };

    if (reaction.container.children.length === 0) {
      const analyses = Container.buildEmpty();
      analyses.container_type = 'analyses';
      reaction.container.children.push(analyses);
    }

    reaction.container.children.filter(element => (
      ~element.container_type.indexOf('analyses')
    ))[0].children.push(container);

    const newKey = reaction.container.children.filter(element => (
      ~element.container_type.indexOf('analyses')
    ))[0].children.length - 1;

    this.handleAccordionOpen(newKey);
    this.props.parent.handleReactionChange(reaction, { schemaChanged: false });
  }

  handleOnClickRemove(container) {
    if (confirm('Delete the container?')) {
      this.handleRemove(container);
    }
  }

  headerBtnGroup(container, reaction, readOnly) {
    return (
      <div className="upper-btn">
        <Button
          bsSize="xsmall"
          bsStyle="danger"
          className="button-right"
          disabled={readOnly}
          onClick={() => this.handleOnClickRemove(container)}
        >
          <i className="fa fa-trash" />
        </Button>
        <PrintCodeButton element={reaction} analyses={[container]} ident={container.id} />
      </div>
    );
  };


  handleRemove(container) {
    let { reaction } = this.state;

    container.is_deleted = true;
    this.props.parent.handleReactionChange(reaction, { schemaChanged: false });
  }

  handleAccordionOpen(key) {
    this.setState({ activeContainer: key });
  }

  addButton() {
    const { readOnly } = this.props;
    if (!readOnly) {
      return (
        <Button
          className="button-right"
          bsSize="xsmall"
          bsStyle="success"
          onClick={this.handleAdd}
        >
          Add analysis
        </Button>
      );
    }

    return (<span />);
  }

  render() {
    const {reaction, activeContainer} = this.state;
    const {readOnly} = this.props;

    let containerHeader = (container) => {
      let kind = container.extended_metadata.kind || '';
      kind = (kind.split('|')[1] || kind).trim();
      const insText = instrumentText(container);
      const previewImg = previewContainerImage(container);
      const status = container.extended_metadata.status || '';
      const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
      const contentOneLine = {
        ops: content.ops.map((x) => {
          const c = Object.assign({}, x);
          if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
          return c;
        }),
      };
      let hasPop = true;
      let fetchNeeded = false;
      let fetchId = 0;
      if (previewImg.startsWith('data:image')) {
        fetchNeeded = true;
        fetchId = container.preview_img.id;
      } else {
        hasPop = false;
      }

      return (
        <div className="analysis-header order" style={{ width: '100%' }}>
          <div className="preview">
            <ImageModal
              hasPop={hasPop}
              preivewObject={{
                src: previewImg
              }}
              popObject={{
                title: container.name,
                src: previewImg,
                fetchNeeded,
                fetchId
              }}
            />
          </div>
          <div className="abstract">
            {
              this.headerBtnGroup(container, reaction, readOnly)
            }
            <div className="lower-text">
              <div className="main-title">{container.name}</div>
              <div className="sub-title">Type: {kind}</div>
              <div className="sub-title">Status: {status} {nmrMsg(reaction, container)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {insText}</div>
              <div className="desc sub-title">
                <span style={{ float: 'left', marginRight: '5px' }}>
                  Content:
                </span>
                <QuillViewer value={contentOneLine}  />
              </div>

            </div>
          </div>
        </div>
      )
    };

    let containerHeaderDeleted = (container) => {
      const kind = container.extended_metadata.kind && container.extended_metadata.kind !== '';
      const titleKind = kind ? (` - Type: ${(container.extended_metadata.kind.split('|')[1] || container.extended_metadata.kind).trim()}`) : '';

      const status = container.extended_metadata.status && container.extended_metadata.status != '';
      const titleStatus = status ? (' - Status: ' + container.extended_metadata.status) : '';

      return (
        <div style={{ width: '100%' }}>
          <strike>
            {container.name}
            {titleKind}
            {titleStatus}
          </strike>
          <Button className="pull-right" bsSize="xsmall" bsStyle="danger"
            onClick={() => this.handleUndo(container)}>
            <i className="fa fa-undo"></i>
          </Button>
        </div>
      )
    };

    if (reaction.container != null && reaction.container.children) {
      const analyses_container = reaction.container.children.filter(element => (
        ~element.container_type.indexOf('analyses')
      ));

      if (analyses_container.length === 1 && analyses_container[0].children.length > 0) {
        return (
          <div>
            <div style={{ marginBottom: '10px' }}>
              &nbsp;{this.addButton()}
            </div>
            <PanelGroup id="reaction-analyses-panel" defaultActiveKey={0} activeKey={activeContainer} onSelect={this.handleAccordionOpen} accordion>
              {analyses_container[0].children.map((container, key) => {
                if (container.is_deleted) {
                  return (
                    <Panel
                      eventKey={key}
                      key={`reaction_container_deleted_${container.id}`}
                    >
                      <Panel.Heading>{containerHeaderDeleted(container)}</Panel.Heading>
                    </Panel>
                  );
                }

                return (
                  <Panel
                    eventKey={key}
                    key={`reaction_container_${container.id}`}
                  >
                    <Panel.Heading>
                      <Panel.Title toggle>
                        {containerHeader(container)}
                      </Panel.Title>
                    </Panel.Heading>
                    <Panel.Body collapsible="true">
                      <ContainerComponent
                        disabled={readOnly}
                        readOnly={readOnly}
                        container={container}
                        onChange={this.handleChange.bind(this, container)}
                      />
                    </Panel.Body>
                  </Panel>
                );
              })}
            </PanelGroup>
          </div>
        );
      }

      return (
        <div
          style={{ marginBottom: '10px' }}
          className="noAnalyses-warning"
        >
          There are currently no Analyses.
          {this.addButton()}
        </div>
      );
    }

    return (
      <div className="noAnalyses-warning">
        There are currently no Analyses.
      </div>
    );
  }
}

ReactionDetailsContainers.propTypes = {
  readOnly: PropTypes.bool,
  parent: PropTypes.object,
};
