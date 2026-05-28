/**
 * Mock RPC payloads for local MQTT simulation.
 */
import { getMockState } from "./mock-printer-state.mjs";
export const MOCK_SN = process.env.MOCK_SN ?? "MOCKSN01";

function nowSqlLike() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function nowEpochSec() {
  return Math.floor(Date.now() / 1000);
}

const mockFiles = [
  {
    filename: "benchy_mock.gcode",
    file_size: 18324567,
    create_time: nowEpochSec(),
    print_time: 4520,
    filament_weight: 28.6,
    layer_height: 0.2,
  },
  {
    filename: "calibration_cube_mock.gcode",
    file_size: 6432012,
    create_time: nowEpochSec() - 7200,
    print_time: 1560,
    filament_weight: 7.8,
    layer_height: 0.2,
  },
];

function buildCanvasInfo() {
  const { canvasMode } = getMockState();
  if (canvasMode === "mono") {
    return {
      error_code: 0,
      canvas_info: {
        auto_refill: false,
        active_tray_id: -1,
        canvas_list: [],
      },
    };
  }

  const mkTray = (trayId, loaded, type, color) => ({
    tray_id: trayId,
    status: loaded ? 2 : 0,
    filament_type: type,
    filament_name: `${type} Basic`,
    brand: "ELEGOO",
    filament_color: color,
    min_nozzle_temp: 190,
    max_nozzle_temp: 240,
    min_bed_temp: 45,
    max_bed_temp: 100,
  });

  const mkCanvas = (canvasId) => ({
    connected: true,
    canvas_id: canvasId,
    canvas_type: "0303",
    temperature: 24,
    humidity: 41,
    tray_list: [
      mkTray(canvasId * 10 + 0, true, "PLA", "#4da3ff"),
      mkTray(canvasId * 10 + 1, true, "PETG", "#22c55e"),
      mkTray(canvasId * 10 + 2, false, "ABS", "#ef4444"),
      mkTray(canvasId * 10 + 3, false, "TPU", "#f59e0b"),
    ],
  });

  return {
    error_code: 0,
    canvas_info: {
      auto_refill: true,
      active_tray_id: 1,
      canvas_list: [mkCanvas(0), mkCanvas(1)],
    },
  };
}

function toPrinterFileShape(file) {
  return {
    ...file,
    FileName: file.filename,
    file_name: file.filename,
    FileSize: file.file_size,
    CreateTime: file.create_time,
  };
}

export function buildBasicInfo() {
  const s = getMockState();
  const ip = s.ip;
  const modelFanPct = s.fanModelPct;
  const auxFanPct = s.fanAuxPct;
  const boxFanPct = s.fanBoxPct;
  const modelFanRaw = Math.round((modelFanPct / 100) * 255);
  const auxFanRaw = Math.round((auxFanPct / 100) * 255);
  const boxFanRaw = Math.round((boxFanPct / 100) * 255);
  return {
    error_code: 0,
    machine_name: s.name,
    MachineName: s.name,
    machine_model: "Centauri Carbon",
    external_device: {
      camera: true,
      type: "0303",
      u_disk: true,
    },
    extruder: {
      filament_detect_enable: 1,
      filament_detected: 0,
      target: s.nozzleTarget,
      temperature: s.nozzleTemp,
    },
    heater_bed: {
      target: s.bedTarget,
      temperature: s.bedTemp,
    },
    machine_status: {
      exception_status: [],
      progress: 0,
      status: s.machineStatusCode,
      sub_status: 0,
      sub_status_reason_code: 0,
    },
    print_status: {
      bed_mesh_detect: false,
      current_layer: 0,
      enable: false,
      filament_detect: false,
      filename: "",
      print_duration: 0,
      remaining_time_sec: 0,
      state: "",
      total_duration: 0,
      uuid: "",
    },
    led: { status: s.lightOn ? 1 : 0 },
    machine_ip: ip,
    MachineIP: ip,
    ip,
    printer_ip: ip,
    speed_mode: s.speedMode,
    nozzle_temp: s.nozzleTemp,
    bed_temp: s.bedTemp,
    progress: 35,
    task_name: "benchy_mock.gcode",
    print_info: {
      filename: "benchy_mock.gcode",
      task_id: "MOCK-TASK-0001",
      current_ticks: 350,
      total_ticks: 1000,
      speed_mode: s.speedMode,
    },
    CurrenCoord: `${s.x.toFixed(1)},${s.y.toFixed(1)},${s.z.toFixed(1)}`,
    LightStatus: { SecondLight: s.lightOn ? 1 : 0 },
    CurrentFanSpeed: { ModelFan: modelFanPct, AuxiliaryFan: auxFanPct, BoxFan: boxFanPct },
    fans: {
      model_fan: { speed: modelFanRaw },
      aux_fan: { speed: auxFanRaw },
      box_fan: { speed: boxFanRaw },
      controller_fan: { speed: 128 },
    },
    gcode_move: {
      x: s.x,
      y: s.y,
      z: s.z,
      speed_mode: s.speedMode,
    },
    tool_head: {
      homed_axes: "xyz",
    },
    ztemperature_sensor: {
      temperature: s.chamberTemp,
    },
    PrintInfo: {
      TaskId: "MOCK-TASK-0001",
      Status: 20,
      PrintSpeedPct: 100,
      CurrentTicks: 350,
      TotalTicks: 1000,
      speed_mode: s.speedMode,
    },
    CameraConnected: true,
    CameraStatus: 1,
    LivingVideoUrl: "http://127.0.0.1:8080/",
    LivingVideoURL: "http://127.0.0.1:8080/",
    FileList: mockFiles.map(toPrinterFileShape),
    file_list: mockFiles.map(toPrinterFileShape),
    VideoList: [
      {
        id: 1,
        file_name: "mock_task_0001.mp4",
        file_size: 10425000,
        create_time: nowSqlLike(),
        video_duration: 96,
        task_id: "MOCK-TASK-0001",
      },
    ],
    video_list: [
      {
        file_name: "mock_task_0001.mp4",
        file_size: 10425000,
        create_time: nowSqlLike(),
        video_duration: 96,
      },
    ],
    MonoFilamentInfo: {
      Material: "PLA",
      MaterialColor: "#4da3ff",
      Brand: "ELEGOO",
      Name: "PLA Basic",
    },
  };
}

