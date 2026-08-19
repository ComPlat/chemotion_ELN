import React, { useState, useEffect } from 'react';
import { DocumentEditor } from "@onlyoffice/document-editor-react";

import EditorFetcher from 'src/fetchers/EditorFetcher';

const innerAlert = (message) => {
  if (console && console.log) { console.log(message); }
};
const onReady = () => { innerAlert('Document editor ready'); };
const onDocumentStateChange = (event) => {
  const title = document.title.replace(/\*$/g, '');
  document.title = title + (event.data ? '*' : '');
};
const onError = (event) => {
  if (event) innerAlert(event.data);
};
const onOutdatedVersion = function (event) {
  //location.reload(true);
};

const documentEditorConfig = (editorConfiguration) => ({
    width: '100%',
    height: '950px',
    type: 'desktop',
    token: editorConfiguration.only_office_token,
    document: {
      key: editorConfiguration.key,
      title: editorConfiguration.title,
      url: `${editorConfiguration.callback_server}/api/v1/public/download?token=${editorConfiguration.key}` ,
      fileType: editorConfiguration.fileType,
      info: {
        author: editorConfiguration.author_name,
        created: (new Date(Date.now()).toUTCString()),
      },
      permissions: {
        download: true,
        edit: true,
        fillForms: false,
        review: false,
      },
    },
    documentType: editorConfiguration.docType,
    editorConfig: {
      mode: 'edit',
      lang: 'en',
      callbackUrl: `${editorConfiguration.callback_server}/api/v1/public/callback`,
      user: {
        id: editorConfiguration.author_id,
        name: editorConfiguration.author_name,
      },
      userdata: editorConfiguration.title,
      customization: {
        chat: false,
        compactToolbar: false,
        customer: {
          address: editorConfiguration.info_address,
          info: editorConfiguration.info_title,
          logo: editorConfiguration.info_logo,
          mail: editorConfiguration.info_mail,
          name: editorConfiguration.info_name,
          www: editorConfiguration.info_website
        },
        feedback: {
          url: editorConfiguration.feedbackurl,
          visible: false
        },
        forcesave: false,
        help: false,
        logo: {
          image: editorConfiguration.info_logo,
          imageEmbedded: editorConfiguration.info_logo,
          url: editorConfiguration.info_website
        },
        showReviewChanges: false,
        zoom: 100
      }
    },
    events: {
      onReady,
      onDocumentStateChange,
      onError,
      onOutdatedVersion
    }
  });

const OnlyOfficeEditor = () => {
  const params = new URLSearchParams(window.location.search);
  console.debug(params);
  const [editorConfiguration, setEditorConfiguration] = useState({});

  const urlParams = {
    title: params.get('title'),
    docType: params.get('docType'),
    key: params.get('key'),
    only_office_token: params.get('only_office_token'),
    fileType: params.get('fileType')
  };

  useEffect(() => {
    EditorFetcher
      .config()
      .then((config) => {
        setEditorConfiguration({ ...urlParams, ...config });
      });
  }, []);

  return (
    <>
      <div className="form">
        <div id="iframeEditor"></div>
      </div>
      {
        editorConfiguration.docserver_api &&
          <DocumentEditor
            id="documentEditor"
            documentServerUrl={editorConfiguration.docserver_api}
            config={documentEditorConfig(editorConfiguration)}
          />
      }
    </>
  );
};

export default OnlyOfficeEditor;
