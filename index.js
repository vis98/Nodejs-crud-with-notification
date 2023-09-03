// index.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Redis = require('ioredis');
const path=require("path");
const jwt = require('jsonwebtoken');
/* const session=require('express-session')
let RedisStore=require('connect-redis')(session)
 */
const redisClient = new  Redis({
  host:'redis',
  port:6379
});

const db = mongoose.connection;

const Book = require('./models/book');

const CONSTANT=require('./constant');
const {authenticateToken,validateInput,bookSchemaValidation} = require('./Utilities');
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname,"./public")))

const http = require('http');
const socketIO = require('socket.io');

const server = http.createServer(app);
const io = socketIO(server);

// Event handler for a new connection
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle room join
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  // Handle message broadcasting
  socket.on('broadcast', (room, message) => {
    socket.to(room).emit('message', message);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

const secret_key='secret@98';



// Connect to MongoDB
mongoose.connect('mongourl'+'test', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});


app.use(cors());
app.use(bodyParser.json());





// Routes for CRUD operations
app.post('/api/login', (req, res) => {
  // For simplicity, we'll use a hardcoded user and password.
  const username = 'user';
  const password = 'password';

  const { reqUsername, reqPassword } = req.body;
  if (username === reqUsername && password === reqPassword) {
    const accessToken = jwt.sign({ username }, secret_key);
    return res.json({ accessToken });
  }
  res.sendStatus(401);
});

app.get('/api/books', authenticateToken, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    // const totalBooks = await db.collection('Book').countDocuments();

  const books = await db.collection('books').find().skip(skip).limit(limit).toArray();
  console.log("books",books);
  res.json(books);
});

app.post('/api/books', authenticateToken, validateInput(bookSchemaValidation), async (req, res) => {
  const { title, author } = req.body;
  const lastBook = await Book.findOne().sort({ id: 'desc' }).exec();
  const newId = lastBook ? lastBook.id + 1 : 1;

  const newBook = new Book({ id:newId,title, author });
  console.log("new book",newBook);
  await newBook.save();
  io.emit('addedItem', newBook);

  res.status(201).json(newBook);
});

app.put('/api/books/:id', authenticateToken, validateInput(bookSchemaValidation), async (req, res) => {
  const bookId = req.params.id;
  const { title, author } = req.body;

  const updatedBook = await Book.findOneAndUpdate({id:bookId}, { title, author }, { new: true });
  if (!updatedBook) {
    return res.status(404).json({ error: 'Book not found' });
  }
  await redisClient.set(bookId, JSON.stringify(updatedBook), 'EX',CONSTANT.cacheExpirationTimeSeconds); // Update the cached data with expiration
  io.emit('updatedItem', {new:updatedBook,id:bookId});

  res.json(updatedBook);
});

app.delete('/api/books/:id', authenticateToken, async (req, res) => {
  const bookId = req.params.id;

  const deletedBook = await Book.findOneAndDelete({id:bookId});
  if (!deletedBook) {
    return res.status(404).json({ error: 'Book not found' });
  }
  redisClient.del(bookId);


  io.emit('deletedItem', deletedBook);

  res.json({ message: 'Book deleted successfully' });
});

app.get('/api/books/:id', authenticateToken, async (req, res) => {
    const bookId = req.params.id;
  

    // Check if the data is cached
    const cachedBook = await redisClient.get(bookId);
    console.log("bookData",cachedBook? cachedBook.length:0)

    if (cachedBook && cachedBook.length) {
        console.log("inside cache",cachedBook)
      return res.status(200).json(cachedBook);
    }
   const book = await Book.findOne({id:bookId});
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    redisClient.set(bookId,JSON.stringify(book),'EX',120);
     res.json(book);

  });

// Start the server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
