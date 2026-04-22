import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/context/AuthContext";
import {
  downloadReportFile,
  exportData,
  getAnalyticalReport,
  getMedicalReport,
  getTeams,
  listReportFiles,
  previewReportFile,
  type ReportFile,
} from "@/api";
import {
  canExportData,
  canGenerateAnalyticalReports,
  canGenerateMedicalReports,
} from "@/utils/permissions";

type TeamOption = {
  team_id: string;
  name: string;
};

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function isImageMime(mime?: string | null) {
  return !!mime && mime.startsWith("image/");
}

function isPdfMime(mime?: string | null, fileName?: string) {
  return mime === "application/pdf" || fileName?.toLowerCase().endsWith(".pdf");
}

function isTextMime(mime?: string | null) {
  return !!mime && (mime.startsWith("text/") || mime.includes("json"));
}

export default function ReportsPage() {
  const { token, user } = useAuthStore();

  useEffect(() => {
    document.title = "Reports | Players Metrics Platform";
  }, []);

  const [medical, setMedical] = useState<unknown>(null);
  const [analytical, setAnalytical] = useState<unknown>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [reportFiles, setReportFiles] = useState<ReportFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getTeams()
      .then((r) => setTeams(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTeams([]));
  }, [token]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    const loadReportFiles = async () => {
      setFilesLoading(true);
      try {
        const res = await listReportFiles();
        if (cancelled) return;

        const files = Array.isArray(res.data) ? res.data : [];
        setReportFiles(files);
        setSelectedFileId((current) =>
          current && files.some((file) => file.id === current)
            ? current
            : (files[0]?.id ?? null),
        );
      } catch (err: unknown) {
        if (cancelled) return;
        setError(
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || "Failed to load uploaded report files",
        );
        setReportFiles([]);
        setSelectedFileId(null);
      } finally {
        if (!cancelled) setFilesLoading(false);
      }
    };

    loadReportFiles();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const selectedFile = useMemo(
    () => reportFiles.find((file) => file.id === selectedFileId) ?? null,
    [reportFiles, selectedFileId],
  );

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl((current) => {
        if (current) window.URL.revokeObjectURL(current);
        return null;
      });
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    if (
      !isPdfMime(selectedFile.mime_type, selectedFile.name) &&
      !isImageMime(selectedFile.mime_type) &&
      !isTextMime(selectedFile.mime_type)
    ) {
      setPreviewUrl((current) => {
        if (current) window.URL.revokeObjectURL(current);
        return null;
      });
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const res = await previewReportFile(selectedFile.id);
        if (cancelled) return;

        const nextUrl = window.URL.createObjectURL(res.data);
        setPreviewUrl((current) => {
          if (current) window.URL.revokeObjectURL(current);
          return nextUrl;
        });
      } catch (err: unknown) {
        if (cancelled) return;
        setPreviewUrl((current) => {
          if (current) window.URL.revokeObjectURL(current);
          return null;
        });
        setPreviewError(
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || "Failed to load report preview",
        );
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const runMedical = async () => {
    if (!canGenerateMedicalReports(user?.role)) return;
    setError(null);
    try {
      const res = await getMedicalReport({ team_id: teamId || undefined });
      setMedical(res.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Medical report failed",
      );
    }
  };

  const runAnalytical = async () => {
    if (!canGenerateAnalyticalReports(user?.role)) return;
    setError(null);
    try {
      const res = await getAnalyticalReport({ team_id: teamId || undefined });
      setAnalytical(res.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Analytical report failed",
      );
    }
  };

  const dl = async (resource: string) => {
    if (!canExportData(user?.role)) return;
    setError(null);
    try {
      const res = await exportData({
        resource,
        format: "csv",
        team_id: teamId || undefined,
      });
      const blob = res.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resource}_export.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Export failed",
      );
    }
  };

  const handleDownloadSelectedFile = async () => {
    if (!selectedFile) return;
    setError(null);
    try {
      await downloadReportFile(selectedFile.id, selectedFile.name);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "Report download failed",
      );
    }
  };

  const handleOpenPreview = () => {
    if (!previewUrl) return;
    window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <p style={{ marginBottom: "0.5rem" }}>
        <Link to="/dashboard" style={{ fontSize: "0.875rem" }}>
          ← Dashboard
        </Link>
      </p>

      <h1 className="platform-page-title">Reports & export</h1>
      <p className="platform-page-subtitle">
        View uploaded report files, run summaries, and download exports where
        permitted.
      </p>

      <div className="platform-card" style={{ marginBottom: "1rem" }}>
        <div className="platform-card-header">Uploaded report files</div>
        <div
          style={{
            padding: "1rem 1.25rem",
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)",
          }}
        >
          <div
            style={{
              border: "1px solid var(--platform-border, #e2e8f0)",
              borderRadius: "8px",
              overflow: "hidden",
              background: "var(--platform-card-bg, #fff)",
            }}
          >
            <div
              style={{
                padding: "0.85rem 1rem",
                borderBottom: "1px solid var(--platform-border, #e2e8f0)",
                fontWeight: 600,
              }}
            >
              Available files
            </div>

            {filesLoading ? (
              <div
                style={{
                  padding: "1rem",
                  fontSize: "0.9rem",
                  color: "var(--platform-text-muted)",
                }}
              >
                Loading uploaded files…
              </div>
            ) : reportFiles.length === 0 ? (
              <div
                style={{
                  padding: "1rem",
                  fontSize: "0.9rem",
                  color: "var(--platform-text-muted)",
                }}
              >
                No uploaded report files are available yet.
              </div>
            ) : (
              <div style={{ maxHeight: "430px", overflowY: "auto" }}>
                {reportFiles.map((file) => {
                  const selected = file.id === selectedFileId;
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setSelectedFileId(file.id)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "0.9rem 1rem",
                        border: "none",
                        borderBottom:
                          "1px solid var(--platform-border, #e2e8f0)",
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
                        {file.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--platform-text-muted)",
                        }}
                      >
                        {file.mime_type || "Unknown type"} •{" "}
                        {formatBytes(file.size_bytes)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--platform-text-muted)",
                          marginTop: "0.2rem",
                        }}
                      >
                        Updated: {formatDate(file.updated_at)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              border: "1px solid var(--platform-border, #e2e8f0)",
              borderRadius: "8px",
              background: "var(--platform-card-bg, #fff)",
              minHeight: "430px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "0.85rem 1rem",
                borderBottom: "1px solid var(--platform-border, #e2e8f0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>
                  {selectedFile?.name || "Preview"}
                </div>
                {selectedFile && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--platform-text-muted)",
                    }}
                  >
                    {selectedFile.mime_type || "Unknown type"} •{" "}
                    {formatBytes(selectedFile.size_bytes)}
                  </div>
                )}
              </div>

              {selectedFile && (
                <div
                  style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}
                >
                  <button
                    type="button"
                    className="platform-btn platform-btn-secondary"
                    onClick={handleOpenPreview}
                    disabled={!previewUrl}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    className="platform-btn platform-btn-primary"
                    onClick={handleDownloadSelectedFile}
                  >
                    Download
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: "1rem", flex: 1 }}>
              {!selectedFile ? (
                <div
                  style={{
                    color: "var(--platform-text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  Select a report file to preview it here.
                </div>
              ) : previewLoading ? (
                <div
                  style={{
                    color: "var(--platform-text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  Loading preview…
                </div>
              ) : previewError ? (
                <div
                  style={{
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    borderRadius: "6px",
                    padding: "0.9rem",
                    fontSize: "0.9rem",
                  }}
                >
                  {previewError}
                </div>
              ) : isPdfMime(selectedFile.mime_type, selectedFile.name) &&
                previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={selectedFile.name}
                  style={{
                    width: "100%",
                    minHeight: "540px",
                    border: "1px solid var(--platform-border, #e2e8f0)",
                    borderRadius: "6px",
                    background: "#fff",
                  }}
                />
              ) : isImageMime(selectedFile.mime_type) && previewUrl ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    border: "1px solid var(--platform-border, #e2e8f0)",
                    borderRadius: "6px",
                    padding: "0.75rem",
                    background: "#fff",
                  }}
                >
                  <img
                    src={previewUrl}
                    alt={selectedFile.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "540px",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ) : isTextMime(selectedFile.mime_type) && previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={selectedFile.name}
                  style={{
                    width: "100%",
                    minHeight: "540px",
                    border: "1px solid var(--platform-border, #e2e8f0)",
                    borderRadius: "6px",
                    background: "#fff",
                  }}
                />
              ) : (
                <div
                  style={{
                    border: "1px dashed var(--platform-border, #cbd5e1)",
                    borderRadius: "6px",
                    padding: "1.25rem",
                    color: "var(--platform-text-muted)",
                    minHeight: "240px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  Preview is not available for this file type. Use the download
                  action above.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className="platform-card"
        style={{ marginBottom: "1rem", padding: "1rem 1.25rem" }}
      >
        <label
          className="platform-label"
          style={{ display: "block", marginBottom: "0.35rem" }}
        >
          Filter by team (optional)
        </label>
        <select
          className="platform-input"
          style={{ maxWidth: "280px" }}
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">All (or your scope)</option>
          {teams.map((t) => (
            <option key={t.team_id} value={t.team_id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            background: "#fef2f2",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--platform-danger)",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </p>
        </div>
      )}

      {canGenerateMedicalReports(user?.role) && (
        <div className="platform-card" style={{ marginBottom: "1rem" }}>
          <div className="platform-card-header">Medical summary</div>
          <div style={{ padding: "1rem 1.25rem" }}>
            <button
              type="button"
              className="platform-btn platform-btn-primary"
              onClick={runMedical}
              style={{ marginBottom: "0.75rem" }}
            >
              Generate JSON summary
            </button>
            {medical && (
              <pre
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  overflow: "auto",
                  maxHeight: "320px",
                  background: "#f8fafc",
                  padding: "0.75rem",
                  borderRadius: "4px",
                }}
              >
                {JSON.stringify(medical, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {canGenerateAnalyticalReports(user?.role) && (
        <div className="platform-card" style={{ marginBottom: "1rem" }}>
          <div className="platform-card-header">Team analytics</div>
          <div style={{ padding: "1rem 1.25rem" }}>
            <button
              type="button"
              className="platform-btn platform-btn-primary"
              onClick={runAnalytical}
              style={{ marginBottom: "0.75rem" }}
            >
              Generate JSON analytics
            </button>
            {analytical && (
              <pre
                style={{
                  margin: 0,
                  fontSize: "0.75rem",
                  overflow: "auto",
                  maxHeight: "320px",
                  background: "#f8fafc",
                  padding: "0.75rem",
                  borderRadius: "4px",
                }}
              >
                {JSON.stringify(analytical, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {canExportData(user?.role) && (
        <div className="platform-card">
          <div className="platform-card-header">CSV export</div>
          <div
            style={{
              padding: "1rem 1.25rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <button
              type="button"
              className="platform-btn platform-btn-secondary"
              onClick={() => dl("health_records")}
            >
              Health records
            </button>
            <button
              type="button"
              className="platform-btn platform-btn-secondary"
              onClick={() => dl("players")}
            >
              Players
            </button>
            {user?.role === "admin" && (
              <button
                type="button"
                className="platform-btn platform-btn-secondary"
                onClick={() => dl("users")}
              >
                Users
              </button>
            )}
          </div>
        </div>
      )}

      {!canGenerateMedicalReports(user?.role) &&
        !canGenerateAnalyticalReports(user?.role) &&
        !canExportData(user?.role) && (
          <p style={{ color: "var(--platform-text-muted)" }}>
            You do not have report-generation or export permissions, but you can
            still view uploaded report files shown above.
          </p>
        )}
    </div>
  );
}
