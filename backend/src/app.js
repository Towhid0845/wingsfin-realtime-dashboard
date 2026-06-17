"use strict";

const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes/api");
const { errorHandler, notFound } = require("./middleware/errorHandler");

function createApp() {
  const app = express();
  app.use(cors({ origin: "*" }));
  app.use(express.json());

  if (process.env.NODE_ENV !== "test") {
    app.use((req, _res, next) => {
      console.log(`[HTTP] ${req.method} ${req.path}`);
      next();
    });
  }

  app.use("/api", apiRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
