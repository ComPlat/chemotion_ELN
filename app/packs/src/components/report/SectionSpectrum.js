import React, { Component } from 'react';
import _ from 'lodash';
import ReportActions from '../actions/ReportActions';

const TitleProduct = ({ prd, molSerials }) => {
  const molId = prd.molId;
  const serial = molSerials.map((ms) => {
    if (molId === ms.mol.id) {
      return ms.value;
    }
    return null;
  }).filter(r => r !== null)[0];
  const serialContent = serial ? `${serial}` : 'xx';

  return (
    <h5>
      [{serialContent}] { prd.showedName }
    </h5>
  );
};

const Thumbnail = ({ thumb }) => {
  const noAvaSvg = '/images/wild_card/not_available.svg';
  const thumbImg = `data:image/png;base64,${thumb}`;
  const previewImg = thumb ? thumbImg : noAvaSvg;
  return <img src={previewImg} alt="" className="spectrum-thumbnail" />;
};

const isImg = (att) => {
  const imgExts = ['jpg', 'jpeg', 'png'];
  const ext = att.filename.split('.').pop().toLowerCase();
  const idx = imgExts.indexOf(ext);
  return idx >= 0;
};

const ContentAtts = ({ prd, attThumbNails }) => {
  const contents = prd.atts.map((att, idx) => {
    if (!isImg(att)) {
      return null;
    }
    const key = `${idx}-${att.identifier}`;
    const thumb = attThumbNails.map(tn => (
      tn.id === att.id ? tn.thumbnail : null
    )).filter(r => r !== null)[0];
    return (
      <div key={key}>
        <div>{att.kind}</div>
        <Thumbnail thumb={thumb} />
      </div>
    );
  });

  return (
    <div>
      {contents}
    </div>
  );
};

const RowProduct = ({ prd, molSerials, attThumbNails }) => (
  <div>
    <TitleProduct prd={prd} molSerials={molSerials} />
    <ContentAtts prd={prd} attThumbNails={attThumbNails} />
  </div>
);

class SectionSpectrum extends Component {
  componentDidMount() {
    this.updateThumbNails();
  }

  shouldComponentUpdate(nextProps) {
    const prevProps = this.props;
    const isChanged = !_.isEqual(prevProps, nextProps);
    return isChanged;
  }

  componentWillUpdate() {
    this.updateThumbNails();
  }

  updateThumbNails() {
    const { prdAtts } = this.props;
    const attArrIds = prdAtts.map(prdAtt => (
      prdAtt.atts.map(att => (
        att.thumbnail ? null : att.id
      ))
    ));
    const attIds = _.flattenDeep(attArrIds).filter(r => r !== null);
    if (attIds.length > 0) {
      ReportActions.updateThumbNails(attIds);
    }
  }

  renderContents() {
    const { molSerials, prdAtts, attThumbNails } = this.props;

    const contents = prdAtts.map((prd, idx) => {
      const key = `${idx}-${prd.sum_formular}`;
      return (
        <div key={key}>
          <RowProduct
            prd={prd}
            molSerials={molSerials}
            attThumbNails={attThumbNails}
          />
        </div>
      );
    });
    return contents;
  }

  render() {
    return (
      <div>
        { this.renderContents() }
      </div>
    );
  }
}

export default SectionSpectrum;
