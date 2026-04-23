import { useEffect, useMemo, useState, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

import { useAuthStore } from "@/context/AuthContext";
import {
  getPlayer,
  getMetrics,
  getPlayerRecords,
  getPlayerReadiness,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  listRecordAttachments,
  uploadRecordAttachment,
  downloadAttachmentFile,
  getAttachmentFileBlob,
  updatePlayer,
} from "@/api";
import {
  canAddHealthRecords,
  canEditHealthRecords,
  canManageTeamRoster,
  canViewAllMetrics,
  isPlayerRole,
} from "@/utils/permissions";

type MetricRow = {
  metric_type_id: string;
  code: string;
  name: string;
  unit?: string | null;
  data_type: string;
};

type RecordRow = {
  record_id: string;
  recorded_at: string;
  value: string;
  notes?: string | null;
  code: string;
  name: string;
  unit?: string | null;
};

type AttachmentRow = {
  attachment_id: string;
  file_name: string;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  uploaded_at?: string | null;
};

type AttachmentPreviewRow = AttachmentRow & {
  record_id: string;
  record_name: string;
  recorded_at: string;
};

type ExcelPreviewSheet = {
  name: string;
  rowData: any[];
  columnDefs: any[];
};

type ExcelPreview = {
  sheetNames: string[];
  sheets: ExcelPreviewSheet[];
};

type JsonSignalData = {
  session?: string;
  created_at?: string;
  signals?: {
    [key: string]: any;
  };
};

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}

function isPdfFile(mime?: string | null, fileName?: string) {
  return mime === "application/pdf" || fileName?.toLowerCase().endsWith(".pdf");
}

function isImageFile(mime?: string | null) {
  return !!mime && mime.startsWith("image/");
}

function isJsonFile(mime?: string | null, fileName?: string) {
  return (
    mime === "application/json" || !!fileName?.toLowerCase().endsWith(".json")
  );
}

function isTextFile(mime?: string | null, fileName?: string) {
  return (
    (!!mime &&
      (mime.startsWith("text/") ||
        mime.includes("xml") ||
        mime.includes("csv"))) ||
    !!fileName?.match(/\.(txt|csv|xml|log)$/i)
  );
}

function isExcelFile(mime?: string | null, fileName?: string) {
  const lower = (fileName || "").toLowerCase();
  return (
    mime === "application/vnd.ms-excel" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lower.endsWith(".xls") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xlsm") ||
    lower.endsWith(".csv")
  );
}

