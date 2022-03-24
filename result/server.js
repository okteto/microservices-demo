var express = require('express'),
    path = require('path'),
    mongo = require('mongodb').MongoClient,
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    app = express(),
    server = require('http').Server(app),
    io = require('socket.io')(server);

io.set('transports', ['polling']);

var mongoUrl = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@mongodb-serverless.tussl.mongodb.net/${process.env.MONGODB_DATABASE}?retryWrites=true&w=majority`;
var port = process.env.PORT || 4000;

function collectVotesFromResult(result) {
  var votes = { a: 0, b: 0 };
  result.forEach(function(row) {
    votes[row.vote] += 1;
  });
  return votes;
}

function getVotes(db) {
  db.collection('votes').find().toArray((err, results) => {
    if (err){
      console.error('Error performing query: ' + err);
    } else {
      var votes = collectVotesFromResult(results);
      io.sockets.emit('scores', JSON.stringify(votes));
    }
    setTimeout(function() {
      getVotes(db);
    }, 1000);
  });
}

io.sockets.on('connection', function (socket) {
  socket.emit('message', { text : 'Welcome!' });

  socket.on('subscribe', function (data) {
    socket.join(data.channel);
  });
});

mongo.connect(mongoUrl, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  connectTimeoutMS: 1000,
  socketTimeoutMS: 1000,
}, (err, client) => {
  if (err) {
    console.error(`Error connecting to mongodb`);
    return;
  }
  const db = client.db(process.env.MONGODB_DATABASE);
  getVotes(db);
});

app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});

app.use(express.static(__dirname + '/views'));

app.get('/', function (req, res) {
  res.sendFile(path.resolve(__dirname + '/views/index.html'));
});

server.listen(port, function () {
  var port = server.address().port;
  console.log('App running on port ' + port);
});
