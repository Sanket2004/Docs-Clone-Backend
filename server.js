const { Socket } = require('socket.io')
const mongoose = require('mongoose')
const Document = require('./Document')


mongoose.connect('mongodb+srv://sanketbanerjee:202004@cluster0.g1uple2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

const io = require('socket.io')(3001, {
    cors: {
        // origin: 'http://localhost:3000',
        origin: 'https://docsme.netlify.app',
        methods: ['GET', 'POST']
    },
})

const defaultValue = "";

io.on("connection", Socket => {

    Socket.on('get-document', async documentId => {
        const document = await findOrcreateDocument(documentId);
        Socket.join(documentId)
        Socket.emit("load-document", document.data)

        Socket.on('send-changes', delta => {
            Socket.broadcast.to(documentId).emit("receive-changes", delta)
        })

        Socket.on("save-document", async data => {
            await Document.findByIdAndUpdate(documentId, { data });
        })
    })
    console.log("Connected");
})


async function findOrcreateDocument(id) {
    if (id == null) return;

    const document = await Document.findById(id);

    if (document) return document
    return await Document.create({ _id: id, data: defaultValue })
}