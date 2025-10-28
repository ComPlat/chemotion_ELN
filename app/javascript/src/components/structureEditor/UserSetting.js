import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Button, Card, Row, Col
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import UsersFetcher from 'src/fetchers/UsersFetcher';

const DEFAULT_EDITOR = 'ketcher';

function UserSetting() {
  const [editors, setEditors] = useState([]);
  const [editor, setEditor] = useState({ default: DEFAULT_EDITOR, selected: DEFAULT_EDITOR, changing: false });

  const initProfile = () => {
    UsersFetcher.fetchProfile().then((result) => {
      const userDefault = result?.data?.default_structure_editor || DEFAULT_EDITOR;
      setEditor({
        default: userDefault,
        selected: userDefault,
        changing: false
      });
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

  const collectionOptions = () => {
    const seenLabels = new Set();
    const result = [];

    const firstOption = { value: '', label: 'Select an option' };
    if (!seenLabels.has(firstOption.label)) {
      result.push(firstOption);
      seenLabels.add(firstOption.label);
    }

    editors.forEach((e) => {
      const label = `${e.label} (${e.configs.editor})`;
      if (!seenLabels.has(label)) {
        result.push({
          value: e.configs.editor,
          label
        });
        seenLabels.add(label);
      }
    });

    return result;
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

  const options = collectionOptions();

  return (
    <Card>
      <Card.Header>Structure Editor</Card.Header>
      <Card.Body>
        <Row className="mb-3">
          <Col xs={{ span: 3, offset: 3 }} className="fw-bold">Current default is</Col>
          <Col xs={2}>{editor?.default ?? '-'}</Col>
        </Row>
        <Row className="mb-3 align-items-baseline">
          <Col xs={{ span: 3, offset: 3 }} className="fw-bold">
            Editor Selection
          </Col>
          <Col xs={2}>
            <Select
              name="editor selection"
              options={options}
              onChange={onChange}
              value={
                  options.find(({ value }) => value === editor?.selected)
                  || options.find(({ value }) => value === editor?.default)
                  || options[0]
                }
            />
          </Col>
        </Row>
        <Row>
          <Col xs={{ offset: 8 }}>
            <Button variant="primary" onClick={() => updateProfile()}>
              {editor.changing && (
                <i className="fa fa-spinner fa-pulse" aria-hidden="true" />
              )}
              Update user profiles
            </Button>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

export default UserSetting;

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('StructureEditorUserSetting');
  if (domElement) { ReactDOM.render(<UserSetting />, domElement); }
});
