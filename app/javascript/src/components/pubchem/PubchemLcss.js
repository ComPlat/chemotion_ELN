import React from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { concat, uniqBy } from 'lodash';
import PubchemSigns from 'src/components/pubchem/PubchemSigns';

const PubchemLcss = ({
  cid, informArray
}) => {
  const sourceRoot = 'https://pubchem.ncbi.nlm.nih.gov';
  let imgWH = 70 * (4 / 9);
  let imgs = [];

  const picArry = informArray.filter(info => info.Name === 'Pictogram(s)');

  if (picArry.length > 0) {
    picArry.map((p) => {
      const makeups = p.Value.StringWithMarkup;
      makeups.map((ms) => {
        const extract = ms.Markup.map(m => ({ src: m.URL.replace(sourceRoot, ''), title: m.Extra }));
        imgs = concat(imgs, extract);
      });
    });
  } else {
    informArray.map((inform) => {
      const htmlDoc = new DOMParser().parseFromString(inform.StringValue, 'text/html');
      const extract = [].slice.call(htmlDoc.querySelectorAll('img')).map((g) => {
        return { src: g.getAttribute('src'), title: g.title };
      });
      imgs = concat(imgs, extract);
      return true;
    });
  }

  imgs = uniqBy(imgs, 'src');
  if (imgs.length < 5) {
    imgWH = 70 * (3 / 4);
  }
  
  return (
    <div>
      {imgs.map((img, idx) => (
        <PubchemSigns
            key={`pubchem_sign_${idx + 1}`}
            objPath={img.src}
            objTitle={img.title}
            objWidth={imgWH}
            objHeight={imgWH}
          />
      ))}
      <Button size="sm" variant="light" className="my-2" onClick={() => { window.open(`${sourceRoot}/compound/${cid}#datasheet=lcss&section=Top`, '_blank'); }}>
        <img src="/images/wild_card/pubchem.svg" style={{ height: '1.5vh' }} alt="" className='me-1'/>
        <span>Source: European Chemicals Agency (ECHA)<br />
        Read more about Safety Summary from PubChem</span>
      </Button>
    </div>
  );
};

PubchemLcss.propTypes = {
  cid: PropTypes.number.isRequired,
  informArray: PropTypes.arrayOf(PropTypes.shape({
    ReferenceNumber: PropTypes.number.isRequired,
    Name: PropTypes.string.isRequired,
    StringValue: PropTypes.string.isRequired,
  })).isRequired,
};

export default PubchemLcss;
