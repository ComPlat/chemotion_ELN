/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Button, Panel, Row, Col
} from 'react-bootstrap';
import Select from 'react-select';
import UsersFetcher from 'src/fetchers/UsersFetcher';

const DEFAULT_EDITOR = 'ketcher';

function UserSetting() {
  const [editors, setEditors] = useState([]);
  const [editor, setEditor] = useState({ default: DEFAULT_EDITOR, selected: DEFAULT_EDITOR, changing: false });

  const initProfile = () => {
    UsersFetcher.fetchProfile().then((result) => {
      setEditor((prev) => ({ ...prev, default: (result?.data?.default_structure_editor || DEFAULT_EDITOR) }));
    }).catch((error) => {
      console.log(error);
      setEditor((prev) => ({ ...prev, default: DEFAULT_EDITOR }));
    });
  };

  const initEditor = () => {
    UsersFetcher.listEditors().then((result) => {
      setEditors(result.matrices || []);
    }).catch((error) => {
      console.log(error);
      setEditors([]);
    });
  };

  useEffect(() => {
    initProfile();
    initEditor();
  }, []);

  const updateProfile = () => {
    setEditor((prev) => ({ ...prev, changing: true }));
    UsersFetcher.updateUserProfile({ data: { default_structure_editor: editor.selected } })
      .then((result) => {
        setEditor((prev) => ({ ...prev, default: result.data.default_structure_editor, changing: false }));
      }).catch((error) => {
        console.log(error);
      });
  };

  const onChange = (e) => {
    setEditor((prev) => ({ ...prev, selected: e.value }));
  };

  let options = editors
    .map((e) => ({ value: e.configs.editor, label: `${e.label} (${e.configs.editor})` }));
  options = [{ value: 'ketcher', label: 'Ketcher (ketcher)' }].concat(options);

  return (
    <Panel>
      <Panel.Heading><Panel.Title>Structure Editor</Panel.Title></Panel.Heading>
      <Panel.Body>
        <Row className="profile-row">
          <Col sm={2}><b>Current default is</b></Col>
          <Col sm={2}>{editor?.default}</Col>
          <Col sm={2}><b>Editor Selection</b></Col>
          <Col sm={2}>
            <Select
              name="editor selection"
              clearable={false}
              options={options}
              onChange={onChange}
              value={editor?.selected}
            />
          </Col>
          <Col sm={4}>
            <Button bsStyle="primary" onClick={() => updateProfile()}>
              {
                editor.changing ? <i className="fa fa-spinner fa-pulse" aria-hidden="true" /> : null
              }
              Update user profiles
            </Button>
          </Col>
        </Row>
        <br />
      </Panel.Body>
    </Panel>
  );
}

export default UserSetting;

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('StructureEditorUserSetting');
  if (domElement) { ReactDOM.render(<UserSetting />, domElement); }
});
