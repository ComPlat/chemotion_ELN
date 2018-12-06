import React from 'react';
import { Button, Row, Col } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { concat, uniqBy } from 'lodash';
import PubchemSigns from './PubchemSigns';

const PubchemLcss = ({
  cid, informArray
}) => {
  const sourceRoot = 'https://pubchem.ncbi.nlm.nih.gov';
  let imgWH = 70 * (4 / 9);

  let imgs = [];
  informArray.map((inform) => {
    const htmlDoc = new DOMParser().parseFromString(inform.StringValue, 'text/html');
    const extract = [].slice.call(htmlDoc.querySelectorAll('img')).map((g) => {
      return { src: g.getAttribute('src'), title: g.title };
    });
    imgs = concat(imgs, extract);
    return true;
  });
  imgs = uniqBy(imgs, 'src');
  if (imgs.length < 5) {
    imgWH = 70 * (3 / 4);
  }
  const signs = imgs.map((img, idx) => <PubchemSigns key={`pubchem_sign_${idx + 1}`} objPath={img.src} objTitle={img.title} objWidth={imgWH} objHeight={imgWH} />);

  return (
    <div>
      <Row>
        <Col md={12}>
          {signs}
        </Col>
      </Row>
      <Row>
        <Col md={12}>
          <Button style={{ border: 'none' }} bsSize="xsmall" onClick={() => { window.open(`${sourceRoot}/compound/${cid}#datasheet=lcss&section=Top`, '_blank'); }}>
            <img src="/images/wild_card/pubchem.svg" style={{ height: '1.5vh' }} alt="" />&nbsp;
            <i style={{
              color: '#777777', fontSize: '10px', fontWeight: 'bold', textDecoration: 'underline'
              }}
            >
              Read more about Safety Summary...
            </i>
          </Button>
        </Col>
      </Row>
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
