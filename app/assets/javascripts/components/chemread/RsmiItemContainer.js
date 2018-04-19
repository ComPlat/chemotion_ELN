import React from 'react';

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
  selectSmi: React.PropTypes.func.isRequired,
  removeSmi: React.PropTypes.func.isRequired,
  uid: React.PropTypes.string.isRequired,
  content: React.PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  idx: React.PropTypes.number.isRequired,
  selected: React.PropTypes.arrayOf(React.PropTypes.shape).isRequired
};
