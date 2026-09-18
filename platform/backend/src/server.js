require("dotenv").config();

const express = require("express");
const cookieParser =
  require("cookie-parser");
const cors = require("cors");

const {
  securityMiddleware
} = require("./middleware/security");

require("./config/database");

const authRoutes =
  require("./routes/auth.routes");

const app = express();

const PORT =
  Number(process.env.PORT || 3000);

const HOST =
  process.env.HOST || "0.0.0.0";

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map(
    (origin) => origin.trim()
  )
  .filter(Boolean);

securityMiddleware(app);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          "Origin not allowed by CORS."
        )
      );
    },
    credentials: true
  })
);

app.use(
  express.json({
    limit: "1mb"
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb"
  })
);

app.use(cookieParser());

app.get(
  "/health",
  (req, res) => {
    res.json({
      status: "ok",
      project: "SHAHEEN - YS",
      phase: "Phase 1",
      timestamp:
        new Date().toISOString()
    });
  }
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  (req, res) => {
    res.status(404).json({
      error: "Route not found."
    });
  }
);

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "[ERROR]",
      err
    );

    const status =
      Number.isInteger(
        err.status
      ) &&
      err.status >= 400
        ? err.status
        : 500;

    res.status(status).json({
      error:
        status === 500
          ? "Internal server error."
          : err.message
    });
  }
);

const server =
  app.listen(
    PORT,
    HOST,
    () => {
      console.log(
        `[SHAHEEN-YS] Backend listening on ${HOST}:${PORT}`
      );
    }
  );

function shutdown(signal) {
  console.log(
    `[SHAHEEN-YS] Received ${signal}. Shutting down...`
  );

  server.close(
    () => {
      console.log(
        "[SHAHEEN-YS] Server stopped."
      );

      process.exit(0);
    }
  );
}

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);
