# MOF service

A small HTTP wrapper around the [snurr-group `mofid`](https://github.com/snurr-group/mofid)
pipeline. Given a CIF file it returns the **MOFid** and **MOFkey** (plus the
intermediate SMILES and topology), mirroring the Snurr group's
[web-mofid](https://snurr-group.github.io/web-mofid/) tool but running
server-side so Chemotion can call it over HTTP — the same way it already calls
the Indigo rendering service.

## Endpoints

- `GET /health` → `{"status": "ok"}`
- `POST /analyze` → `{"mofid", "mofkey", "smiles", "smiles_nodes", "smiles_linkers", "topology", "cat"}`

The CIF can be sent three ways:

- JSON body: `{"cif": "<cif text>"}` (what the Chemotion `MofService` sends)
- multipart file field named `file`
- raw request body (the CIF text)

On failure the service returns `{"error": "..."}` with a non-2xx status.

## Build & run locally

```bash
docker build -t chemotion-mof-service ./mof_service
docker run --rm -p 5000:5000 chemotion-mof-service

# smoke test
curl -sS -X POST http://localhost:5000/analyze \
  -H 'Content-Type: application/json' \
  --data "$(jq -Rs '{cif: .}' < some.cif)"
```

In Chemotion's deployment it runs as the `mof_service` container (see
`docker-compose.services.yml.example`) and is reached at
`http://mof_service:5000/`, configured in `config/mof_service.yml`.
