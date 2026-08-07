import React, { useEffect, useState } from 'react';
import { Navbar, Nav } from 'react-bootstrap';
import { aviatorNavigationToApp } from 'src/utilities/routesUtils';
import AdminApp from '@complat/chemotion-converter-client';
import AppModal from 'src/components/common/AppModal';
import UsersFetcher from 'src/fetchers/UsersFetcher';

// AdminApp issues plain fetches against this base, so pointing it at the ELN
// proxy keeps them same-origin and carrying the session cookie. converter-app
// itself sits behind basic auth and is never reachable from the browser.
const CONVERTER_PROXY_URL = '/api/v1/converter';

const ConverterAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    UsersFetcher.fetchCurrentUser()
      .then((result) => setIsAdmin(result?.user?.converter_admin === true))
      .catch(() => setIsAdmin(false));
  }, []);

  // AdminApp loads its stores on mount keyed by isAdmin, and an admin mount
  // fetches strictly more than a non-admin one. Rendering before the flag is
  // known would issue the non-admin requests and never retry them.

  return (
    <>
      <Navbar className="bg-gray-200 px-4">
        <Nav className="container-md justify-content-start">
          <Navbar.Brand
            href="#"
            onClick={(e) => { e.preventDefault(); aviatorNavigationToApp('/mydb/collection/all'); }}
          >
            Back to MyDB
          </Navbar.Brand>
          <Navbar.Text className="fs-5 text-black">
            Converter Admin
          </Navbar.Text>
        </Nav>
      </Navbar>
      {
        isAdmin !== null && (
          <AdminApp
            ModalComponent={AppModal}
            converterUrl={CONVERTER_PROXY_URL}
            isAdmin={isAdmin}
          />
        )
      }
      {
        isAdmin === null && (
          <div style={{ marginTop: '60px', textAlign: 'center' }}>
            <h3>Unauthorized!</h3>
          </div>
        )
      }
    </>
  );
};

export default ConverterAdmin;
