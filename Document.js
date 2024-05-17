const { Schema, model } = require('mongoose');

const DocumentSchema = new Schema({
    _id: String,
    filename: String,
    data: Object,
    createdBy: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = model("Document", DocumentSchema);
