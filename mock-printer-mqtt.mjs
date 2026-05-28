/**
 * Local mock printer MQTT broker (WebSocket :9001).
 *
 * Usage:
 *   npm run mock:printer
 *
 * UI:
 *   http://127.0.0.1:4180/index?mock=1&ip=127.0.0.1&sn=MOCKSN01&access_code=123456&username=elegoo&lang=zh_CN
 */
import { createServer } from "http";
import net from "net";
import { WebSocketServer, createWebSocketStream } from "ws";
import aedesFactory from "aedes";
import { MOCK_SN, buildBasicInfo, resolveMethodPayload } from "./mock-printer-fixtures.mjs";
import { getMockState, updateMockState } from "./mock-printer-state.mjs";

const PORT = Number(process.env.MOCK_PORT ?? 9001);
const MQTT_TCP_PORT = Number(process.env.MOCK_MQTT_TCP_PORT ?? 1883);
const STATUS_PORT = Number(process.env.MOCK_STATUS_PORT ?? 3030);
const CAMERA_PORT = Number(process.env.MOCK_CAMERA_PORT ?? 8080);
const DASHBOARD_PORT = Number(process.env.MOCK_DASHBOARD_PORT ?? 9090);
const HOST = "127.0.0.1";
const VERBOSE = process.env.MOCK_VERBOSE === "1";

