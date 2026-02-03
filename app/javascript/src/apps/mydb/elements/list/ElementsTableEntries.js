/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, { Component } from 'react';
import SVG from 'react-inlinesvg';

import UIStore from 'src/stores/alt/stores/UIStore';

import ElementListRenderer from 'src/apps/mydb/elements/list/renderers/ElementListRenderer';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import { ShowUserLabels } from 'src/components/UserLabels';
import CommentIcon from 'src/components/comments/CommentIcon';
import PropTypes from 'prop-types';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';

import ReactionRole from 'src/apps/mydb/elements/list/reaction/ReactionRole';
import ReactionVariations from 'src/apps/mydb/elements/list/reaction/ReactionVariations';
import ReactionStatus from 'src/apps/mydb/elements/list/reaction/ReactionStatus';
import ImageModal from 'src/components/common/ImageModal';

export default class ElementsTableEntries extends Component {
  constructor(props) {
    super(props);
    this.state = {
      showPreviews: UIStore.getState().showPreviews,
    };
  }

  componentDidMount() {
    UIStore.listen(this.onUiStoreChange);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onUiStoreChange);
  }

  onUiStoreChange = (uiState) => {
    this.setState({
      showPreviews: uiState.showPreviews
    });
  };

  previewColumn(element, showDetails) {
    const { showPreviews } = this.state;

    const svgContainerStyle = {
      verticalAlign: 'middle',
      textAlign: 'center',
      cursor: 'pointer'
    };

    if (showPreviews && (element.type === 'reaction')) {
      return (
        <div
          className="flex-grow-1"
          style={svgContainerStyle}
          onClick={showDetails}
        >
          <SVG src={element.svgPath} className="reaction" key={element.svgPath} />
        </div>
      );
    }
    if (element.type === 'research_plan' || element.element_klass) {
      if (element.preview_attachment) {
        return (
          <div
            className="ms-auto"
            style={svgContainerStyle}
            onClick={showDetails}
          >
            <div className="attachment-row-image">
              <ImageModal
                attachment={element.preview_attachment}
                popObject={{}}
                placement="left"
              />
            </div>
          </div>
        );
      }
    }

    return null;
  }

  renderElement(element, showDetails) {
    return (
      <div className="d-flex align-items-start">
        <div
          role="button"
          onClick={showDetails}
          style={{ cursor: 'pointer' }}
          width={element.type === 'research_plan' ? '280px' : 'unset'}
          data-cy={`researchPLanItem-${element.id}`}
          className="d-flex gap-1 flex-column flex-grow-1"
        >
          <SvgWithPopover
            hasPop={['reaction'].includes(element.type)}
            previewObject={{
              txtOnly: element.title(),
              isSVG: true,
              src: element.svgPath
            }}
            popObject={{
              title: (element.type === 'reaction' && element.short_label) || '',
              src: element.svgPath,
              height: '26vh',
              width: '52vw'
            }}
          />
          <div className="d-flex gap-1 align-items-center">
            <ReactionStatus element={element} />
            <ReactionRole element={element} />
            <ShowUserLabels element={element} />
            <ReactionVariations element={element} />
          </div>
          <div className="d-flex gap-1 align-items-center">
            <CommentIcon commentCount={element.comment_count} />
            <ElementCollectionLabels element={element} key={element.id} />
          </div>
        </div>
        {this.previewColumn(element, showDetails)}
      </div>
    );
  }

  render() {
    const { elements } = this.props;

    return (
      <ElementListRenderer
        elements={elements}
        renderItem={(element, showDetails) => this.renderElement(element, showDetails)}
      />
    );
  }
}

/* eslint-disable react/forbid-prop-types */
ElementsTableEntries.propTypes = {
  elements: PropTypes.arrayOf(PropTypes.object).isRequired,
};
