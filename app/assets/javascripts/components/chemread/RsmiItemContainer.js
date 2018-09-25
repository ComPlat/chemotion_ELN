import React from 'react';
import PropTypes from 'prop-types';

import RsmiItem from './RsmiItem';
import { renderSvg, extractDetails } from './ChemReadObjectHelper';

export default class RsmiItemContainer extends React.Component {
  constructor() {
    super();

    this.selectSmi = this.selectSmi.bind(this);
  }

  selectSmi() {
    const { uid, idx } = this.props;
    this.props.selectSmi(uid, idx);
  }

  render() {
    const {
      uid, idx, selected, content, removeSmi
    } = this.props;
    const {
      svg, smi, desc, editedSmi
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
      <RsmiItem
        details={extractDetails(desc)}
        desc={desc}
        idx={idx}
        removeSmi={removeSmi}
        selectSmi={this.selectSmi}
        svg={renderSvg(svg)}
        smi={displayedSmi}
        selected={isSelected}
        uid={uid}
      />
    );
  }
}

RsmiItemContainer.propTypes = {
  selectSmi: PropTypes.func.isRequired,
  removeSmi: PropTypes.func.isRequired,
  uid: PropTypes.string.isRequired,
  content: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  idx: PropTypes.number.isRequired,
  selected: PropTypes.arrayOf(PropTypes.shape).isRequired
};