const broker = aedesFactory();
const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });
const mqttTcpServer = net.createServer((socket) => {
  broker.handle(socket);
});
const statusServer = createServer();
const statusWss = new WebSocketServer({ server: statusServer, path: "/websocket" });
const statusSockets = new Set();
const dashboardServer = createServer((req, res) => {
  if (!req.url) {
    res.writeHead(404);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/api/state") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getMockState()));
    return;
  }

  if (req.method === "POST" && req.url === "/api/state") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const patch = JSON.parse(body || "{}");
        const next = updateMockState(patch);
        pushStatus(MOCK_SN);
        broadcastStatusFrames();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(next));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid json" }));
      }
    });
    return;
  }

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(getDashboardHtml());
    return;
  }

  res.writeHead(404);
  res.end();
});
const cameraServer = createServer((req, res) => {
  // Real printer camera port replies with multipart MJPEG stream.
  res.writeHead(200, {
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Connection: "close",
    "Content-Type": "multipart/x-mixed-replace; boundary=frame",
  });

  const makeFrame = () => {
    // Tiny 1x1 jpeg payload for compatibility.
    const jpegBase64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxAQEBAQEA8QDw8PDw8PDw8PDw8QFREWFhURFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0fHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFhEBAQEAAAAAAAAAAAAAAAAAABEh/9oADAMBAAIQAxAAAAH6A//EABQQAQAAAAAAAAAAAAAAAAAAACD/2gAIAQEAAQUCT//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8BP//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8BP//Z";
    return Buffer.from(jpegBase64, "base64");
  };

  const writeChunk = () => {
    const frame = makeFrame();
    res.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${frame.length}\r\n\r\n`);
    res.write(frame);
    res.write("\r\n");
  };

  writeChunk();
  const timer = setInterval(writeChunk, 1000);
  req.on("close", () => {
    clearInterval(timer);
  });
});

wss.on("connection", (socket) => {
  broker.handle(createWebSocketStream(socket));
});

function publishJson(topic, body) {
  broker.publish(
    {
      topic,
      payload: Buffer.from(JSON.stringify(body)),
      qos: 1,
      retain: false,
    },
    () => {},
  );
}

let statusId = 1;
function pushStatus(sn) {
  statusId += 1;
  publishJson(`elegoo/${sn}/api_status`, {
    id: statusId,
    method: 6000,
    result: buildBasicInfo(),
  });
}

function wsStatusFrame() {
  const basic = buildBasicInfo();
  return {
    Topic: "sdcp/status/mock",
    Status: {
      CurrentStatus: getMockState().printerStatusText,
      CurrenCoord: basic.CurrenCoord ?? "0,0,0",
      LightStatus: basic.LightStatus ?? { SecondLight: 1 },
      CurrentFanSpeed: basic.CurrentFanSpeed ?? { ModelFan: 0, AuxiliaryFan: 0, BoxFan: 0 },
      PrintInfo: basic.PrintInfo ?? { CurrentTicks: 0, TotalTicks: 1000, Status: 0, PrintSpeedPct: 100 },
    },
  };
}

function wsAttributesFrame() {
  const basic = buildBasicInfo();
  return {
    Topic: "sdcp/attributes/mock",
    Attributes: {
      NozzleTemp: basic.nozzle_temp ?? 28,
      NozzleTargetTemp: basic.extruder?.target ?? 0,
      HotbedTemp: basic.bed_temp ?? 26,
      HotbedTargetTemp: basic.heater_bed?.target ?? 0,
      ChamberTemp: basic.ztemperature_sensor?.temperature ?? 31,
      ChamberTargetTemp: 0,
      FilamentTemp: 34,
      FilamentTargetTemp: 45,
      FilamentRemainPct: 88,
      Material: "PLA",
      MaterialColor: "#4da3ff",
      CameraStatus: 1,
      CameraConnected: true,
      LivingVideoUrl: "http://127.0.0.1:8080/",
      LivingVideoURL: "http://127.0.0.1:8080/",
      FileList: basic.FileList ?? [],
      file_list: basic.file_list ?? [],
      VideoList: basic.VideoList ?? [],
      video_list: basic.video_list ?? [],
      MonoFilamentInfo: basic.MonoFilamentInfo ?? {},
    },
  };
}

function broadcastStatusFrames() {
  const status = wsStatusFrame();
  const attrs = wsAttributesFrame();
  for (const socket of statusSockets) {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(status));
      socket.send(JSON.stringify(attrs));
    }
  }
}

function wsCmdData(cmd) {
  switch (Number(cmd)) {
    case 0:
      return wsStatusFrame().Status;
    case 1:
      return wsAttributesFrame().Attributes;
    case 258:
      return {
        Total: (buildBasicInfo().FileList ?? []).length,
        FileList: buildBasicInfo().FileList ?? [],
      };
    case 320:
      return {
        Total: 1,
        Tasks: [
          {
            Id: 1,
            TaskId: "MOCK-TASK-0001",
            FileName: "benchy_mock.gcode",
            StartTime: new Date().toISOString().replace("T", " ").slice(0, 19),
            EndTime: new Date().toISOString().replace("T", " ").slice(0, 19),
            Duration: 4520,
            Status: "Completed",
            FileSize: 18324567,
          },
        ],
      };
    case 386:
      return { Url: "http://127.0.0.1:8080/", State: 1 };
    default:
      return { Ack: 0 };
  }
}

broker.on("publish", (packet, client) => {
  if (!client || !packet.topic) return;

  const topic = packet.topic;
  if (VERBOSE) console.log(`[mock-mqtt] <- ${topic}`);
  let message;
  try {
    message = JSON.parse(packet.payload.toString());
  } catch {
    return;
  }

  const sn = topic.split("/")[1] ?? MOCK_SN;

  if (topic === `elegoo/${sn}/api_register`) {
    const clientId = String(message.request_id ?? message.client_id ?? "mock-client");
    publishJson(`elegoo/${sn}/${clientId}/register_response`, {
      error: "ok",
      client_id: clientId,
    });
    pushStatus(sn);
    if (VERBOSE) console.log(`[mock-mqtt] register -> ${clientId}`);
    return;
  }

  const requestMatch = topic.match(/^elegoo\/([^/]+)\/([^/]+)\/api_request$/);
  if (!requestMatch) return;

  const [, reqSn, clientId] = requestMatch;
  const method = Number(message.method ?? 0);
  const id = Number(message.id ?? 1);
  const result = resolveMethodPayload(method);

  publishJson(`elegoo/${reqSn}/${clientId}/api_response`, { id, method, result });
  if (method === 1002) pushStatus(reqSn);
  if (VERBOSE) console.log(`[mock-mqtt] RPC ${method} for ${clientId}`);
});

// Keep heartbeat-like status updates flowing for UI/state progression.
setInterval(() => {
  pushStatus(MOCK_SN);
}, 1500);

statusWss.on("connection", (socket) => {
  if (VERBOSE) console.log("[mock-status] client connected");
  statusSockets.add(socket);
  const send = (payload) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
  };

  send(wsAttributesFrame());
  send(wsStatusFrame());

  const pulse = setInterval(() => {
    send(wsStatusFrame());
    send(wsAttributesFrame());
  }, 1500);

  socket.on("message", (raw) => {
    try {
      const body = JSON.parse(raw.toString());
      if (VERBOSE) console.log("[mock-status] <-", body?.Data?.Cmd ?? "unknown");
      const requestId = body?.Data?.RequestID ?? `mock-${Date.now()}`;
      const cmd = Number(body?.Data?.Cmd ?? 0);
      send({
        Topic: "sdcp/response/mock",
        Data: { RequestID: requestId, Cmd: cmd, Data: wsCmdData(cmd) },
      });
    } catch {
      // ignore malformed frames
    }
  });

  socket.on("close", () => {
    if (VERBOSE) console.log("[mock-status] client disconnected");
    statusSockets.delete(socket);
    clearInterval(pulse);
  });
});

httpServer.listen(PORT, HOST, () => {
  console.log(`[mock-mqtt] WebSocket MQTT broker at ws://${HOST}:${PORT}`);
  console.log(
    `[mock-mqtt] Open: http://127.0.0.1:4180/index?mock=1&ip=${HOST}&sn=${MOCK_SN}&access_code=123456&username=elegoo&lang=zh_CN`,
  );
});

mqttTcpServer.listen(MQTT_TCP_PORT, HOST, () => {
  console.log(`[mock-mqtt] TCP MQTT broker at tcp://${HOST}:${MQTT_TCP_PORT}`);
});

statusServer.listen(STATUS_PORT, HOST, () => {
  console.log(`[mock-status] WebSocket status endpoint at ws://${HOST}:${STATUS_PORT}/websocket`);
});

dashboardServer.listen(DASHBOARD_PORT, HOST, () => {
  console.log(`[mock-dashboard] Control panel at http://${HOST}:${DASHBOARD_PORT}/`);
});

cameraServer.on("error", (err) => {
  if (err && typeof err === "object" && "code" in err && err.code === "EADDRINUSE") {
    console.warn(
      `[mock-camera] Port ${CAMERA_PORT} already in use; keeping external camera service and continuing mock MQTT/SDCP.`,
    );
    return;
  }
  throw err;
});
cameraServer.listen(CAMERA_PORT, HOST, () => {
  console.log(`[mock-camera] MJPEG stream endpoint at http://${HOST}:${CAMERA_PORT}/`);
});

function getDashboardHtml() {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"/><title>Mock Printer Dashboard</title>
<style>body{font-family:sans-serif;max-width:860px;margin:24px auto;padding:0 12px}label{display:block;margin:8px 0 4px}input,select{width:100%;padding:8px}button{margin-top:14px;padding:10px 14px}</style>
</head>
<body>
<h2>Mock Printer Dashboard</h2>
<p>Updates apply live to MQTT/SDCP.</p>
<form id="f">
<label>Printer Name</label><input name="name"/>
<label>Status</label><select name="printerStatusText"><option>Idle</option><option>Printing</option><option>Paused</option><option>Preheating</option><option>Error</option></select>
<label>Machine Status Code</label><input type="number" name="machineStatusCode" value="1"/>
<label>Nozzle Temp / Target</label><input type="number" step="0.1" name="nozzleTemp"/><input type="number" step="0.1" name="nozzleTarget"/>
<label>Bed Temp / Target</label><input type="number" step="0.1" name="bedTemp"/><input type="number" step="0.1" name="bedTarget"/>
<label>X / Y / Z</label><input type="number" step="0.1" name="x"/><input type="number" step="0.1" name="y"/><input type="number" step="0.1" name="z"/>
<label>Light</label><select name="lightOn"><option value="true">On</option><option value="false">Off</option></select>
<label>Fan % (Model / Aux / Box)</label><input type="number" name="fanModelPct"/><input type="number" name="fanAuxPct"/><input type="number" name="fanBoxPct"/>
<label>Filament Layout</label><select name="canvasMode"><option>multi</option><option>mono</option><option>lite</option></select>
<label>IP shown in payload</label><input name="ip"/>
<button type="submit">Apply</button>
</form>
<pre id="out"></pre>
<script>
async function load(){const r=await fetch('/api/state'); const s=await r.json(); for(const [k,v] of Object.entries(s)){const el=document.querySelector('[name="'+k+'"]'); if(!el) continue; el.value=String(v);} document.getElementById('out').textContent=JSON.stringify(s,null,2);}
document.getElementById('f').addEventListener('submit', async (e)=>{e.preventDefault(); const fd=new FormData(e.target); const p=Object.fromEntries(fd.entries()); ['machineStatusCode','nozzleTemp','nozzleTarget','bedTemp','bedTarget','x','y','z','fanModelPct','fanAuxPct','fanBoxPct'].forEach(k=>{ if(p[k]!==undefined) p[k]=Number(p[k]);}); p.lightOn=p.lightOn==='true'; const r=await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)}); const s=await r.json(); document.getElementById('out').textContent=JSON.stringify(s,null,2);});
load();
</script>
</body></html>`;
}
