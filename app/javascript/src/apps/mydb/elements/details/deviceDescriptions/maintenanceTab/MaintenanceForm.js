import React, { useContext } from 'react';
import { Form, Row, Col, Accordion } from 'react-bootstrap';
import {
  selectInput, textareaInput, mulipleRowInput, toggleContent
} from '../FormFields';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const MaintenanceForm = () => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  let deviceDescription = deviceDescriptionsStore.device_description;

  const yesOrNo = [
    { value: 'yes', label: 'yes' },
    { value: 'no', label: 'no' },
  ];

  const schedules = [
    { value: 'yearly', label: 'yearly' },
    { value: 'every two years', label: 'every two years' },
    { value: 'on Request', label: 'on request' },
  ];

  const contactFields = [
    { value: 'company', label: 'Company', type: 'text' },
    { value: 'contact', label: 'Contact', type: 'text' },
    { value: 'email', label: 'eMail', type: 'text' },
    { value: 'phone', label: 'Phone', type: 'text' },
    { value: 'comment', label: 'Comment', type: 'text' },
  ];

  const maintenanceType = [
    { value: 'internal', label: 'internal' },
    { value: 'external', label: 'external' },
  ];

  const maintenanceStatus = [
    { value: 'planned', label: 'planned' },
    { value: 'ordered', label: 'ordered' },
    { value: 'done', label: 'done' },
    { value: 'ongoing', label: 'ongoing' },
  ];

  const maintenanceFields = [
    { value: 'date', label: 'Date', type: 'date' },
    { value: 'type', label: 'Type', type: 'select', options: maintenanceType },
    { value: 'details', label: 'Details', type: 'text' },
    { value: 'status', label: 'Status', type: 'select', options: maintenanceStatus },
    { value: 'costs', label: 'Costs', type: 'numeric' },
    { value: 'time', label: 'Time', type: 'numeric' },
    { value: 'changes', label: 'Changes', type: 'text' },
  ];

  const consumablesNeededType = [
    { value: 'mandatory', label: 'mandatory' },
    { value: 'optional', label: 'optional' },
    { value: 'sometimes', label: 'sometimes' },
  ];

  const consumablesNeededStatus = [
    { value: 'available', label: 'available' },
    { value: 'in parts', label: 'in parts' },
    { value: 'ordered', label: 'ordered' },
    { value: 'to be ordered', label: 'to be ordered' },
  ];

  const consumablesNeededFields = [
    { value: 'name', label: 'Name', type: 'text' },
    { value: 'type', label: 'Type', type: 'select', options: consumablesNeededType },
    { value: 'number', label: 'Number', type: 'numeric' },
    { value: 'status', label: 'Status', type: 'select', options: consumablesNeededStatus },
    { value: 'costs', label: 'costs', type: 'numeric' },
    { value: 'details', label: 'details', type: 'text' },
  ];

  return (
    <Form>
      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.general_aspects && 'general_aspects'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'general_aspects')}
      >
        <Accordion.Item eventKey="general_aspects">
          <Accordion.Header>
            General aspects
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4">
              <Col>
                {
                  selectInput(
                    deviceDescription, deviceDescriptionsStore, 'maintenance_contract_available',
                    'Maintenance contract available', yesOrNo
                  )
                }
              </Col>
              <Col>
                {
                  selectInput(
                    deviceDescription, deviceDescriptionsStore, 'maintenance_scheduling',
                    'Scheduling', schedules
                  )
                }
              </Col>
            </Row>
            <Row>
              <Col>
                {
                  mulipleRowInput(
                    deviceDescription, deviceDescriptionsStore, 'Contact for maintenance and repair',
                    'contact_for_maintenance', contactFields, ''
                  )
                }
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.planned_maintenance && 'planned_maintenance'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'planned_maintenance')}
      >
        <Accordion.Item eventKey="planned_maintenance">
          <Accordion.Header>
            Planned Maintenance
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4">
              <Col>
                {
                  mulipleRowInput(
                    deviceDescription, deviceDescriptionsStore, 'Planned maintenance',
                    'planned_maintenance', maintenanceFields, ''
                  )
                }
              </Col>
            </Row>
            <Row>
              <Col>
                {
                  mulipleRowInput(
                    deviceDescription, deviceDescriptionsStore, 'Consumables needed for maintenance',
                    'consumables_needed_for_maintenance', consumablesNeededFields, ''
                  )
                }
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.unexpected_maintenance && 'unexpected_maintenance'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'unexpected_maintenance')}
      >
        <Accordion.Item eventKey="unexpected_maintenance">
          <Accordion.Header>
            Unexpected maintenance and repair
          </Accordion.Header>
          <Accordion.Body>
            <Row>
              <Col>
                {
                  mulipleRowInput(
                    deviceDescription, deviceDescriptionsStore, 'Unexpected maintenance and repair',
                    'unexpected_maintenance', maintenanceFields, ''
                  )
                }
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.unexpected_power_shutdown && 'unexpected_power_shutdown'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'unexpected_power_shutdown')}
      >
        <Accordion.Item eventKey="unexpected_power_shutdown">
          <Accordion.Header>
            Unexpected Power Shutdown
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4">
              <Col>
                {
                  textareaInput(
                    deviceDescription, deviceDescriptionsStore, 'measures_after_full_shut_down',
                    'Measures after complete power shutdown', 3, ''
                  )
                }
              </Col>
            </Row>
            <Row>
              <Col>
                {
                  textareaInput(
                    deviceDescription, deviceDescriptionsStore, 'measures_after_short_shut_down',
                    'Measures for a running device with short shutdown period', 3, ''
                  )
                }
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      <Accordion
        className="mb-4"
        activeKey={deviceDescriptionsStore.toggable_contents.planned_offline_period && 'planned_offline_period'}
        onSelect={() => toggleContent(deviceDescriptionsStore, 'planned_offline_period')}
      >
        <Accordion.Item eventKey="planned_offline_period">
          <Accordion.Header>
            Planned offline period
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4">
              <Col>
                {
                  textareaInput(
                    deviceDescription, deviceDescriptionsStore, 'measures_to_plan_offline_period',
                    'Measures to plan an offline period', 3, ''
                  )
                }
              </Col>
            </Row>
            <Row>
              <Col>
                {
                  textareaInput(
                    deviceDescription, deviceDescriptionsStore, 'restart_after_planned_offline_period',
                    'Re-Start after planned offline time', 3, ''
                  )
                }
              </Col>
            </Row>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </Form>
  );
}

export default observer(MaintenanceForm);
