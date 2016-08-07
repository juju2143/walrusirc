var config = require('./config.json');
var express = require('express');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
var port = config.port || 4200;
var mysql = require('mysql');
var fs = require('fs');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var path = require('path');

server.listen(port, function()
{
  console.log('Server listening at port %d', port);
});

var connection = mysql.createConnection(config.mysql);
connection.connect();

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: true}));

app.get('/logs/:channel/:year/:month/:day', function(req, res)
{
  var ts = new Date(req.params.year, req.params.month-1, req.params.day, 0, 0, 0, 0).getTime()/1000;
  connection.query('SELECT * FROM irc_lines WHERE channel = ? AND time >= ? AND time < ? ORDER BY line_number ASC', [req.params.channel, ts, ts+86400], function(err, rows, fields)
  {
    res.render('logviewer.ejs', {date: ts, lines: rows});
  });
});

app.post('/admin', function(req, res)
{
  var auth = {"nick":req.body.nick,"signature":req.body.signature,"uid":req.body.uid};
  if(isAuthed(auth))
  {
    /*var opreq = http.request('http:'+config.checkLoginURL+"?op&u="+auth.uid+"&nick="+base64_encode(auth.nick), function(opres)
    {
      opres.on('data', function(chunk)
      {*/
        var group = req.body.group;
        if(config.admins.indexOf(group) != -1)
          res.render('admin.ejs', {config: config});
        else
        {
          res.status(403);
          //res.send("Wrong group: "+group);
          res.sendFile(__dirname + '/public/403.html');
        }
      /*});
    });
    opreq.on('error', function(e)
    {
      res.status(503);
      res.sendFile(__dirname + '/public/503.html');
    });*/
  }
  else
  {
    res.status(403);
    //res.send("Bad auth: "+auth);
    res.sendFile(__dirname + '/public/403.html');
  }
});

app.get('*', function(req, res)
{
  res.status(404);
  res.sendFile(__dirname + '/public/404.html');
});

app.use(function(err, req, res, next)
{
  res.status(500);
  res.render('500.ejs', {error: err, stack: err.stack});
});

var linenum = fs.readFileSync(config.curid, "utf-8");

function base64_encode(str)
{
  return new Buffer(str, 'utf8').toString('base64').replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ",");
}

function base64_decode(str)
{
  return new Buffer(str.replace(/-/g, "+").replace(/_/g, "/").replace(/,/g, "="), 'base64').toString('utf8');
}

function isAuthed(auth)
{
  try
  {
    var sig = auth.signature.split("|");
    if(sig[0] > getTime()-86400)
    {
      var hash = crypto.createHmac('sha512', [config.network,config.key,sig[0]].join(""));
      hash.update(auth.nick);
      var digest = hash.digest('hex');
      return digest === sig[1];
    }
    else return false;
  }
  catch(e)
  {
    return false;
  }
}

function getTime()
{
  return Math.floor(new Date().getTime()/1000);
}

