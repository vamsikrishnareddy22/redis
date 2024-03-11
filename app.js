const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const redis = require('redis');

const app = express();
const port = 3000;


mongoose.connect('mongodb+srv://SmartWork123:SmartWork123@cluster0.aocgo.mongodb.net/redis', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  socketTimeoutMS: 30000, // Adjust the timeout as needed
});

const db = mongoose.connection;

db.on('error', (err) => {
  console.error(`MongoDB connection error: ${err}`);
});

db.once('open', () => {
  console.log('Connected to MongoDB');
});


// Create a simple Mongoose model
const Item = mongoose.model('Item', 
    {
        name: String,
        price: Number,
        category: String
    });

// Set up Redis client
const redisClient = redis.createClient();

// Middleware to parse JSON
app.use(bodyParser.json());

// CRUD operations

// Create
app.post('/items', async (req, res) => {
    const newItem = new Item(req.body);
    await newItem.save();

    // Invalidate Redis cache
    redisClient.del('items');

    res.json(newItem);
});

// Read
app.get('/items', async (req, res) => {
    // Check if data is cached in Redis
    redisClient.get('items', async (err, cachedItems) => {
        if (cachedItems) {
            console.log('Using cached data from Redis');
            res.json(JSON.parse(cachedItems));
        } else {
            console.log('Fetching data from MongoDB');
            const items = await Item.find();
            // Cache data in Redis
            redisClient.setex('items', 3600, JSON.stringify(items));
            res.json(items);
        }
    });
});

// Update
app.put('/items/:id', async (req, res) => {
    const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // Invalidate Redis cache
    redisClient.del('items');

    res.json(updatedItem);
});

// Delete
app.delete('/items/:id', async (req, res) => {
    await Item.findByIdAndDelete(req.params.id);

    // Invalidate Redis cache
    redisClient.del('items');

    res.json({ message: 'Item deleted' });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
