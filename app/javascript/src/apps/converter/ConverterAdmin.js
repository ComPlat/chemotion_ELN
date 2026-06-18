import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import AdminApp from '@complat/chemotion-converter-client';

import AppModal from 'src/components/common/AppModal';
import UsersFetcher from 'src/fetchers/UsersFetcher';

function ConverterAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    UsersFetcher.fetchCurrentUser().then((userResult) => {
      const { user } = userResult;
      setIsAdmin(user.converter_admin);
    });
  });

  return (
    <>
      <div style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        zIndex: 1000,
        background: 'white'
      }}
      >
        <a href="/">Back to MyDB</a>
      </div>
      <AdminApp
        ModalComponent={AppModal}
        converterUrl={`${window.location.origin}/api/v1/converter`}
        isAdmin={isAdmin}
      />
    </>
  );
}

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('ConverterAdmin');
  if (domElement) ReactDOM.render(<ConverterAdmin />, domElement);
});