export function resolveMethodPayload(method) {
  const rpcMethod = Number(method);
  switch (rpcMethod) {
    case 1002:
      return buildBasicInfo();
    case 1042:
      return {
        error_code: 0,
        url: `http://${process.env.MOCK_PRINTER_IP ?? "127.0.0.1"}:8080/?action=stream`,
        Url: "http://127.0.0.1:8080/",
        LivingVideoUrl: "http://127.0.0.1:8080/",
        LivingVideoURL: "http://127.0.0.1:8080/",
        state: 1,
        State: 1,
      };
    case 1044:
      return {
        error_code: 0,
        total: mockFiles.length,
        Total: mockFiles.length,
        file_list: mockFiles.map(toPrinterFileShape),
        FileList: mockFiles.map(toPrinterFileShape),
      };
    case 1051:
      return {
        error_code: 0,
        url: "http://127.0.0.1/mock/timelapse/latest.mp4",
        list: [
          {
            id: 1,
            file_name: "mock_task_0001.mp4",
            file_size: 10425000,
            create_time: nowSqlLike(),
            video_duration: 96,
            task_id: "MOCK-TASK-0001",
          },
        ],
      };
    case 1036:
      {
      const history = [
        {
          id: 1,
          task_id: "MOCK-TASK-0001",
          file_name: "benchy_mock.gcode",
          status: "Completed",
          task_status: 2,
          start_time: nowSqlLike(),
          begin_time: Math.floor(Date.now() / 1000) - 4520,
          end_time: Math.floor(Date.now() / 1000),
          total_duration: 4520,
          file_size: 18324567,
          time_lapse_video_status: 2,
          time_lapse_video_url: "http://127.0.0.1/mock/timelapse/latest.mp4",
          time_lapse_video_size: 10425000,
          time_lapse_video_duration: 96,
        },
      ];
      return {
        error_code: 0,
        list: history,
        history_task_list: history,
      };
      }
    case 2005:
      return buildCanvasInfo();
    case 1001:
      {
      const s = getMockState();
      return {
        error_code: 0,
        hardware_version: "",
        hostname: s.name,
        ip: s.ip,
        machine_model: "Centauri Carbon 2",
        protocol_version: "1.0.0",
        sn: MOCK_SN,
        software_version: {
          mcu_version: "00.00.00.00",
          ota_version: "01.03.02.36",
          soc_version: "",
        },
      };
      }
    case 1061:
      return {
        error_code: 0,
        mono_filament_info: {
          brand: "",
          filament_code: "",
          filament_color: "",
          filament_name: "",
          filament_type: "",
          max_nozzle_temp: 0,
          min_nozzle_temp: 0,
          status: 0,
          tray_id: 0,
        },
      };
    default:
      return { error_code: 0, Ack: 0 };
  }
}
