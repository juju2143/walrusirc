var laststamp = new Date();
var curid = 0;
var auth;

function scroll()
{
  $("body").animate({ scrollTop: $(document).height()-$(window).height() }, 500);
}

function color_of(name)
{
  var colors = [3, 4, 6, 8, 9, 10, 11, 12, 13];
  sum = 0;
  for(i=0;i<name.length;i++)
    sum += name.charCodeAt(i);
  return colors[sum%colors.length];
}

function msg(nick, message, timestamp)
{
  var text = "<li class=\"message\"><ul class=\"list-inline\"><li class=\"name c"+color_of(nick)+"\">";
  text += $("<div/>").text(nick).html();
  text += "</li><li class=\"msgbody\">";
  text += parseMessage(message);
  text += "</li><li class=\"timestamp small pull-right\">";
  var stamp = new Date(timestamp*1000);
  text += $("<span/>").text(stamp.toLocaleTimeString()).html();
  text += "</li></ul></li>";
  if(stamp.toLocaleDateString() != laststamp.toLocaleDateString())
    newDay(stamp);
  laststamp = stamp;
  $("#messages").append(text);
}

function action(nick, message, timestamp)
{
  var text = "<li class=\"message\"><ul class=\"list-inline\"><li>*</li><li class=\"name c"+color_of(nick)+"\">";
  text += $("<div/>").text(nick).html();
  text += "</li><li class=\"msgbody\">";
  text += parseMessage(message);
  text += "</li><li class=\"timestamp small pull-right\">";
  var stamp = new Date(timestamp*1000);
  text += $("<span/>").text(stamp.toLocaleTimeString()).html();
  text += "</li></ul></li>";
  if(stamp.toLocaleDateString() != laststamp.toLocaleDateString())
    newDay(stamp);
  laststamp = stamp;
  $("#messages").append(text);
}

function newDay(timestamp)
{
  var text = "<li class=\"message\"><ul class=\"list-inline text-center\"><li class=\"timestamp small\">";
  text += $("<span/>").text(timestamp.toLocaleDateString()).html();
  text += "</li></ul></li>";
  $("#messages").append(text);
}

var socket = io();

socket.on('message', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  msg(data.name1, data.message, data.time);
});

socket.on('action', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  action(data.name1, data.message, data.time);
});

socket.on('topics', function(data)
{
  $('#topic').html(parseMessage(data.topic,true));
});

socket.on('scroll', function(data)
{
  scroll();
});

socket.emit('auth', {});
socket.emit('lastlines', {lines: 100});

socket.on('reconnect', function(num)
{
  if(curid != 0)
    socket.emit('lastcurid', {curid: curid});
  if(auth.nick != "")
    socket.emit('join', {auth: auth});
});

socket.on('disconnect', function()
{
  if(auth.nick != "")
    socket.emit('part', {auth: auth});  
});

socket.on('auth', function(data)
{
  $.getJSON(data.checkLoginURL, function(data)
  {
    auth = data;
    if(auth.nick != "")
    {
      $("#inputmsg").prop("disabled", false);
      console.log("Hello, "+auth.nick);
      socket.emit('join', {auth: auth});
    }
    else
    {
      $("#inputmsg").prop("placeholder", "You need to login if you want to chat!");
    }
  });
});

$("#inputmsg").keypress(function(e)
{
  if(e.which == 13)
    $("#send").click();
});

$("#send").click(function(e)
{
  if($("#inputmsg").val() != "")
  {
    var message = $("#inputmsg").val().trim();
    var parts = message.split(" ");
    if(parts[0].substr(0,1) == '/')
    {
      if(parts[0].substr(1,1) == '/')
      {
        socket.emit('message', {message: message.substr(1), auth: auth, action: 0});      
      }
      else switch(parts[0].substr(1).toLowerCase())
      {
        case 'me':
          socket.emit('message', {message: message.substr(4), auth: auth, action: 1});
          break;
        case 'ponies':
          var fs = document.createElement("script");
          fs.onload = function()
          {
            Derpy();
          };
          fs.src = "http://juju2143.ca/mousefly.js";
          document.head.appendChild(fs);
          break;
      }
    }
    else
    {
      socket.emit('message', {message: message, auth: auth, action: 0});      
    }
    $("#inputmsg").val("");
  }
});
