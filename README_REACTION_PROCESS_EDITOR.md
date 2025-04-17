# ReactionProcessEditor

The Reaction Process Editor is a separate React project allowing to visually compose and edit the actual reaction processes. It uses the ELN as API backend.

The current version of the Reaction Process Editor (RPE) is still privately hosted on
<https://github.com/cbuggle/eln-reaction-procedure-editor>
Access on request with your github name to <christian@buggle.net>

As this is work in progress we will keep this code in a separate branch until at least the database schema is reasonably established.

## Setup

### Backend

My developments can be found in the branch
`reaction-process-editor`

The backend is based on the Chemotion ELN editor on the most recent `main`. I try to keep it as up to date as possible.

It adds some ActiveRecord models, API access points, Grape Entity Serializing and last not least the definition of and the export to the generic KIT-ORD reaction database format.

For the proper functioning of the Frontend Editor

* The db seeds in `db/seeds/reaction_editor_seeds.rb` need to run (they are included in a `rake db:seed` run).

* The Frontend Hostname needs to be set as ENV['REACTION_PROCESS_EDITOR_HOSTNAME'] which needs to be defined in `.env`
* (`export REACTION_PROCESS_EDITOR_HOSTNAME="http://localhost:3000"` in your shell will also work).

#### SFTP Sync

The devices and their characteristics that can be selected in certain actions (e.g. Purify/Chromatography) are defined in CSV files lying in a designated directory.
We may either place these files manually (see below) or (preferably) have them synced from a designated SFTP server.

The delayed job SynchronizeAutomationDevicesFilesJob will take care of syncing the actual equipment in the automation lab via SFTP. This jobs needs to be configured in `datacollector.yml` as such:

```json
development:
  :services:
    - :name: 'syncautomationdevicesfiles'
      :every: 1
```

It will become active as soon as it these relevant `.env` settings are provided.

```env
REACTION_PROCESS_EDITOR_DEVICES_SFTP_HOSTNAME='sftp-server-hostname'
REACTION_PROCESS_EDITOR_DEVICES_SFTP_USERNAME=’sftp-user'
REACTION_PROCESS_EDITOR_DEVICES_SFTP_PASSWORD=’sftp-password'
REACTION_PROCESS_EDITOR_DEVICES_SFTP_DIR='./reaction-process-editor/‘  // remote directory, optional
```

Additionally there are the required settings:

```env
REACTION_PROCESS_EDITOR_DATA_DIR='tmp/reaction-process-editor'
REACTION_PROCESS_EDITOR_DEVICES_FILENAME="ChemASAP-Devices.csv"
REACTION_PROCESS_EDITOR_DEVICENAME_PREFIX="ChemASAP_"
REACTION_PROCESS_EDITOR_DEVICE_METHODS_SUFFIX='.lcm'
```

which are tailored to parsing the CSV files and should not be altered (except for maybe the DATA_DIR which was chosen to match the existing datacollector directories consistently).

Explanations:
`REACTION_PROCESS_EDITOR_DEVICES_SFTP_DIR` is the remote directory on the SFTP server where the files are located (root dir if not set).

`REACTION_PROCESS_EDITOR_DATA_DIR` is the local directory where the files are stored. If / as long as the SFTP sync is not activated, we will need to place the CSV manually in the respective directory (else the select options in the UI will remain empty).

The data needs to be structured as follows.
`Devices.csv` carrying the index of the devices and their characteristics.
A subdirectory `./devices` with the files of the individual devices defining their individual methods.
This data is created externally by the automation lab team and we do not have to cope with it here.
For details contact Patrick Hodapp <patrick.hodapp@kit.edu>.

### Frontend

The frontend is a plain React yarn app to be installed and can be started with `yarn install`, `yarn start`.
It requires the hostname of the ELN backend along with some other configs to be set in its `config.jsx`. For details see the README there.

## Structure

### Data model

[note: `Activity` and `ReactionProcessActivity` are used synonymously within this section]

