import React from 'react';
import PropTypes from 'prop-types';

import ScannedItem from './ScannedItem';
import { renderSvg } from './ChemScannerObjectHelper';

export default class ScannedItemContainer extends React.Component {
  constructor() {
    super();

    this.selectSmi = this.selectSmi.bind(this);
  }

  selectSmi() {
    const { uid, idx, selectSmi } = this.props;
    selectSmi(uid, idx);
  }

  render() {
    const {
      uid, idx, selected, content, removeSmi, editComment
    } = this.props;
    const {
      svg, smi, editedSmi, description, details, comment
    } = content;

    const isSelected = selected.filter(x => (
      x.uid === uid && x.smiIdx === idx
    )).length > 0;

    let displayedSmi = smi;
    if (editedSmi && editedSmi !== '') {
      const smiArr = smi.split('>');
      const allSolvents = smiArr[1].split('.').concat(editedSmi.split(','));
      smiArr[1] = allSolvents.filter(x => x).join('.');
      displayedSmi = smiArr.join('>');
    }

    return (
      <ScannedItem
        details={details}
        description={description}
        comment={comment}
        idx={idx}
        removeSmi={removeSmi}
        selectSmi={this.selectSmi}
        editComment={editComment}
        svg={renderSvg(svg)}
        smi={displayedSmi}
        selected={isSelected}
        uid={uid}
      />
    );
  }
}

ScannedItemContainer.propTypes = {
  selectSmi: PropTypes.func.isRequired,
  removeSmi: PropTypes.func.isRequired,
  editComment: PropTypes.func.isRequired,
  uid: PropTypes.string.isRequired,
  content: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  idx: PropTypes.number.isRequired,
  selected: PropTypes.arrayOf(PropTypes.shape).isRequired
};
