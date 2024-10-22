# ReactionProcessEditor

The Reaction Process Editor is a separate React project allowing to visually compose and edit the actual reaction processes
which uses the ELN as API backend.

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

[note: `action` and `ReactionProcessAction` are used synonymously within this section]

The basic structure both in frontend and backend is:
Reaction <-1:1-> ReactionProcess <-1:n-> ReactionProcessStep <-1:n-> ReactionProcessAction>

#### The ReactionProcess

The ReactionProcess is the root entity in the RPE. It maps 1:1 to a reaction with the purpose to separate RPE data from
ELN code as much as possible. When a reaction is first accessed by RPE its respective (empty) ReactionProcess will be created in
the ELN database.

#### The ReactionProcessStep

A ReactionProcess typically consists of several ReactionProcessSteps. They contain a single swimlane of the reaction
process, idealized "everything that happens within one and the same vessel". Consequently a ReactionProcessSteps
can be assigned a vessel.

#### The ReactionProcessAction

Each ReactionProcessStep consist of a multitude of ReactionProcessActions. This is where the core of the the reaction
process data lies.  It has the relevant attributes:

* `action_name`: defines the type of the action, which can basically be any arbitrary string value describing the action. A set of are implemented  and used for the required funcionalities: "ADD", "REMOVE", "MOTION", "PURIFICATION", "ANALYSIS", "SAVE", "TRANSFER", "WAIT", "CONDITION".

* `position`: The order of the action within the associated reaction_process_step.

* `workup`: This is were the actual action data is stored. It is a hash to store the parameters of the action  where (by convention) the stored data semantically "matches" the functionality provided by the respective action. Most of this has been thoroughly
discussed with NJung and is subject to further enhancements. Basically we use self-defined arbitraty key-value pairs describing
the parameters and details of the respective action, e.g.
`action_name: "ADD", workup: { acts_as:'SOLVENT', sample_id:'1', amount: { value: '100', unit; 'ml'} }`

As they fulfill no external schema it is a bit hard to validate and keep track of them. In fact they are provided mostly
by the the respective input fields in the frontend RPE which set them when filled out and sent as part of the request.
The only actual validation (2023-12-11) is on `"ADD"` actions validating that `workup[:sample_id]` is set.
This again makes it very easy to handle and store arbitrary data and later transform them into ORDKit.

There are two basic types of ReactionProcessActions.

1. The standard "ACTION" (Add, Remove, Purification, Wait, …) These define everything that "can be done".
2. The "CONDITION". These define the changes in environment conditions, i.e. Temperature, Pressure, PH. Beyond, Motion and Equipment
are also considered environment conditions in this model.

Technically both are treated equally in defining the "Activities" within a process step (i.e. in the ReactionProcessStep has_many :reaction_process_activities association, ordered by their `position`), which can each be either an `Àction` or a `Condition`.

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

## Frontend

### Action Forms

The most important part of the Editor Frontend is `ActivityForm.jsx`

It consists of two parts, the general and the action specific fields.
The general part has field "description".
The generic part is split up into (at time of writing) 9 sub-forms which are selected in ActionForm depending on the "action_name" of the action. => ActionForm.jsx is a good place to lookup which action_names are in use semantically (i.e.well-defined and have an existing form partial implemented), and each of the 9 sub_partial (actionForms/generic/*Form.jsx) is a good place to lookup which workup are used semantically.

The root frontend component of the Editor (i.e.. ReactionProcess data) is the ReactionProcessEditor.
It is included from APP.js with "reaction" as the only prop.

The ReactionProcessEditor stores the associated ReactionProcess as state,
and (re)fetches the ReactionProcess from the backend by it's id whenever relevant changes occur.