io.on('connection', function(socket)
{
  var ip = socket.request.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
  var referer = socket.request.headers['referer'] || "THE GAME";

  socket.on('settings', function(data)
  {
    connection.query('SELECT * FROM irc_vars', function(err, rows, fields)
    {
      if(err) return;
      var settings = {};
      if(rows.length > 0)
      {
        for(i=0;i<rows.length;i++)
        {
          switch(rows[i].type)
          {
            case 3:
            case 5:
              settings[rows[i].name] = JSON.parse(rows[i].value);
              break;
            default:
              settings[rows[i].name] = rows[i].value;
          }
        }
      }
      settings.fileLimit = config.fileLimit;
      settings.checkLoginURL = config.checkLoginURL;
      settings.network = config.network;
      socket.emit('settings',settings);
    });
  });

  socket.on('lastlines', function(data)
  {
    connection.query('SELECT * FROM irc_lines WHERE channel = ? AND time >= ? ORDER BY line_number DESC LIMIT ?', [config.channel, Math.floor(new Date().getTime()/1000)-config.maxBacklog, data.lines], function(err, rows, fields)
    {
      if(err) return;
      if(rows.length > 0)
      {
        for(i=rows.length-1;i>=0;i--)
        {
          var row = rows[i];
          row.scroll = '';
          if(rows.length == 1)
          {
            row.scroll = 'normal';
          }
          else
          {
            row.scroll = 'no';
          }
          socket.emit(row.type,row);
        }
        if(rows.length > 1)
        {
          socket.emit("last_row",null);
        }
      }
    });

    connection.query('SELECT * FROM irc_channels WHERE chan = ?', [config.channel], function(err, rows, fields)
    {
      if(err) return;
      socket.emit('topics',rows[0]);
    });
  });

  socket.on('lastcurid', function(data)
  {
    connection.query('SELECT * FROM irc_lines WHERE channel = ? AND time >= ? AND line_number > ? ORDER BY line_number DESC', [config.channel, Math.floor(new Date().getTime()/1000)-config.maxBacklog, data.curid], function(err, rows, fields)
    {
      if(err) return;
      if(rows.length > 0)
      {
        for(i=rows.length-1;i>=0;i--)
        {
          var row = rows[i];
          row.scroll = '';
          if(rows.length == 1)
          {
            row.scroll = 'normal';
          }
          else
          {
            if(i > 0)
              row.scroll = 'no';
            else
              row.scroll = 'force';
          }
          socket.emit(rows[i].type,row);
        }
      }
    });

    connection.query('SELECT * FROM irc_channels WHERE chan = ?', [config.channel], function(err, rows, fields)
    {
      if(err) return;
      socket.emit('topics',rows[0]);
    });
  });

  socket.on('userlist', function(data)
  {
    connection.query('SELECT * FROM irc_users WHERE isOnline = 1 AND channel = ? ORDER BY username ASC', [config.channel], function(err, rows, fields)
    {
      if(err) return;
      socket.emit('userlist',{users: rows});
    });    
  });

  socket.on('auth', function(data)
  {
    var time = Math.floor(new Date().getTime()/1000);
    var hash = crypto.createHmac('sha512', [config.key,time,config.network].join(""));
    hash.update(referer);
    var digest = hash.digest('hex');
    socket.emit('auth', {checkLoginURL: config.checkLoginURL+"?sid="+digest+"|"+time+"&network="+config.network+"&jsoncallback=?"});
  });

  socket.on('message', function(data)
  {
    if(isAuthed(data.auth) && data.message && data.message != "")
    {
      var messages = data.message.trim().split("\n");
      for(i in messages)
      {
        var message = messages[i].trim();
        var action = data.action==1?"action":"message";
        var time = getTime();
        connection.query("UPDATE `irc_users` SET lastMsg = ? WHERE username = ? AND channel = ? AND online = ?", [time, data.auth.nick, config.channel, config.network]);
        connection.query("INSERT INTO `irc_outgoing_messages` (message,nick,channel,action,fromSource,type) VALUES ?", [[[message, data.auth.nick, config.channel, data.action, config.network, action]]]);
        connection.query("INSERT INTO `irc_lines` (name1,message,type,channel,time,online) VALUES ?", [[[data.auth.nick, message, action, config.channel, time, config.network]]], function(err, result)
        {
          if(err) return;
          fs.writeFileSync(config.curid, result.insertId);
        });
      }
    }
  });

  socket.on('join', function(data)
  {
    if(isAuthed(data.auth))
    {
      connection.query("INSERT INTO `irc_lines` (name1,type,channel,time,online) VALUES ?", [[[data.auth.nick, "join", config.channel, getTime(), config.network]]], function(err, result)
      {
        if(err) return;
        fs.writeFileSync(config.curid, result.insertId);
      });
    }
  });

  socket.on('part', function(data)
  {
    if(isAuthed(data.auth))
    {
      connection.query("INSERT INTO `irc_lines` (name1,type,channel,time,online) VALUES ?", [[[data.auth.nick, "part", config.channel, getTime(), config.network]]], function(err, result)
      {
        if(err) return;
        fs.writeFileSync(config.curid, result.insertId);
      });
    }
  });

  socket.on('file', function(data)
  {
    if(isAuthed(data.auth))
    {
      //console.log(data.info);
      var hash = crypto.createHash('sha1');
      hash.update(data.file);
      var digest = hash.digest('hex');

      connection.query('SELECT * FROM irc_uploads WHERE hash = ?', [digest], function(err, rows, fields)
      {
        if(err) return;
        if(rows.length > 0)
        {
          socket.emit('file',{"url": config.imgurl+rows[0].filename});
        }
        else
        {
          if(/^image\//.test(data.info.type) && data.info.size <= config.fileLimit)
          {
            filename = path.basename(data.info.name);
            var cont = false;
//          while(cont)
//          {
              connection.query('SELECT * FROM irc_uploads WHERE filename = ?', [filename], function(err, rows, fields)
              {
                if(err) return;
                if(rows.length > 0)
                {
                  filename = filename.replace(/(\D+)(-?\d*)(\.\D+)$/, function(str, m1, m2, m3)
                  {
                    if(m2)
                      var newstr = (Math.abs(+m2) + 1) + "";
                    else
                      var newstr = "1";
                    return m1 + newstr + m3;
                  });
                }
                else
                {
                  fs.writeFile('uploads/'+filename, data.file, function(err, fdata)
                  {
                    if(err) return;
                    connection.query("INSERT INTO `irc_uploads` (nick,filename,hash,time) VALUES ?", [[[data.auth.nick, filename, digest, getTime()]]], function(err, result)
                    {
                      socket.emit('file',{"url": config.imgurl+filename});
                    });
                  });
                  //cont = true;
                }
              });
            //}
          }
        }
      });
    }
  });
});

fs.watch(config.curid, function(event, filename)
{
  var line = fs.readFileSync(config.curid, "utf-8");
  if(event == 'change' && line != linenum && line != "")
  {
    connection.query('SELECT * FROM irc_lines WHERE channel = ? AND line_number > ? ORDER BY line_number ASC', [config.channel, linenum], function(err, rows, fields) {
      if(err) return;
      if(rows.length > 0)
      {
        for(i=0;i<rows.length;i++)
        {
          var row = rows[i];
          row.scroll = '';
          if(rows.length == 1)
          {
            row.scroll = 'normal';
          }
          else
          {
            if(i > 0)
              row.scroll = 'no';
            else
              row.scroll = 'force';
          }
          io.sockets.emit(rows[i].type,row);
        }
      }
    });
    linenum = line;
  }
});

process.on('SIGINT', function()
{
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");
  connection.end();
  process.exit();
});
