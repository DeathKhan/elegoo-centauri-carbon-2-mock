# Elegoo Centauri Carbon 2 Mock

Local mock printer stack for the Elegoo LAN panel.

## Files

- `mock-printer-mqtt.mjs` - MQTT (WS/TCP), SDCP status WS, camera stub, and dashboard server.
- `mock-printer-fixtures.mjs` - RPC payload builders and canned response fixtures.
- `mock-printer-state.mjs` - Shared mutable runtime state used by the dashboard.

## Run

```bash
node ./mock-printer-mqtt.mjs
```

Open dashboard at `http://127.0.0.1:9090/` to live-edit:

- printer name
- online/status state
- nozzle/bed temperatures
- filament layout mode (`multi` / `mono` / `lite`)
- printer IP used in payloads
