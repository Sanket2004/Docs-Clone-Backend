require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const Document = require('./Document');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Set up Express
const app = express();

// Apply global CORS settings
app.use(cors({
    origin: process.env.CLIENT_ORIGIN,
    methods: ['GET', 'POST']
}));

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.io with CORS settings
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN,
        methods: ['GET', 'POST']
    },
});

const defaultValue = "";

io.on("connection", (socket) => {
    console.log("Connected");

    socket.on('get-document', async (documentId, username, filename) => {
        const document = await findOrCreateDocument(documentId, username, filename);
        socket.join(documentId);
        socket.emit("load-document", document.data);

        socket.on('send-changes', (delta) => {
            socket.broadcast.to(documentId).emit("receive-changes", delta);
        });

        socket.on("save-document", async (data, createdBy, filename) => {
            await Document.findByIdAndUpdate(documentId, { data, createdBy, filename });
        });
    });

});

async function findOrCreateDocument(id, username, filename) {
    if (id == null) return;

    const document = await Document.findById(id);
    if (document) return document;
    return await Document.create({ _id: id, data: defaultValue, username, filename });
}


// Add route to display all documents
app.get('/documents', async (req, res) => {
    try {
        const documents = await Document.find();
        res.json(documents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
