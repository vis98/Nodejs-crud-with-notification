const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true }  // Add other book properties as needed
});

const Book = mongoose.model('Book', bookSchema);

module.exports = Book;
