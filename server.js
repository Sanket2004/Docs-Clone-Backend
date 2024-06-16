require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Document = require("./Document");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Set up Express
const app = express();

// Use express.json() middleware to parse JSON bodies
app.use(express.json());

// Apply global CORS settings
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  })
);

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.io with CORS settings
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

const defaultValue = "";
let connectedUsers = 0;

const updateConnectedUsers = () => {
  io.emit("user-count", connectedUsers);
};

// Socket.io connection
io.on("connection", (socket) => {
  connectedUsers++;
  console.log(`Socket Connected. Users connected: ${connectedUsers}`);
  updateConnectedUsers();


  socket.on("disconnect", () => {
    connectedUsers--;
    console.log(`Socket Disconnected. Users connected: ${connectedUsers}`);
    updateConnectedUsers();
  });

  socket.on("get-document", async (documentId) => {
    const document = await Document.findById(documentId);
    socket.join(documentId);
    socket.emit("load-document", document.data);

    socket.on("send-changes", (delta) => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

// Endpoint to create or find a document
app.post("/document", async (req, res) => {
  try {
    const { id, username, filename } = req.body;

    if (!id || !username || !filename) {
      return res.status(400).send("id, username, and filename are required");
    }

    const document = await findOrCreateDocument(id, username, filename);
    res.status(200).json(document);
  } catch (error) {
    console.error("Error creating or finding document:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Helper function to find or create a document
async function findOrCreateDocument(id, username, filename) {
  if (id == null) return;

  let document = await Document.findById(id);
  if (document) return document;

  document = new Document({
    _id: id,
    data: defaultValue,
    createdBy: username,
    filename,
  });

  await document.save();
  return document;
}

// Endpoint to display document details
app.get("/document/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.status(200).json(document);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Endpoint to display all documents
app.get("/documents", async (req, res) => {
  try {
    const documents = await Document.find();
    res.json(documents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
