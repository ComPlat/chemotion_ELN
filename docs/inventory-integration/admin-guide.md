# External inventory integration: admin guide

Chemotion ELN can keep its inventory collections in step with an external chemical inventory or
hazardous-substance register. This guide is for the people who run a Chemotion server (IT) and for
Chemotion admins. Lab users have no integration settings: what they see and edit follows from how an
inventory collection is shared with them.

## Who decides what

| Role | Decides | Where |
| --- | --- | --- |
| Server owner (IT) | Whether the feature is on, which adapters may be used, which external hosts may be reached, where secrets live | `config/inventory_integration.yml` and environment variables |
| Chemotion admin | Connections, mappings, schedules, which collection an external system syncs into | Admin interface |
| Collection owner | Who sees and edits the synced containers, per share | The collection's share dialog |

## IT setup

Copy `config/inventory_integration.yml.example` to `config/inventory_integration.yml` and restart.

- Without the file the feature is off.
- A file that is present but invalid is logged at boot ("Initializing inventory_integration: misconfigured - ...") and the feature refuses to run until it is fixed.
- `GET /api/v1/admin/inventory_integration/adapters` shows admins the same state: the enabled adapters, or the reasons the file was refused (HTTP 503).

| Setting | Meaning |
| --- | --- |
| `enabled` | Master switch |
| `time_zone` | Time zone schedules are entered in (default `Europe/Berlin`) |
| `encryption_key_env` | Optional environment variable holding a dedicated key for stored credentials |
| `adapters.<key>.enabled` | Whether admins may create connections with this adapter |
| `adapters.<key>.allowed_hosts` | Hosts connections of this adapter may reach: exact names or `*.domain` |
| `adapters.<key>.min_pull_interval` | Shortest pull interval admins may choose, e.g. `12h` or `7d` |
| `network.allow_private_cidrs` | Private address ranges registers on the intranet may use; link-local and cloud metadata addresses are always blocked |
| `network.allow_http_hosts` | Hosts reachable over plain http; everything else needs https |
| `network.open_timeout`, `read_timeout`, `max_response_mb` | Transport limits |
| `scheduler.enabled` | Runs the hourly check for due syncs; `CRON_CONFIG_INVENTORY_SYNC` overrides the hourly schedule, `disabled` stops it |
| `scheduler.max_pull_frequency` | Most frequent schedule admins may choose: `daily`, `weekly`, `biweekly`, `monthly`, `quarterly` |
| `write_back.enabled` | Global switch for sending changes back; each connection also needs its own setting |
| `inbound_api.enabled` | Lets external systems call Chemotion's inventory API with scoped tokens |
| `credentials.<name>.<field>_env` | Secrets held by IT in environment variables, referenced by name in the admin interface |

## The record format

Every route (adapters, files, the inventory API) produces the same record, `chemotion.inventory/v1`:
one physical container, or one lot when the source has no container granularity. The JSON Schema is
`app/services/inventory_integration/contract/v1.schema.json`.

- Units come from a closed list: `kg g mg ug L mL uL mol mmol umol pcs`.
- Status values: `available empty to_order ordered disposed locked unknown`.
- Hazard codes are checked by format, so new CLP codes are accepted without a release.
- CAS numbers are checked for their check digit.

## Mappings

External systems name their fields differently. A mapping (`chemotion.inventory.mapping/v1`) tells
Chemotion which source field fills which record field, with value maps for units and statuses and a
closed list of transforms (`trim`, `upcase`, `downcase`, `compact`, `first_present`, `decimal_comma`,
`number`, `integer`, `cas`, `unit_split`, `split`, `join`, `boolean`, `present`, `date`, `default`).
Regular expressions are not accepted. Generic REST connections also carry request settings
(`chemotion.inventory.rest/v1`): the list endpoint, authentication, pagination and templates using
`{{settings.<key>}}`, `{{external_id}}`, `{{cursor}}` and `{{since}}` only.

## Codes

Run reports and validation results use stable codes.

| Code | Meaning |
| --- | --- |
| `contract.invalid` | A record breaks the record format |
| `contract.pattern` | A value has the wrong form, e.g. a CAS number with a wrong check digit |
| `contract.unit_unknown` | A unit outside the closed list |
| `mapping.invalid` | A mapping or request settings break their schema |
| `mapping.unknown_target` | A mapping writes a field the record format does not have |
| `mapping.required_missing` | Neither the substance name nor the CAS number is mapped |
| `mapping.vocabulary` | A unit or status map produces a value outside the record format |
| `mapping.not_reversible` | A field marked writable cannot be translated back to the source |
| `mapping.template_invalid` | A request path or template is not allowed |
| `mapping.auth_incomplete`, `mapping.pagination_incomplete` | A required authentication or pagination parameter is missing |
| `config.invalid`, `config.credentials_unreadable` | The configuration or stored credentials cannot be used |
| `policy.host_not_allowed` | The connection points at a host IT did not allow |
| `auth.unauthorized`, `auth.forbidden` | The external system refused the credentials or the scope |
| `upstream.not_found`, `upstream.shape`, `upstream.rate_limited` | The external system answered with nothing, an unexpected shape, or a rate limit |
| `transport.timeout` | The external system did not answer in time |
| `link.conflict` | Both sides changed a field |
| `push.uncertain`, `push.worklist` | A write-back may or may not have arrived, or needs to be booked by hand |
