var config = require('./config.json');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = config.port || 4200;
var mysql = require('mysql');
var fs = require('fs');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

app.use(express.static(__dirname + '/public'));

var connection = mysql.createConnection(config.mysql);

connection.connect();

var linenum = fs.readFileSync(config.curid, "utf-8");

io.on('connection', function(socket){
  socket.on('lastlines', function(data){
    connection.query('SELECT * FROM irc_lines WHERE channel = ? ORDER BY line_number DESC LIMIT ?', [config.channel, data.lines], function(err, rows, fields) {
      if(err) return;
      if(rows.length > 0)
      {
        for(i=rows.length-1;i>=0;i--)
        {
          socket.emit(rows[i].type,rows[i]);
        }
      }
      socket.emit('scroll',"");
    });

    connection.query('SELECT * FROM irc_topics WHERE chan = ?', [config.channel], function(err, rows, fields) {
      if(err) return;
      socket.emit('topics',rows[0]);
    });
  });

  socket.on('lastcurid', function(data){
    connection.query('SELECT * FROM irc_lines WHERE channel = ? AND line_number > ? ORDER BY line_number DESC', [config.channel, data.curid], function(err, rows, fields) {
      if(err) return;
      if(rows.length > 0)
      {
        for(i=rows.length-1;i>=0;i--)
        {
          socket.emit(rows[i].type,rows[i]);
        }
      }
      socket.emit('scroll',"");
    });

    connection.query('SELECT * FROM irc_topics WHERE chan = ?', [config.channel], function(err, rows, fields) {
      if(err) return;
      socket.emit('topics',rows[0]);
    });
  });
});

fs.watch(config.curid, function(event, filename) {
  var line = fs.readFileSync(config.curid, "utf-8");
  if(event == 'change' && line != linenum && line != "")
  {
    connection.query('SELECT * FROM irc_lines WHERE channel = ? AND line_number > ? ORDER BY line_number ASC', [config.channel, linenum], function(err, rows, fields) {
      if(err) return;
      if(rows.length > 0)
      {
        for(i=0;i<rows.length;i++)
        {
          io.sockets.emit(rows[i].type,rows[i]);
        }
      }
      io.sockets.emit('scroll',"");
    });
    linenum = line;
  }
});

process.on('SIGINT', function(){
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  connection.end();
  process.exit();
});
