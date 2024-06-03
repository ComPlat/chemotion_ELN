import React, { useContext } from 'react';
import { Collapse } from 'react-bootstrap';
import {
  selectInput, textareaInput, headlineWithToggle, mulipleRowInput,
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
    <div className="form-fields">
      {headlineWithToggle(deviceDescriptionsStore, 'general_aspects', 'General aspects')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.general_aspects}>
        <div>
          <div className="grouped-fields-row cols-2">
            {
              selectInput(
                deviceDescription, deviceDescriptionsStore, 'maintenance_contract_available',
                'Maintenance contract available', yesOrNo
              )
            }
            {
              selectInput(
                deviceDescription, deviceDescriptionsStore, 'maintenance_scheduling',
                'Scheduling', schedules
              )
            }
          </div>
          <div className="grouped-fields-row cols-1">
            {
              mulipleRowInput(
                deviceDescription, deviceDescriptionsStore, 'Contact for maintenance and repair',
                'contact_for_maintenance', contactFields, ''
              )
            }
          </div>
        </div>
      </Collapse>

      {headlineWithToggle(deviceDescriptionsStore, 'planned_maintenance', 'Planned Maintenance')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.planned_maintenance} className="grouped-fields-row cols-1">
        <div>
          {
            mulipleRowInput(
              deviceDescription, deviceDescriptionsStore, 'Planned maintenance',
              'planned_maintenance', maintenanceFields, ''
            )
          }
          {
            mulipleRowInput(
              deviceDescription, deviceDescriptionsStore, 'Consumables needed for maintenance',
              'consumables_needed_for_maintenance', consumablesNeededFields, ''
            )
          }
        </div>
      </Collapse>

      {headlineWithToggle(deviceDescriptionsStore, 'unexpected_maintenance', 'Unexpected maintenance and repair')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.unexpected_maintenance} className="grouped-fields-row cols-1">
        <div>
          {
            mulipleRowInput(
              deviceDescription, deviceDescriptionsStore, 'Unexpected maintenance and repair',
              'unexpected_maintenance', maintenanceFields, ''
            )
          }
        </div>
      </Collapse>

      {headlineWithToggle(deviceDescriptionsStore, 'unexpected_power_shutdown', 'Unexpected Power Shutdown')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.unexpected_power_shutdown} className="grouped-fields-row cols-1">
        <div>
          {
            textareaInput(
              deviceDescription, deviceDescriptionsStore, 'measures_after_full_shut_down',
              'Measures after complete power shutdown', 3, ''
            )
          }
          {
            textareaInput(
              deviceDescription, deviceDescriptionsStore, 'measures_after_short_shut_down',
              'Measures for a running device with short shutdown period', 3, ''
            )
          }
        </div>
      </Collapse>

      {headlineWithToggle(deviceDescriptionsStore, 'planned_offline_period', 'Planned offline period')}
      <Collapse in={deviceDescriptionsStore.toggable_contents.planned_offline_period} className="grouped-fields-row cols-1">
        <div>
          {
            textareaInput(
              deviceDescription, deviceDescriptionsStore, 'measures_to_plan_offline_period',
              'Measures to plan an offline period', 3, ''
            )
          }
          {
            textareaInput(
              deviceDescription, deviceDescriptionsStore, 'restart_after_planned_offline_period',
              'Re-Start after planned offline time', 3, ''
            )
          }
        </div>
      </Collapse>
    </div>
  );
}

export default observer(MaintenanceForm);
