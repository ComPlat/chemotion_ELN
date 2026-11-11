import React, { useEffect, useState } from 'react';
import { Container, Row } from 'react-bootstrap';
import PublicFetcher from 'src/fetchers/PublicFetcher';

const About = () => {
  const [versions, setVersions] = useState([]);
  const [changelogLink, setChangelogLink] = useState('');

  useEffect(() => {
    PublicFetcher.getAboutInfo()
      .then((result) => {
        setVersions(result.version);
        setChangelogLink(result.changelog_link);
      });
  }, []);

  return (
    <Container className="my-5">
      <Row className="mb-3">
        <h1 className="mb-3">Chemotion ELN - About</h1>

        {versions.map((v) => (<h4 key={v}>{v}</h4>))}

        <p className="mt-3">
          See
          {' '}
          <a href={changelogLink} target="_blank" rel="noopener noreferrer">CHANGELOG.md</a>
          {' '}
          for more details
        </p>
      </Row>
    </Container>
  );
};

export default About;
