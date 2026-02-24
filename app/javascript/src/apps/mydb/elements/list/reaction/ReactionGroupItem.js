import React from 'react';
import PropTypes from 'prop-types';

import Reaction from 'src/models/Reaction';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ReactionStatus from 'src/apps/mydb/elements/list/reaction/ReactionStatus';
import ReactionRole from 'src/apps/mydb/elements/list/reaction/ReactionRole';
import CommentIcon from 'src/components/comments/CommentIcon';
import SvgWithPopover from 'src/components/common/SvgWithPopover';
import CopyElementModal from 'src/components/common/CopyElementModal';
import { ShowUserLabels } from 'src/components/UserLabels';

function ReactionGroupItem({ element, showDetails }) {
  return (
    <div
      onClick={showDetails}
      role="button"
      className="d-flex justify-content-between"
    >
      <SvgWithPopover
        hasPop
        previewObject={{
          txtOnly: element.title(),
          isSVG: true,
          src: element.svgPath
        }}
        popObject={{
          title: element.short_label,
          src: element.svgPath,
          height: '26vh',
          width: '52vw'
        }}
      />

      <div className="d-flex gap-1 align-items-center">
        <CopyElementModal element={element} />
        <ReactionStatus element={element} />
        <ReactionRole element={element} />
        <ShowUserLabels element={element} />
        <CommentIcon commentCount={element.comment_count} />
        <ElementCollectionLabels element={element} key={element.id} />
      </div>
    </div>
  );
}

ReactionGroupItem.propTypes = {
  element: PropTypes.instanceOf(Reaction).isRequired,
  showDetails: PropTypes.func.isRequired,
};

export default ReactionGroupItem;