The basic structure both in frontend and backend is:
Reaction <-1:1-> ReactionProcess <-1:n-> ReactionProcessStep <-1:n-> ReactionProcessActivity>

#### The ReactionProcess

The ReactionProcess is the root entity in the RPE. It maps 1:1 to a reaction with the purpose to separate RPE data from
ELN code as much as possible. When a reaction is first accessed by RPE its respective (empty) ReactionProcess will be created in
the ELN database.

#### The ReactionProcessStep

A ReactionProcess typically consists of several ReactionProcessSteps. They contain a single swimlane of the reaction
process, idealized "everything that happens within one and the same vessel". Consequently a ReactionProcessSteps
can be assigned a vessel.

#### The ReactionProcessActivity

Each ReactionProcessStep consist of a multitude of ReactionProcessActivities. This is where the core of the the reaction process data lies.

There are two basic types of ReactionProcessActivities

1. The standard "ACTION" (Add, Remove, Purification, Wait, …) These define everything that "can be done".
2. The "CONDITION". These define the changes in environment conditions, i.e. Temperature, Pressure, PH. Beyond, Motion and Equipment
are also considered environment conditions in this model.

Technically both are treated equally in defining the "Activities" within a process step (i.e. in the ReactionProcessStep has_many :reaction_process_activities association, ordered by their `position`), which can each be either an `Àction` or a `Condition`.


An ReactionProcessActivity has the relevant attributes:

* `action_name`: defines the type of the Activity, which can basically be any arbitrary string value describing the Activity. A set of are implemented and used for the required funcionalities: "ADD", "REMOVE", "MOTION", "PURIFICATION", "ANALYSIS", "SAVE", "TRANSFER", "WAIT", "DISCARD", "EVAPORATE", "CONDITION".

* `position`: The order of the action within the associated reaction_process_step.

* `workup`: This is were the actual Activity data is stored. It is a hash to store the parameters of the Activity  where (by convention) the stored data semantically "matches" the functionality provided by the respective Activity. Most of this has been thoroughly
discussed with NJung and is subject to further enhancements. Basically we use self-defined arbitraty key-value pairs describing
the parameters and details of the respective Activity, e.g.
`action_name: "ADD", workup: { acts_as:'SOLVENT', sample_id:'1', amount: { value: '100', unit; 'ml'} }`

As they fulfill no external schema it is a bit hard to validate and keep track of them. In fact they are provided mostly
by the the respective input fields in the frontend RPE which set them when filled out and sent as part of the request.
The only actual validation (2023-12-11) is on `"ADD"` Activities validating that `workup[:sample_id]` is set.
This again makes it very easy to handle and store arbitrary data and later transform them into ORDKit.


### API endpoints

The relevant API endpoints for ReactionProcess, ReactionProcessStep, ReactionProcessAction for the required behavior are mostly following REST / resource routing conventions.

The "source of truth" is the Database. All relevant changes will be persisted as soon as possible and all data will be refetched entirely by the Editor even after minimal changes.

### Medium, Medium::MediumSamples, Medium::Additives, Medium::DiverseSolvent

Apart from the Samples defined and provided by a given Reaction, we need "Medium", "Additives" and "Diverse Solvents" that will be offered to the User as Samples in the RPE UI.

This is done in the DB-table "Medium" as base class (STI) for "Medium::MediumSample"  "Medium::Additive",
 "Medium::DiverseSolvents" (provided in UI Selects for adding Media). For ease of handling they define some void methods
 mimicing the `Sample` model to provide consistent attributes (e.g. "short_label", "target_amount_value").

### Vessels

The vessel management is happening in the backend outside the scope of the RPE.
The RPE provides functions to assign a Vessel to a ReactionProcessStep and to certain ReactionProcessActions.

### Noteworthy in API

* The reaction data is initially fetched from the "/reactions/:id" Endpoint, which will implicitly (and idempotently) create a ReactionProcess for the given reaction when non-existant.

