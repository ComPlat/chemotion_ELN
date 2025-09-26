import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import UIStore from 'src/stores/alt/stores/UIStore';

import Reaction from 'src/models/Reaction';
import SvgWithPopover from 'src/components/common/SvgWithPopover';

function ReactionGroupHeader({ group, element }) {
  const [showPreviews, setShowPreviews] = useState(UIStore.getState().showPreviews);

  useEffect(() => {
    const updateShowPreviews = (state) => {
      setShowPreviews(state.showPreviews);
    };

    UIStore.listen(updateShowPreviews);
    return () => UIStore.unlisten(updateShowPreviews);
  }, []);

  return (
    <div>
      {showPreviews && (
        <SvgWithPopover
          hasPop
          previewObject={{
            txtOnly: '',
            isSVG: true,
            className: 'reaction-header',
            src: element.svgPath
          }}
          popObject={{
            title: group,
            src: element.svgPath,
            height: '26vh',
            width: '52vw',
          }}
        />
      )}
    </div>
  );
}

ReactionGroupHeader.propTypes = {
  group: PropTypes.string.isRequired,
  element: PropTypes.instanceOf(Reaction).isRequired,
};

export default ReactionGroupHeader;
