import React, { useState, useEffect } from 'react';
import CreatableSelect from 'react-select/lib/Creatable';
import { Button, Modal, FormGroup, ControlLabel, Row, Table, Form } from 'react-bootstrap';

import UserSettingsFetcher from '../../fetchers/UserSettingsFetcher';


function Affiliations({ show, onHide }) {

  const [affiliations, setAffiliations] = useState([]);

  const [countryOptions, setCountryOptions] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");

  const [isUpdate, setIsUpdate] = useState(false);
  const [updateId, setUpdateId] = useState(0);

  const [showAlert, setShowAlert] = useState(false);


  useEffect(() => {
    setIsUpdate(false);
    handleAutoComplete();
  }, []);

  useEffect(() => { handleClear(); }, [show]);

  const getAllAffiliations = () => {
    UserSettingsFetcher.getAllAffiliations()
      .then((data) => setAffiliations(data));
  };

  const handleDeleteAffiliation = (id) => {
    UserSettingsFetcher.deleteAffiliation(id)
      .then((result) => {
        if (result.error) {
          console.error(result.error);
          return false;
        }
        setShowAlert(true);
        getAllAffiliations();
      }
      );
  };

  const handleClear = () => {
    setSelectedCountry('');
    setSelectedOrg('');
    setSelectedDepartment('');
    setSelectedGroup('');
    setIsUpdate(false);

  };

  const handleUpdateAffiliation = () => {

    UserSettingsFetcher.updateAffiliation
      ({
        id: updateId,
        country: selectedCountry,
        organization: selectedOrg,
        department: selectedDepartment,
        group: selectedGroup
      })
      .then(() => getAllAffiliations())
      .catch((error) => {
        console.error(error);
      });

  };

  const handleUpdateToggle = (affiliation) => {

    setIsUpdate(true);
    setUpdateId(affiliation.id);
    setSelectedCountry(affiliation.country);
    setSelectedOrg(affiliation.organization);
    setSelectedDepartment(affiliation.department);
    setSelectedGroup(affiliation.group);
    setShowAlert(true);
    getAllAffiliations();
  };

  const handleAutoComplete = () => {

    UserSettingsFetcher.getAutoCompleteSuggestions('countries')
      .then((data) => {
        data.map((item) => {
          if (!countryOptions.map(option => option.value).includes(item)) {
            setCountryOptions(prevItems => [...prevItems, { value: item, label: item }]);
          }
        });
      });

    UserSettingsFetcher.getAutoCompleteSuggestions('organizations')
      .then((data) => {
        data.map((item) => {
          if (!orgOptions.map(option => option.value).includes(item)) {
            setOrgOptions(prevItems => [...prevItems, { value: item, label: item }]);
          }
        });

      });

    UserSettingsFetcher.getAutoCompleteSuggestions('departments')
      .then((data) => {
        data.map((item) => {
          if (!deptOptions.map(option => option.value).includes(item)) {
            setDeptOptions(prevItems => [...prevItems, { value: item, label: item }]);
          }
        });

      });

    UserSettingsFetcher.getAutoCompleteSuggestions('groups')
      .then((data) => {
        data.map((item) => {
          if (!groupOptions.map(option => option.value).includes(item)) {
            setGroupOptions(prevItems => [...prevItems, { value: item, label: item }]);
          }
        });

      });
    getAllAffiliations();

  };

  const handleCreateAffiliations = () => {
    UserSettingsFetcher.createAffiliation({
      country: selectedCountry,
      organization: selectedOrg,
      department: selectedDepartment,
      group: selectedGroup
    }).then(() => {
      getAllAffiliations();
      setIsUpdate(false);
    })
      .catch((error) => {
        console.error(error);
      });
  };

  const renderAffiliationsTable = (affiliations) => (
    <Table striped bordered hover>
      <thead>
        <tr>
          <th>Country</th>
          <th>Organization</th>
          <th>Department</th>
          <th>Working Group</th>
          <th>From</th>
          <th>To</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {affiliations.map((item) => (
          <tr key={item.id}>
            <td>{item.country}</td>
            <td>{item.organization}</td>
            <td>{item.department}</td>
            <td>{item.group}</td>
            <td>{item.from}</td>
            <td>{item.to}</td>
            <td>
              <Button
                bsSize='small'
                //bsStyle={`${isUpdate} ? "default" : "primary" `}
                bsStyle='primary'
                //className="pull-left"
                onClick={() => handleUpdateToggle(item)}>
                <i className="fa fa-edit" />
              </Button>
              <Button
                bsSize='small'
                bsStyle="danger"
                className="pull-right"
                onClick={() => handleDeleteAffiliation(item.id)}>
                <i className="fa fa-trash-o" />
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>);

  return (
    <Modal
      bsSize='lg'
      show={show}
      onHide={onHide}
      backdrop="static"
      keyboard={false} >
      <Modal.Header closeButton onHide={onHide} >
        <Modal.Title>My past and current affiliations</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <>
          <Form>
            <FormGroup as={Row} className="form-group mt-3 mb-3" >
              <ControlLabel>
                Country
              </ControlLabel>

              <CreatableSelect
                isCreatable
                placeholder='Select or enter a new option'
                components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                options={countryOptions}
                value={selectedCountry || ''}
                isSearchable
                isClearable
                onChange={(choice) => (!choice) ? setSelectedCountry('') : setSelectedCountry(choice.value)}
              />
            </FormGroup>

            <FormGroup as={Row} required className="form-group mb-3">
              <ControlLabel className='org-label' required >
                Organization
              </ControlLabel>

              <CreatableSelect
                components={{ DropdownIndicator: () => null }}
                placeholder='Select or enter a new option'
                isCreatable
                options={orgOptions}
                value={selectedOrg}
                isClearable
                onChange={(choice) => (!choice) ? setSelectedOrg('') : setSelectedOrg(choice.value)}
              />
            </FormGroup>

            <FormGroup as={Row} className="form-group mb-3">
              <ControlLabel>
                Department
              </ControlLabel>

              <CreatableSelect
                isCreatable
                components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                placeholder='Select or enter a new option'
                options={deptOptions}
                value={selectedDepartment}
                //isSearchable
                clearable={true}
                onChange={(choice) => (!choice) ? setSelectedDepartment('') : setSelectedDepartment(choice.value)}
              />
            </FormGroup>

            <FormGroup as={Row} className="form-group mb-3">
              <ControlLabel>
                Working group
              </ControlLabel>

              <CreatableSelect
                isCreatable
                placeholder='Select or enter a new option'
                components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                allowCreate={true}
                options={groupOptions}
                value={selectedGroup}
                isSearchable
                closeMenuOnSelect
                isClearable
                onChange={(choice) => (!choice) ? setSelectedGroup('') : setSelectedGroup(choice.value)}
              />
            </FormGroup>
            {
              isUpdate
                ? (<FormGroup as={Row} className="form-group mb-3">
                  <Button className='btn btn-primary' size='sm' onClick={handleUpdateAffiliation} >
                    Update affiliation
                  </Button>
                </FormGroup>)
                : (
                  <FormGroup as={Row} className="form-group mb-3">
                    <Button className='btn btn-primary' size='sm' onClick={handleCreateAffiliations} >
                      Add affiliation
                    </Button>
                  </FormGroup>)
            }
          </Form>

          {renderAffiliationsTable(affiliations)}

        </>
      </Modal.Body>

      {/* <Modal.Footer>
        <Button className='btn btn-primary pull-left' size='sm' >
          Update
        </Button>
      </Modal.Footer> */}

    </Modal >
  );
};

export default Affiliations;
