const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const { createS3Client, getCallerIdentity } = require("./s3-client");
const router = require("./routes");

const app = express();
const PORT = process.env.PORT || 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Store active connections in memory: { [id]: { config, client } }
const connections = new Map();

// Make connections & upload available to routes
app.use((req, res, next) => {
  req.connections = connections;
  req.upload = upload;
  next();
});

app.use("/api", router);

app.listen(PORT, () => {
  console.log(`S3 Tester backend running on http://localhost:${PORT}`);
});