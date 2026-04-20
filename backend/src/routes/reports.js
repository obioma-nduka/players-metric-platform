const express = require("express");
const fs = require("fs");
const path = require("path");
const { authenticateToken, loadUser } = require("../middleware/auth");
const { requirePermission } = require("../permissions");

const router = express.Router();

const REPORT_FILES_DIRNAME = "report-files";
const INLINE_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
]);

function canAccessReportsPage(req) {
  const role = req.user?.role;
  return Boolean(
    role &&
    (role === "admin" ||
      role === "medical_staff" ||
      role === "fitness_coach" ||
      role === "coach" ||
      role === "head_coach" ||
      role === "performance_analyst" ||
      role === "player"),
  );
}

function ensureAuthenticatedReportAccess(req, res) {
  if (!canAccessReportsPage(req)) {
    res.status(403).json({ error: "Insufficient permissions" });
    return false;
  }
  return true;
}

function getUploadsRoot(req) {
  return (
    req.app.locals.uploadDir || path.join(__dirname, "..", "..", "uploads")
  );
}

function getReportFilesDir(req) {
  return path.join(getUploadsRoot(req), REPORT_FILES_DIRNAME);
}

function toBase64Url(value) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function guessMimeType(fileName) {
  const ext = path.extname(fileName || "").toLowerCase();
  switch (ext) {
    case ".pdf":
      return "application/pdf";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".csv":
      return "text/csv; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".zip":
      return "application/zip";
    default:
      return "application/octet-stream";
  }
}