function JsonVisualization({ data }: { data: JsonSignalData }) {
  const signalDefinitions: Record<
    string,
    { label: string; unit: string; meaning: string }
  > = {
    ACC: {
      label: "ACC – Motion",
      unit: "g",
      meaning: "Detects if you are moving, walking, or staying still.",
    },
    GYR: {
      label: "GYR – Rotation",
      unit: "deg/s",
      meaning: "Detects if you are turning or tilting your wrist.",
    },
    MAG: {
      label: "MAG – Magnetic",
      unit: "μT",
      meaning: "Detects the magnetic field around you, like a compass.",
    },
    EA: {
      label: "EA – or (EDA) Skin Sweat",
      unit: "μS",
      meaning:
        "Measures how much your skin sweats. More sweat = more stress or excitement.",
    },
    PI: {
      label: "PI – Infrared Light",
      unit: "unit",
      meaning: "Shines invisible light into your skin to detect your pulse.",
    },
    PR: {
      label: "PR – Red Light",
      unit: "unit",
      meaning:
        "Same as PI but uses red light. Together they can estimate blood oxygen.",
    },
    PG: {
      label: "PG – Green Light",
      unit: "unit",
      meaning:
        "Uses green light to detect your heartbeat. Most accurate on the wrist.",
    },
    T1: {
      label: "T1 – Skin Temperature",
      unit: "°C",
      meaning: "Measures how warm your skin feels by touching it.",
    },
    TH: {
      label: "TH – Air Temperature",
      unit: "°C",
      meaning: "Measures your skin's heat without touching it.",
    },
    HR: {
      label: "HR – Heart Rate",
      unit: "bpm",
      meaning: "How many times your heart beats per minute.",
    },
    BI: {
      label: "BI – Time Between Beats",
      unit: "ms",
      meaning:
        "The gap between each heartbeat in milliseconds. Used to measure stress and relaxation balance.",
    },
    SF: {
      label: "SF – Sweat Spike Count",
      unit: "counts/min",
      meaning:
        "Counts how many times your sweat suddenly jumps. More jumps = more stress reactions.",
    },
  };

  const tabs = useMemo(() => {
    if (!data.signals) return [];
    const excluded = ["BV", "B%"];
    return Object.keys(data.signals)
      .filter((key) => !excluded.includes(key))
      .map((key) => {
        const def = signalDefinitions[key];
        return {
          label: def?.label || key,
          key,
          unit: def?.unit || "unit",
          meaning: def?.meaning || "",
        };
      });
  }, [data.signals]);

  const [activeTabKey, setActiveTabKey] = useState<string>(
    tabs[0]?.key || "BPM",
  );

  const activeTabInfo = useMemo(
    () => tabs.find((t) => t.key === activeTabKey) || tabs[0],
    [tabs, activeTabKey],
  );

  const formatJsonDate = (dateStr?: string) => {
    if (!dateStr) return "Unknown";
    try {
      const parts = dateStr.split("_");
      if (parts.length < 2) return dateStr;
      const datePart = parts[0];
      const timePart = parts[1].split("-").slice(0, 3).join(":");
      const d = new Date(`${datePart}T${timePart}`);
      return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return dateStr;
    }
  };

  const chartData = useMemo(() => {
    if (!activeTabKey || !data.signals) return [];

    const signal = data.signals[activeTabKey];
    if (!signal) return [];

    // Handle multi-axis signals (ACC, GYR, MAG)
    if (signal.X && Array.isArray(signal.X)) {
      const x = signal.X;
      const y = signal.Y || [];
      const z = signal.Z || [];

      return x.map((point: [number, number], i: number) => {
        const time = point[0];
        const vx = point[1];
        const vy = y[i] ? y[i][1] : 0;
        const vz = z[i] ? z[i][1] : 0;
        const magnitude = Math.sqrt(vx * vx + vy * vy + vz * vz);
        return { time, value: parseFloat(magnitude.toFixed(3)) };
      });
    }

    // Standard [[time, val], ...] format
    if (Array.isArray(signal)) {
      return signal.map((point: [number, number]) => ({
        time: point[0],
        value: point[1],
      }));
    }

    return [];
  }, [activeTabKey, data]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {tabs.map((tab) => {
          return (
            <button
              key={tab.key}
              type="button"
              className="platform-btn"
              style={{
                fontSize: "0.9rem",
                padding: "0.5rem 1rem",
                borderRadius: "10px",
                background: activeTabKey === tab.key ? "#fff" : "#f3f4f6",
                border: "1px solid",
                borderColor:
                  activeTabKey === tab.key
                    ? "var(--platform-border)"
                    : "transparent",
                color: "var(--platform-text)",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
              onClick={() => setActiveTabKey(tab.key)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          fontSize: "0.875rem",
          color: "#475569",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          paddingLeft: "0.25rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: "12px",
              height: "12px",
              background: "#3b82f6",
              borderRadius: "2px",
            }}
          ></span>
          Session {data.session || "1"} ({formatJsonDate(data.created_at)})
        </div>
      </div>

      {activeTabInfo?.meaning && (
        <div
          style={{
            fontSize: "0.85rem",
            color: "#475569",
            lineHeight: "1.4",
            padding: "0.75rem 1rem",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            marginTop: "0.5rem",
          }}
        >
          <strong>{activeTabInfo.label}</strong> — {activeTabInfo.meaning}
        </div>
      )}

      <div
        style={{
          height: "350px",
          width: "100%",
          marginTop: "0.5rem",
          background: "#fff",
          padding: "1rem 0.5rem 0.5rem 0",
          borderRadius: "8px",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
          >
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="time"
              type="number"
              domain={["auto", "auto"]}
              axisLine={true}
              tickLine={true}
              tick={{ fontSize: 11, fill: "#64748b" }}
              label={{
                value: "time (s)",
                position: "bottom",
                offset: 0,
                fontSize: 11,
                fill: "#64748b",
              }}
            />
            <YAxis
              axisLine={true}
              tickLine={true}
              tick={{ fontSize: 11, fill: "#64748b" }}
              label={{
                value: activeTabInfo?.unit,
                angle: -90,
                position: "insideLeft",
                fontSize: 11,
                fill: "#64748b",
                offset: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelFormatter={(label) => `Time: ${label}s`}
              formatter={(value: number) => [
                `${value} ${activeTabInfo?.unit}`,
                activeTabInfo?.label,
              ]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={1.5}
              animationDuration={400}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function PlayerDetailPage() {
  const params = useParams<{ teamId?: string; playerId?: string }>();
  const teamId = params.teamId;
  const playerId = params.playerId;
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [readiness, setReadiness] = useState<Record<string, unknown> | null>(
    null,
  );
  const [attachmentsByRecord, setAttachmentsByRecord] = useState<
    Record<string, AttachmentRow[]>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const name = profile
      ? `${profile.first_name} ${profile.last_name}`
      : "Player Detail";
    document.title = `${name} | Players Metrics Platform`;
  }, [profile]);

  const [editProfile, setEditProfile] = useState({
    first_name: "",
    last_name: "",
    position: "",
    jersey_number: "",
    height_cm: "",
    weight_kg: "",
  });

  const [newRecord, setNewRecord] = useState({
    metric_type_id: "",
    recorded_at: new Date().toISOString().slice(0, 16),
    value: "",
    notes: "",
  });

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editRecordForm, setEditRecordForm] = useState({
    value: "",
    notes: "",
    recorded_at: "",
  });

  const [selectedAttachmentId, setSelectedAttachmentId] = useState<
    string | null
  >(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<
    string | null
  >(null);
  const [attachmentPreviewLoading, setAttachmentPreviewLoading] =
    useState(false);
  const [attachmentPreviewError, setAttachmentPreviewError] = useState<
    string | null
  >(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [excelPreview, setExcelPreview] = useState<ExcelPreview | null>(null);
  const [jsonPreview, setJsonPreview] = useState<JsonSignalData | null>(null);
  const [activeExcelSheetName, setActiveExcelSheetName] = useState<string>("");

  const load = async () => {
    if (!playerId) return;
    setLoading(true);
    setError(null);

    try {
      const [pRes, recRes, readRes] = await Promise.all([
        getPlayer(playerId),
        getPlayerRecords(playerId, 200),
        getPlayerReadiness(playerId),
      ]);

      setProfile(pRes.data);
      setEditProfile({
        first_name: String(pRes.data.first_name || ""),
        last_name: String(pRes.data.last_name || ""),
        position: String(pRes.data.position || ""),
        jersey_number:
          pRes.data.jersey_number != null
            ? String(pRes.data.jersey_number)
            : "",
        height_cm:
          pRes.data.height_cm != null ? String(pRes.data.height_cm) : "",
        weight_kg:
          pRes.data.weight_kg != null ? String(pRes.data.weight_kg) : "",
      });

      const recs: RecordRow[] = Array.isArray(recRes.data) ? recRes.data : [];
      setRecords(recs);
      setReadiness(readRes.data);

      if (canViewAllMetrics(user?.role)) {
        const mRes = await getMetrics();
        setMetrics(Array.isArray(mRes.data) ? mRes.data : []);
      }

      const att: Record<string, AttachmentRow[]> = {};
      for (const r of recs) {
        try {
          const ar = await listRecordAttachments(r.record_id);
          att[r.record_id] = Array.isArray(ar.data) ? ar.data : [];
        } catch {
          att[r.record_id] = [];
        }
      }
      setAttachmentsByRecord(att);
    } catch (err: unknown) {
      const msg = (
        err as { response?: { data?: { error?: string }; status?: number } }
      )?.response;
      setError(msg?.data?.error || "Failed to load player");
      if (msg?.status === 403 || msg?.status === 404) {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    if (isPlayerRole(user?.role)) {
      navigate("/my-metrics", { replace: true });
      return;
    }
    if (!playerId) {
      navigate("/dashboard", { replace: true });
      return;
    }
    load();
  }, [token, playerId, user?.role, navigate]);

  const allAttachments = useMemo<AttachmentPreviewRow[]>(() => {
    const flat: AttachmentPreviewRow[] = [];
    for (const record of records) {
      const atts = attachmentsByRecord[record.record_id] || [];
      for (const attachment of atts) {
        flat.push({
          ...attachment,
          record_id: record.record_id,
          record_name: record.name,
          recorded_at: record.recorded_at,
        });
      }
    }
    return flat;
  }, [attachmentsByRecord, records]);

  const selectedAttachment = useMemo(
    () =>
      allAttachments.find(
        (attachment) => attachment.attachment_id === selectedAttachmentId,
      ) || null,
    [allAttachments, selectedAttachmentId],
  );

  useEffect(() => {
    if (allAttachments.length === 0) {
      setSelectedAttachmentId(null);
      return;
    }
    if (
      !selectedAttachmentId ||
      !allAttachments.some(
        (attachment) => attachment.attachment_id === selectedAttachmentId,
      )
    ) {
      setSelectedAttachmentId(allAttachments[0].attachment_id);
    }
  }, [allAttachments, selectedAttachmentId]);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let cancelled = false;

    const clearPreviewState = () => {
      setAttachmentPreviewLoading(false);
      setAttachmentPreviewError(null);
      setTextPreview(null);
      setExcelPreview(null);
      setJsonPreview(null);
      setActiveExcelSheetName("");
      setAttachmentPreviewUrl((current) => {
        if (current) window.URL.revokeObjectURL(current);
        return null;
      });
    };

    if (!selectedAttachment) {
      clearPreviewState();
      return;
    }

    const loadPreview = async () => {
      setAttachmentPreviewLoading(true);
      setAttachmentPreviewError(null);
      setTextPreview(null);
      setExcelPreview(null);
      setJsonPreview(null);

      try {
        const res = await getAttachmentFileBlob(
          selectedAttachment.attachment_id,
        );
        if (cancelled) return;

        const blob = res.data as Blob;
        const mime = selectedAttachment.mime_type || blob.type || null;

        if (isExcelFile(mime, selectedAttachment.file_name)) {
          const buffer = await blob.arrayBuffer();
          if (cancelled) return;
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheetNames = workbook.SheetNames || [];
          const sheets = sheetNames.map((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) {
              return { name: sheetName, rowData: [], columnDefs: [] };
            }

            // Get data as array of arrays to handle headers better
            const rows = XLSX.utils.sheet_to_json(sheet, {
              header: 1,
              defval: "",
            }) as any[][];
            if (rows.length === 0) {
              return { name: sheetName, rowData: [], columnDefs: [] };
            }

            // First row as headers
            const headerRow = rows[0];
            const columnDefs = headerRow.map((h, index) => ({
              field: String(index),
              headerName: h ? String(h) : `Column ${index + 1}`,
              sortable: true,
              filter: true,
              resizable: true,
              flex: 1,
              minWidth: 100,
            }));

            // Rest as data
            const rowData = rows.slice(1).map((row) => {
              const obj: any = {};
              row.forEach((cell, index) => {
                obj[String(index)] = cell;
              });
              return obj;
            });

            return {
              name: sheetName,
              rowData,
              columnDefs,
            };
          });
          setExcelPreview({
            sheetNames,
            sheets,
          });
          setActiveExcelSheetName(sheetNames[0] || "");
        } else if (isJsonFile(mime, selectedAttachment.file_name)) {
          const text = await blob.text();
          if (cancelled) return;
          try {
            const parsed = JSON.parse(text);
            if (parsed && parsed.signals) {
              setJsonPreview(parsed);
            } else {
              setTextPreview(text.slice(0, 15000));
            }
          } catch {
            setTextPreview(text.slice(0, 15000));
          }
        } else if (isTextFile(mime, selectedAttachment.file_name)) {
          const text = await blob.text();
          if (cancelled) return;
          setTextPreview(text.slice(0, 15000));
        }

        const url = window.URL.createObjectURL(blob);
        revokedUrl = url;
        setAttachmentPreviewUrl((current) => {
          if (current) window.URL.revokeObjectURL(current);
          return url;
        });
      } catch (err: unknown) {
        if (cancelled) return;
        setAttachmentPreviewError(
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || "Could not load attachment preview",
        );
        setAttachmentPreviewUrl((current) => {
          if (current) window.URL.revokeObjectURL(current);
          return null;
        });
        setTextPreview(null);
        setExcelPreview(null);
      } finally {
        if (!cancelled) setAttachmentPreviewLoading(false);
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      if (revokedUrl) {
        window.URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [selectedAttachment]);

  const handleAddRecord = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerId || !newRecord.metric_type_id || newRecord.value === "")
      return;
    setError(null);
    try {
      await createHealthRecord({
        player_id: playerId,
        metric_type_id: newRecord.metric_type_id,
        recorded_at: new Date(newRecord.recorded_at).toISOString(),
        value: newRecord.value,
        notes: newRecord.notes.trim() || undefined,
      });
      setNewRecord((n) => ({ ...n, value: "", notes: "" }));
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || "Could not create record");
    }
  };

  const saveEditRecord = async () => {
    if (!editingRecordId) return;
    setError(null);
    try {
      await updateHealthRecord(editingRecordId, {
        value: editRecordForm.value,
        notes: editRecordForm.notes || undefined,
        recorded_at: editRecordForm.recorded_at
          ? new Date(editRecordForm.recorded_at).toISOString()
          : undefined,
      });
      setEditingRecordId(null);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || "Update failed");
    }
  };

  const removeRecord = async (id: string) => {
    if (!window.confirm("Delete this record?")) return;
    setError(null);
    try {
      await deleteHealthRecord(id);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || "Delete failed");
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerId || user?.role !== "admin") return;
    setError(null);
    try {
      await updatePlayer(playerId, {
        first_name: editProfile.first_name.trim(),
        last_name: editProfile.last_name.trim(),
        position: editProfile.position.trim() || undefined,
        jersey_number: editProfile.jersey_number
          ? parseInt(editProfile.jersey_number, 10)
          : undefined,
        height_cm: editProfile.height_cm
          ? parseFloat(editProfile.height_cm)
          : undefined,
        weight_kg: editProfile.weight_kg
          ? parseFloat(editProfile.weight_kg)
          : undefined,
      });
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || "Profile update failed");
    }
  };

  const removeFromTeam = async () => {
    if (!playerId || !profile?.team_id) return;
    if (
      !window.confirm(
        "Remove this player from the team? Their account stays linked; staff can assign a team again later.",
      )
    )
      return;
    setError(null);
    try {
      await updatePlayer(playerId, { team_id: null });
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || "Could not update roster");
    }
  };

  const onUpload = async (recordId: string, file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      await uploadRecordAttachment(recordId, file);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || "Upload failed");
    }
  };

  const handleDownloadAttachment = async (
    attachmentId: string,
    fileName: string,
  ) => {
    setError(null);
    try {
      await downloadAttachmentFile(attachmentId, fileName);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      setError(msg || "Attachment download failed");
    }
  };

  const renderAttachmentPreview = () => {
    if (!selectedAttachment) {
      return (
        <p style={{ margin: 0, color: "var(--platform-text-muted)" }}>
          Select an attachment to preview it here.
        </p>
      );
    }

    if (attachmentPreviewLoading) {
      return (
        <p style={{ margin: 0, color: "var(--platform-text-muted)" }}>
          Loading attachment preview…
        </p>
      );
    }

    if (attachmentPreviewError) {
      return (
        <p style={{ margin: 0, color: "var(--platform-danger)" }}>
          {attachmentPreviewError}
        </p>
      );
    }

    if (excelPreview) {
      const activeSheet =
        excelPreview.sheets.find(
          (sheet) => sheet.name === activeExcelSheetName,
        ) ||
        excelPreview.sheets[0] ||
        null;

      return (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <div
            style={{
              fontSize: "0.875rem",
              color: "var(--platform-text-muted)",
            }}
          >
            Previewing workbook with {excelPreview.sheetNames.length} sheet
            {excelPreview.sheetNames.length === 1 ? "" : "s"}.
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {excelPreview.sheetNames.map((sheetName) => (
              <button
                key={sheetName}
                type="button"
                className="platform-btn platform-btn-secondary"
                style={{
                  fontSize: "0.75rem",
                  padding: "0.3rem 0.65rem",
                  opacity: activeExcelSheetName === sheetName ? 1 : 0.85,
                  border:
                    activeExcelSheetName === sheetName
                      ? "1px solid var(--platform-primary)"
                      : undefined,
                }}
                onClick={() => setActiveExcelSheetName(sheetName)}
              >
                {sheetName}
              </button>
            ))}
          </div>

          <div
            style={{
              height: "500px",
              width: "100%",
              border: "1px solid var(--platform-border)",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {activeSheet && activeSheet.rowData.length > 0 ? (
              <AgGridReact
                rowData={activeSheet.rowData}
                columnDefs={activeSheet.columnDefs}
                defaultColDef={{
                  resizable: true,
                  sortable: true,
                  filter: true,
                }}
              />
            ) : (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  color: "var(--platform-text-muted)",
                }}
              >
                No data available in this sheet.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (jsonPreview) {
      return <JsonVisualization data={jsonPreview} />;
    }

    if (textPreview != null) {
      return (
        <pre
          style={{
            margin: 0,
            padding: "1rem",
            background: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid var(--platform-border)",
            overflow: "auto",
            maxHeight: "420px",
            fontSize: "0.8125rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {textPreview}
        </pre>
      );
    }

    if (
      attachmentPreviewUrl &&
      isPdfFile(selectedAttachment.mime_type, selectedAttachment.file_name)
    ) {
      return (
        <iframe
          title={selectedAttachment.file_name}
          src={attachmentPreviewUrl}
          style={{
            width: "100%",
            minHeight: "560px",
            border: "1px solid var(--platform-border)",
            borderRadius: "8px",
            background: "#fff",
          }}
        />
      );
    }

    if (attachmentPreviewUrl && isImageFile(selectedAttachment.mime_type)) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "280px",
            border: "1px solid var(--platform-border)",
            borderRadius: "8px",
            background: "#fff",
            padding: "1rem",
          }}
        >
          <img
            src={attachmentPreviewUrl}
            alt={selectedAttachment.file_name}
            style={{
              maxWidth: "100%",
              maxHeight: "560px",
              objectFit: "contain",
            }}
          />
        </div>
      );
    }

    return (
      <p style={{ margin: 0, color: "var(--platform-text-muted)" }}>
        This file type cannot be rendered inline here. You can still download it
        locally.
      </p>
    );
  };

  if (!token) return null;

  return (
    <div>
      <p style={{ marginBottom: "0.5rem" }}>
        <Link
          to={
            teamId ? `/dashboard/team/${teamId}/players` : "/players-directory"
          }
          style={{ fontSize: "0.875rem" }}
        >
          ← {teamId ? "Back to roster" : "Back to players"}
        </Link>
      </p>

      {loading ? (
        <div
          className="platform-card"
          style={{ padding: "2rem", textAlign: "center" }}
        >
          Loading…
        </div>
      ) : error && !profile ? (
        <div className="platform-card" style={{ padding: "1.5rem" }}>
          <p style={{ color: "var(--platform-danger)" }}>{error}</p>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      ) : profile ? (
        <>
          <h1 className="platform-page-title">
            {String(profile.first_name)} {String(profile.last_name)}
          </h1>
          <p className="platform-page-subtitle">
            {String(profile.position || "—")} • #{profile.jersey_number ?? "—"}{" "}
            • {String(profile.team_name || "")}
          </p>

          {error && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                background: "#fef2f2",
                borderRadius: "var(--platform-radius)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  color: "var(--platform-danger)",
                }}
              >
                {error}
              </p>
            </div>
          )}

          <div className="platform-card" style={{ marginBottom: "1rem" }}>
            <div className="platform-card-header">Readiness</div>
            <div style={{ padding: "1rem 1.25rem" }}>
              {readiness && readiness.status !== "unknown" ? (
                <p style={{ margin: 0 }}>
                  <strong>{String(readiness.status)}</strong> — RMSSD{" "}
                  {String(readiness.latest_rmssd)} ms
                </p>
              ) : (
                <p style={{ margin: 0, color: "var(--platform-text-muted)" }}>
                  No HRV readiness data.
                </p>
              )}
            </div>
          </div>

          {allAttachments.length > 0 && (
            <div className="platform-card" style={{ marginBottom: "1rem" }}>
              <div className="platform-card-header">Attached files</div>
              <div
                style={{
                  padding: "1rem 1.25rem",
                  display: "grid",
                  gap: "1rem",
                  gridTemplateColumns: "minmax(260px, 360px) minmax(0, 1fr)",
                }}
              >
                <div
                  style={{
                    border: "1px solid var(--platform-border)",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "0.85rem 1rem",
                      borderBottom: "1px solid var(--platform-border)",
                      fontWeight: 600,
                    }}
                  >
                    Available attachments
                  </div>
                  <div style={{ maxHeight: "520px", overflowY: "auto" }}>
                    {allAttachments.map((attachment) => {
                      const selected =
                        attachment.attachment_id === selectedAttachmentId;
                      return (
                        <button
                          key={attachment.attachment_id}
                          type="button"
                          onClick={() =>
                            setSelectedAttachmentId(attachment.attachment_id)
                          }
                          style={{
                            width: "100%",
                            textAlign: "left",
                            border: "none",
                            borderBottom: "1px solid var(--platform-border)",
                            padding: "0.9rem 1rem",
                            background: selected
                              ? "rgba(59, 130, 246, 0.08)"
                              : "transparent",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 600,
                              marginBottom: "0.2rem",
                              wordBreak: "break-word",
                            }}
                          >
                            {attachment.file_name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--platform-text-muted)",
                            }}
                          >
                            {attachment.record_name} •{" "}
                            {new Date(attachment.recorded_at).toLocaleString()}
                          </div>
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--platform-text-muted)",
                              marginTop: "0.2rem",
                            }}
                          >
                            {attachment.mime_type || "Unknown type"} •{" "}
                            {formatFileSize(attachment.file_size_bytes)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  style={{
                    border: "1px solid var(--platform-border)",
                    borderRadius: "8px",
                    background: "var(--platform-surface, transparent)",
                    minHeight: "420px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      padding: "0.85rem 1rem",
                      borderBottom: "1px solid var(--platform-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {selectedAttachment?.file_name || "Preview"}
                      </div>
                      {selectedAttachment && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--platform-text-muted)",
                          }}
                        >
                          {selectedAttachment.mime_type || "Unknown type"} •{" "}
                          {formatFileSize(selectedAttachment.file_size_bytes)}
                        </div>
                      )}
                    </div>

                    {selectedAttachment && (
                      <button
                        type="button"
                        className="platform-btn platform-btn-primary"
                        onClick={() =>
                          handleDownloadAttachment(
                            selectedAttachment.attachment_id,
                            selectedAttachment.file_name,
                          )
                        }
                      >
                        Download
                      </button>
                    )}
                  </div>

                  <div style={{ padding: "1rem", flex: 1 }}>
                    {renderAttachmentPreview()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {canManageTeamRoster(user?.role) && profile.team_id && (
            <div className="platform-card" style={{ marginBottom: "1rem" }}>
              <div className="platform-card-header">Roster</div>
              <div style={{ padding: "1rem 1.25rem" }}>
                <button
                  type="button"
                  className="platform-btn platform-btn-secondary"
                  onClick={removeFromTeam}
                >
                  Remove from team
                </button>
                <p
                  style={{
                    margin: "0.5rem 0 0",
                    fontSize: "0.8125rem",
                    color: "var(--platform-text-muted)",
                  }}
                >
                  Team assignment is managed here by coaches and head coaches;
                  players edit their own details under My profile.
                </p>
              </div>
            </div>
          )}

          {user?.role === "admin" && (
            <div className="platform-card" style={{ marginBottom: "1rem" }}>
              <div className="platform-card-header">Edit profile (admin)</div>
              <form
                onSubmit={saveProfile}
                style={{
                  padding: "1rem 1.25rem",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <input
                  className="platform-input"
                  placeholder="First name"
                  value={editProfile.first_name}
                  onChange={(e) =>
                    setEditProfile((p) => ({
                      ...p,
                      first_name: e.target.value,
                    }))
                  }
                  required
                />
                <input
                  className="platform-input"
                  placeholder="Last name"
                  value={editProfile.last_name}
                  onChange={(e) =>
                    setEditProfile((p) => ({ ...p, last_name: e.target.value }))
                  }
                  required
                />
                <input
                  className="platform-input"
                  placeholder="Position"
                  value={editProfile.position}
                  onChange={(e) =>
                    setEditProfile((p) => ({ ...p, position: e.target.value }))
                  }
                />
                <input
                  className="platform-input"
                  type="number"
                  placeholder="#"
                  value={editProfile.jersey_number}
                  onChange={(e) =>
                    setEditProfile((p) => ({
                      ...p,
                      jersey_number: e.target.value,
                    }))
                  }
                />
                <input
                  className="platform-input"
                  type="number"
                  placeholder="Height cm"
                  value={editProfile.height_cm}
                  onChange={(e) =>
                    setEditProfile((p) => ({ ...p, height_cm: e.target.value }))
                  }
                />
                <input
                  className="platform-input"
                  type="number"
                  placeholder="Weight kg"
                  value={editProfile.weight_kg}
                  onChange={(e) =>
                    setEditProfile((p) => ({ ...p, weight_kg: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="platform-btn platform-btn-primary"
                >
                  Save profile
                </button>
              </form>
            </div>
          )}

          {canAddHealthRecords(user?.role) && (
            <div className="platform-card" style={{ marginBottom: "1rem" }}>
              <div className="platform-card-header">Add health record</div>
              <form
                onSubmit={handleAddRecord}
                style={{
                  padding: "1rem 1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  maxWidth: "420px",
                }}
              >
                <select
                  className="platform-input"
                  required
                  value={newRecord.metric_type_id}
                  onChange={(e) =>
                    setNewRecord((n) => ({
                      ...n,
                      metric_type_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Metric type</option>
                  {metrics.map((m) => (
                    <option key={m.metric_type_id} value={m.metric_type_id}>
                      {m.name} ({m.code})
                    </option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  className="platform-input"
                  required
                  value={newRecord.recorded_at}
                  onChange={(e) =>
                    setNewRecord((n) => ({ ...n, recorded_at: e.target.value }))
                  }
                />
                <input
                  className="platform-input"
                  placeholder="Value"
                  required
                  value={newRecord.value}
                  onChange={(e) =>
                    setNewRecord((n) => ({ ...n, value: e.target.value }))
                  }
                />
                <input
                  className="platform-input"
                  placeholder="Notes (optional)"
                  value={newRecord.notes}
                  onChange={(e) =>
                    setNewRecord((n) => ({ ...n, notes: e.target.value }))
                  }
                />
                <button
                  type="submit"
                  className="platform-btn platform-btn-primary"
                >
                  Save record
                </button>
              </form>
            </div>
          )}

          <div className="platform-card">
            <div className="platform-card-header">Records</div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {records.map((r) => (
                <li
                  key={r.record_id}
                  style={{
                    padding: "1rem 1.25rem",
                    borderBottom: "1px solid var(--platform-border)",
                  }}
                >
                  {editingRecordId === r.record_id &&
                  canEditHealthRecords(user?.role) ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        maxWidth: "400px",
                      }}
                    >
                      <input
                        className="platform-input"
                        value={editRecordForm.value}
                        onChange={(e) =>
                          setEditRecordForm((f) => ({
                            ...f,
                            value: e.target.value,
                          }))
                        }
                      />
                      <input
                        className="platform-input"
                        value={editRecordForm.notes}
                        onChange={(e) =>
                          setEditRecordForm((f) => ({
                            ...f,
                            notes: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="datetime-local"
                        className="platform-input"
                        value={editRecordForm.recorded_at}
                        onChange={(e) =>
                          setEditRecordForm((f) => ({
                            ...f,
                            recorded_at: e.target.value,
                          }))
                        }
                      />
                      <span style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          className="platform-btn platform-btn-primary"
                          onClick={saveEditRecord}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="platform-btn platform-btn-secondary"
                          onClick={() => setEditingRecordId(null)}
                        >
                          Cancel
                        </button>
                      </span>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--platform-text-muted)",
                        }}
                      >
                        {new Date(r.recorded_at).toLocaleString()} — {r.value}{" "}
                        {r.unit || ""}
                      </div>
                      {r.notes ? (
                        <p
                          style={{
                            margin: "0.25rem 0 0",
                            fontSize: "0.8125rem",
                          }}
                        >
                          {r.notes}
                        </p>
                      ) : null}

                      {(attachmentsByRecord[r.record_id] || []).length > 0 && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            display: "grid",
                            gap: "0.35rem",
                          }}
                        >
                          {(attachmentsByRecord[r.record_id] || []).map((a) => (
                            <div
                              key={a.attachment_id}
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.8125rem",
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>
                                {a.file_name}
                              </span>
                              <span
                                style={{ color: "var(--platform-text-muted)" }}
                              >
                                {a.mime_type || "Unknown type"} •{" "}
                                {formatFileSize(a.file_size_bytes)}
                              </span>
                              <button
                                type="button"
                                className="platform-btn platform-btn-secondary"
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.2rem 0.5rem",
                                }}
                                onClick={() =>
                                  setSelectedAttachmentId(a.attachment_id)
                                }
                              >
                                View
                              </button>
                              <button
                                type="button"
                                className="platform-btn platform-btn-secondary"
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.2rem 0.5rem",
                                }}
                                onClick={() =>
                                  handleDownloadAttachment(
                                    a.attachment_id,
                                    a.file_name,
                                  )
                                }
                              >
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: "0.5rem",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        {canEditHealthRecords(user?.role) && (
                          <>
                            <button
                              type="button"
                              className="platform-btn platform-btn-secondary"
                              style={{ fontSize: "0.8125rem" }}
                              onClick={() => {
                                setEditingRecordId(r.record_id);
                                setEditRecordForm({
                                  value: r.value,
                                  notes: r.notes || "",
                                  recorded_at: r.recorded_at.slice(0, 16),
                                });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="platform-btn platform-btn-danger"
                              style={{ fontSize: "0.8125rem" }}
                              onClick={() => removeRecord(r.record_id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {canAddHealthRecords(user?.role) && (
                          <label
                            style={{ fontSize: "0.8125rem", cursor: "pointer" }}
                          >
                            <span
                              className="platform-btn platform-btn-secondary"
                              style={{
                                fontSize: "0.8125rem",
                                display: "inline-block",
                              }}
                            >
                              Attach file
                            </span>
                            <input
                              type="file"
                              style={{ display: "none" }}
                              onChange={(e) =>
                                onUpload(
                                  r.record_id,
                                  e.target.files?.[0] || null,
                                )
                              }
                            />
                          </label>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
              {records.length === 0 && (
                <li
                  style={{
                    padding: "1.5rem",
                    color: "var(--platform-text-muted)",
                  }}
                >
                  No records.
                </li>
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