## ReactionProcessEditor Frontend

### Action Forms

The most important part of the Editor Frontend is `ActivityForm.jsx`

It consists of two parts, the general and the action specific fields.
The general part has field "description".
The generic part is split up into (at time of writing) 9 sub-forms which are selected in ActionForm depending on the "action_name" of the action. => ActionForm.jsx is a good place to lookup which action_names are in use semantically (i.e.well-defined and have an existing form partial implemented), and each of the 9 sub_partial (actionForms/generic/*Form.jsx) is a good place to lookup which workup are used semantically.

The root frontend component of the Editor (i.e.. ReactionProcess data) is the ReactionProcessEditor.
It is included from APP.js with "reaction" as the only prop.

The ReactionProcessEditor stores the associated ReactionProcess as state,
and (re)fetches the ReactionProcess from the backend by it's id whenever relevant changes occur.

## Automation

The ReactionProcessEditor and the ORD export output file is tailored to serve the automation as required in the KIT automation lab.

### Automation API endpoints

There are currently 2 API endpoints serving for automation lab feedback.

* PUT /api/v1/reaction_process_editor/reaction_process_activities/{id}/automation_response
  * This endpoints serves the automation feedback which is currenty required in Chromatography Activities only. It accepts the parameter "response_json" with a json file containinfg the results of the automation in a specific JSON format describing the vial-plates and vials returning from the automation.
* PUT /api/v1/reaction_process_editor/reaction_process_activities/{id}/automation_status
  * This endpoint serves to update the automation status, particularly to report the completion of a ReactionProcessActivity. It accepts the parameter "automation_status" and  "COMPLETED" as only accepted value.

### Automation status model

The automation status model handles the synchronization of the Editor with the actual Reaction Process in the automation lab particularly for ReactionProcessActivities that need user feedback after having run.

Each ReactionProcessActivity can be in one of the following states.

* RUN
  * The activity can run unrestrictedly.
* HALT
  * The process halts after running this activity and feedback will be provided by the automation lab.
* AUTOMATION_RESPONDED
  * The automation feedback has been received through the api and user interaction is required (most commonly applies in Chromatography activities).
* HALT_RESOLVED_NEEDS_CONFIRMATION
  * User feedback has been provided (e.g. selecting vials for pooling groups). The user needs to confirm the resolve manually in a separate step for better handling.
* HALT_RESOLVED
  * The HALT has been resolved and confirmed. the
* COMPLETED
  * The ReactionProcessActivity has completed successfully

The ReactionProcessSteps subsequently show their own status

* STEP_CAN_RUN
  * The ReactionProcessStep can run unrestrictedly.
* STEP_COMPLETED
  * All of the ReactionProcessStep's ReactionProcessActivities have been completed and thus the ReactionProcessStep itself.
* STEP_HALT_BY_PRECEDING
  * There is a ReactionProcessActivity in some prior ReactionProcessStep that HALTS the automation process (i.e. in status "HALT", "AUTOMATION_RESPONDED", "HALT_RESOLVED_NEEDS_CONFIRMATION" ). This is required to stop later ReactionProcessSteps from running while there might still be a dependency.
* STEP_MANUAL_PROCEED
  * A STEP_HALT_BY_PRECEDING status has been overridden by the user to allow a ReactionProcessStep to run in parallel.

The ReactionProcessSteps status is evaluated mostly automatically; STEP_CAN_RUN, STEP_COMPLETED simply denote that a Step can run unrestrictedly or has been completed, respectively. ReactionProcessStep status evaluates to STEP_HALT_BY_PRECEDING when there is a ReactionProcessActivity in a prior ReactionProcessStep that requires halting the Automation.
This can be overriden by the user to STEP_MANUAL_PROCEED when a ReactionProcessStep can be performed in parallel without any actual dependencies to the ReactionProcess being halted. STEP_MANUAL_PROCEED will only apply when status evaluates to STEP_HALT_BY_PRECEDING.