function encodeContentDispositionFilename(fileName) {
  return encodeURIComponent(fileName || "download").replace(/['()]/g, escape);
}

function getAttachmentStorageNames(db) {
  try {
    const rows = db.prepare("SELECT storage_path FROM attachments").all();
    return new Set(
      rows
        .map((row) => row?.storage_path)
        .filter(Boolean)
        .map((value) => path.basename(String(value))),
    );
  } catch (_) {
    return new Set();
  }
}

function listLegacyRootReportFiles(req) {
  const uploadsRoot = getUploadsRoot(req);
  if (!fs.existsSync(uploadsRoot)) return [];

  const db = req.app.locals.db;
  const attachmentStorageNames = getAttachmentStorageNames(db);
  const reportDir = getReportFilesDir(req);

  return fs
    .readdirSync(uploadsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => entry.name !== ".gitkeep")
    .filter((entry) => !attachmentStorageNames.has(entry.name))
    .filter((entry) => path.join(uploadsRoot, entry.name) !== reportDir)
    .map((entry) => ({
      absolutePath: path.join(uploadsRoot, entry.name),
      relativePath: entry.name,
      origin: "legacy-root",
    }));
}

function listDedicatedReportFiles(req) {
  const reportDir = getReportFilesDir(req);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
    return [];
  }

  return fs
    .readdirSync(reportDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => entry.name !== ".gitkeep")
    .map((entry) => ({
      absolutePath: path.join(reportDir, entry.name),
      relativePath: path.join(REPORT_FILES_DIRNAME, entry.name),
      origin: "report-files",
    }));
}

function getAvailableReportFiles(req) {
  const files = [
    ...listDedicatedReportFiles(req),
    ...listLegacyRootReportFiles(req),
  ];
  const deduped = new Map();

  for (const file of files) {
    const absolutePath = path.resolve(file.absolutePath);
    if (!fs.existsSync(absolutePath)) continue;

    let stat;
    try {
      stat = fs.statSync(absolutePath);
    } catch (_) {
      continue;
    }

    if (!stat.isFile()) continue;

    const fileName = path.basename(absolutePath);
    const mimeType = guessMimeType(fileName);
    const id = toBase64Url(file.relativePath);

    deduped.set(id, {
      id,
      file_name: fileName,
      relative_path: file.relativePath.replace(/\\/g, "/"),
      file_size_bytes: stat.size,
      mime_type: mimeType,
      uploaded_at: stat.mtime.toISOString(),
      origin: file.origin,
      can_preview: INLINE_MIME_TYPES.has(mimeType.split(";")[0]),
    });
  }

  return Array.from(deduped.values()).sort((a, b) => {
    const timeA = Date.parse(a.uploaded_at || "") || 0;
    const timeB = Date.parse(b.uploaded_at || "") || 0;
    return timeB - timeA || a.file_name.localeCompare(b.file_name);
  });
}

function resolveReportFileById(req, fileId) {
  const decodedRelativePath = fromBase64Url(fileId);
  if (!decodedRelativePath) return null;

  const normalized = path.normalize(decodedRelativePath);
  if (normalized.includes("..") || path.isAbsolute(normalized)) return null;

  const uploadsRoot = path.resolve(getUploadsRoot(req));
  const reportDir = path.resolve(getReportFilesDir(req));

  const inDedicatedDir =
    normalized === REPORT_FILES_DIRNAME ||
    normalized.startsWith(`${REPORT_FILES_DIRNAME}${path.sep}`);
  const absolutePath = inDedicatedDir
    ? path.resolve(uploadsRoot, normalized)
    : path.resolve(uploadsRoot, path.basename(normalized));

  const allowed =
    absolutePath.startsWith(`${reportDir}${path.sep}`) ||
    absolutePath.startsWith(reportDir) ||
    path.dirname(absolutePath) === uploadsRoot;

  if (!allowed || !fs.existsSync(absolutePath)) return null;

  let stat;
  try {
    stat = fs.statSync(absolutePath);
  } catch (_) {
    return null;
  }

  if (!stat.isFile()) return null;

  const fileName = path.basename(absolutePath);
  const mimeType = guessMimeType(fileName);

  return {
    id: fileId,
    file_name: fileName,
    absolute_path: absolutePath,
    relative_path: normalized.replace(/\\/g, "/"),
    file_size_bytes: stat.size,
    mime_type: mimeType,
    uploaded_at: stat.mtime.toISOString(),
    can_preview: INLINE_MIME_TYPES.has(mimeType.split(";")[0]),
  };
}

function streamReportFile(req, res, disposition) {
  if (!ensureAuthenticatedReportAccess(req, res)) return;

  const file = resolveReportFileById(req, req.params.fileId);
  if (!file) {
    return res.status(404).json({ error: "Report file not found" });
  }

  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename*=UTF-8''${encodeContentDispositionFilename(file.file_name)}`,
  );
  res.setHeader("Content-Type", file.mime_type || "application/octet-stream");
  res.setHeader("Content-Length", String(file.file_size_bytes || 0));

  const stream = fs.createReadStream(file.absolute_path);
  stream.on("error", (err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.destroy(err);
  });
  stream.pipe(res);
}

// GET /reports/files
router.get("/files", authenticateToken, loadUser, (req, res) => {
  if (!ensureAuthenticatedReportAccess(req, res)) return;

  try {
    const files = getAvailableReportFiles(req);
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /reports/files/:fileId/view
router.get("/files/:fileId/view", authenticateToken, loadUser, (req, res) => {
  return streamReportFile(req, res, "inline");
});

// GET /reports/files/:fileId/download
router.get(
  "/files/:fileId/download",
  authenticateToken,
  loadUser,
  (req, res) => {
    return streamReportFile(req, res, "attachment");
  },
);

// GET /reports/medical?player_id=&team_id=
router.get(
  "/medical",
  authenticateToken,
  loadUser,
  requirePermission("generate_medical_reports"),
  (req, res) => {
    const db = req.app.locals.db;
    const { player_id, team_id } = req.query;
    const { role, teamId: userTeamId } = req.user;
    const isAdmin = role === "admin";
    const fullOrg = isAdmin || role === "medical_staff";

    try {
      let where = "WHERE 1=1";
      const params = [];
      if (player_id) {
        where += " AND r.player_id = ?";
        params.push(player_id);
      }
      if (team_id) {
        if (!fullOrg && userTeamId && team_id !== userTeamId) {
          return res.status(403).json({ error: "Cannot access other teams" });
        }
        where += " AND p.team_id = ?";
        params.push(team_id);
      } else if (!fullOrg && userTeamId) {
        where += " AND p.team_id = ?";
        params.push(userTeamId);
      }

      const summary = db
        .prepare(
          `
        SELECT m.code, m.name, COUNT(*) AS record_count,
               MAX(r.recorded_at) AS latest_recorded_at
        FROM health_records r
        JOIN health_metric_types m ON m.metric_type_id = r.metric_type_id
        JOIN players p ON p.player_id = r.player_id
        ${where}
        GROUP BY m.metric_type_id
        ORDER BY m.name
      `,
        )
        .all(...params);

      const recent = db
        .prepare(
          `
        SELECT r.record_id, r.player_id, p.first_name, p.last_name, r.recorded_at, r.value, m.code, m.name
        FROM health_records r
        JOIN health_metric_types m ON m.metric_type_id = r.metric_type_id
        JOIN players p ON p.player_id = r.player_id
        ${where}
        ORDER BY r.recorded_at DESC
        LIMIT 25
      `,
        )
        .all(...params);

      res.json({
        report_type: "medical_summary",
        generated_at: new Date().toISOString(),
        filters: { player_id: player_id || null, team_id: team_id || null },
        metric_summary: summary,
        recent_entries: recent,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

// GET /reports/analytical?team_id=
router.get(
  "/analytical",
  authenticateToken,
  loadUser,
  requirePermission("generate_analytical_reports"),
  (req, res) => {
    const db = req.app.locals.db;
    const { team_id } = req.query;
    const { role, teamId: userTeamId } = req.user;
    const isAdmin = role === "admin";
    const fullOrg = isAdmin || role === "performance_analyst";

    try {
      let scopedTeam = null;
      if (team_id) {
        if (!fullOrg && userTeamId && team_id !== userTeamId) {
          return res.status(403).json({ error: "Cannot access other teams" });
        }
        scopedTeam = team_id;
      } else if (!fullOrg && userTeamId) {
        scopedTeam = userTeamId;
      }

      const condNumeric = scopedTeam
        ? "WHERE p.team_id = ? AND m.data_type IN ('numeric', 'integer')"
        : "WHERE m.data_type IN ('numeric', 'integer')";
      const paramsNumeric = scopedTeam ? [scopedTeam] : [];

      const byMetric = db
        .prepare(
          `
        SELECT m.code, m.name, m.unit,
               COUNT(r.record_id) AS n,
               AVG(CAST(r.value AS REAL)) AS avg_value,
               MIN(CAST(r.value AS REAL)) AS min_value,
               MAX(CAST(r.value AS REAL)) AS max_value
        FROM health_records r
        JOIN health_metric_types m ON m.metric_type_id = r.metric_type_id
        JOIN players p ON p.player_id = r.player_id
        ${condNumeric}
        GROUP BY m.metric_type_id
        ORDER BY m.name
      `,
        )
        .all(...paramsNumeric);

      const condPlayers = scopedTeam ? "WHERE p.team_id = ?" : "";
      const paramsPlayers = scopedTeam ? [scopedTeam] : [];

      const playerLoad = db
        .prepare(
          `
        SELECT p.player_id, p.first_name, p.last_name, COUNT(r.record_id) AS record_count
        FROM players p
        LEFT JOIN health_records r ON r.player_id = p.player_id
        ${condPlayers}
        GROUP BY p.player_id
        ORDER BY record_count DESC
        LIMIT 30
      `,
        )
        .all(...paramsPlayers);

      res.json({
        report_type: "team_analytics",
        generated_at: new Date().toISOString(),
        filters: { team_id: scopedTeam },
        numeric_metric_stats: byMetric,
        records_per_player: playerLoad,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
);

module.exports = router;
