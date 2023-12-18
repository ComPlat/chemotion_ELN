import React, { useState, useEffect } from 'react';
import { selectInput, textInput, vendorNameIDSerialNumberInput } from '../FormFields';
import { formatPrefix } from 'd3';

const PropertiesForm = ({ deviceDescription }) => {
  const [element, setElement] = useState(deviceDescription);
  const formKeyPrefix = `properties-${deviceDescription.id}-`;

  const deviceType = [
    {
      "value": "stand-alone",
      "label": "stand-alone"
    },
    {
      "value": "component",
      "label": "component"
    },
    {
      "value": "equipment",
      "label": "equipment"
    },
    {
      "value": "setup",
      "label": "setup"
    }
  ];

  const deviceTypeDetail = [
    {
      "value": "has variable components",
      "label": "has variable components"
    },
    {
      "value": "no variable components",
      "label": "no variable components"
    }
  ];

  const operationMode = [
    {
      "value": "manual - walk in",
      "label": "manual - walk in"
    },
    {
      "value": "manual - service",
      "label": "manual - service"
    },
    {
      "value": "integrated - automated",
      "label": "integrated - automated"
    }
  ];


  //select_options":
  // {
  //    
  //     "tags":
  //     {
  //         "options":
  //         [
  //             {
  //                 "key": "manufacturing",
  //                 "label": "manufacturing"
  //             },
  //             {
  //                 "key": "processes",
  //                 "label": "processes"
  //             },
  //             {
  //                 "key": "sensors",
  //                 "label": "sensors"
  //             },
  //             {
  //                 "key": "analysis",
  //                 "label": "analysis"
  //             },
  //             {
  //                 "key": "structuring",
  //                 "label": "structuring"
  //             },
  //             {
  //                 "key": "others",
  //                 "label": "others"
  //             }
  //         ]
  //     },
  //     "type":
  //     {
  //         "options":
  //         [
  //             {
  //                 "key": "Laser sintering",
  //                 "label": "Laser sintering"
  //             },
  //             {
  //                 "key": "Lithography",
  //                 "label": "Lithography"
  //             },
  //             {
  //                 "key": "Fused Filament Fabrication",
  //                 "label": "Fused Filament Fabrication"
  //             }
  //         ]
  //     },
  //     "class":
  //     {
  //         "options":
  //         [
  //             {
  //                 "key": "manufacturing",
  //                 "label": "manufacturing"
  //             },
  //             {
  //                 "key": "processes",
  //                 "label": "processes"
  //             },
  //             {
  //                 "key": "sensors",
  //                 "label": "sensors"
  //             },
  //             {
  //                 "key": "analysis",
  //                 "label": "analysis"
  //             },
  //             {
  //                 "key": "structuring",
  //                 "label": "structuring"
  //             }
  //         ]
  //     },
  //     "access":
  //     {
  //         "options":
  //         [
  //             {
  //                 "key": "contact owner",
  //                 "label": "contact owner"
  //             }
  //         ]
  //     },
  //     
  //     "operator":
  //     {
  //         "options":
  //         [
  //             {
  //                 "key": "technical",
  //                 "label": "technical"
  //             },
  //             {
  //                 "key": "administrative",
  //                 "label": "administrative"
  //             }
  //         ]
  //     },
  //     
  // },


  return (
    <div className="form-fields">
      <div className="grouped-fields-row cols-3">
        {textInput(element, setElement, 'name', 'Name', formKeyPrefix)}
      </div>
      <div className="grouped-fields-row cols-3">
        {selectInput(element, setElement, 'device_type', 'Device type', formKeyPrefix, deviceType)}
        {selectInput(element, setElement, 'device_type_detail', 'Device type detail', formKeyPrefix, deviceTypeDetail)}
        {selectInput(element, setElement, 'operation_mode', 'Operation mode', formKeyPrefix, operationMode)}
      </div>
      <div className="form-fields-headline">
        General description
      </div>
      <div className="grouped-fields-row cols-1">
        {vendorNameIDSerialNumberInput(element, setElement, formKeyPrefix)}
      </div>
    </div>
  );
}

export default PropertiesForm;
