import React, {
  useEffect, useState, Suspense, lazy
} from 'react';
import ReactDOM from 'react-dom';
import { Container } from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import UsersFetcher from 'src/fetchers/UsersFetcher';

// Loaded lazily: this package's bundle injects a global, unscoped
// `body{overflow:hidden}` (min-width: 990px) as a side effect of import.
// A static import would run that on every page (application.js requires
// ConverterAdmin unconditionally), killing the scrollbar app-wide.
const AdminApp = lazy(() => import('@complat/chemotion-converter-client'));

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
  if (isAdmin === null) return null;

  return (
    <>
      <Suspense fallback={null}>
        <AdminApp
          ModalComponent={AppModal}
          converterUrl={CONVERTER_PROXY_URL}
          isAdmin={isAdmin}
        />
      </Suspense>
      <Container fluid>
        <a href="/">Back to MyDB</a>
      </Container>
    </>
  );
};

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('ConverterAdmin');
  if (domElement) ReactDOM.render(<ConverterAdmin />, domElement);
});

export default ConverterAdmin;
