var laststamp = new Date();
var curid = 0;
var auth;
var users = [];
var lines = [];
var settings = {};
var readline = [];
var curreadline = 0;
var curline = "";

var scrollbackLines = 100;

$.fn.insertText = function(text)
{
  var caretPos = $(this)[0].selectionStart;
  var textArea = $(this).val();
  $(this).val(textArea.substring(0, caretPos)+text+textArea.substring(caretPos));
};

function scroll()
{
  if ($(document).height() >= $(window).height())
    $("body,html").animate({scrollTop: $(document).height()-$(window).height()}, 200);
}

function scrollSmart()
{
  if($(document).height()-$(document).scrollTop()-$(window).height() <= $("#messages tr:last").height()+1)
    scroll()
}

function color_of(name)
{
  var colors = [19, 20, 22, 24, 25, 26, 27, 28, 29];
  sum = 0;
  for(i=0;i<name.length;i++)
    sum += name.charCodeAt(i);
  return colors[sum%colors.length];
}

function msg(nick, message, timestamp, scrollFlag)
{
  var highlighted = false;
  if(auth && auth.nick != "")
    highlighted = new RegExp("(\\b|\x02|\x03[0-9]{0,2}(,[0-9]{0,2})?|\x0f|\x16|\x1d|\x1f)"+auth.nick+'(\\b|\x02|\x03|\x0f|\x16|\x1d|\x1f)','gi').test(message);
  var stamp = new Date(timestamp*1000);
  var text = "<tr class=\"message"+(highlighted?" danger":"")+"\"><td class=\"name text-right c"+color_of(nick)+"\">"
           + /*$("<div/>").text(*/nick.replace(/\s/g,"\xa0")/*).html()*/
           + "</td><td class=\"msgbody\">"
           + parseMessage(message, false, localStorage.disableSmileys?JSON.parse(localStorage.disableSmileys):false)
           + "</td><td class=\"timestamp small text-right\">"
           + $("<span/>").text(stamp.toLocaleTimeString().replace(/\s/g,"\xa0")).html()
           + "</td></tr>";
  if(stamp.toLocaleDateString() != laststamp.toLocaleDateString())
    newDay(stamp);
  laststamp = stamp;
  $("#messages").append(text);
  switch(scrollFlag)
  {
    case 'normal':
      scrollSmart();
      break;
    case 'force':
      scroll();
      break;
    default:
  }
}

function action(nick, message, timestamp, scrollFlag)
{
  var highlighted = false;
  if(auth && auth.nick != "")
    highlighted = new RegExp("(\\b|\x02|\x03[0-9]{0,2}(,[0-9]{0,2})?|\x0f|\x16|\x1d|\x1f)"+auth.nick+'(\\b|\x02|\x03|\x0f|\x16|\x1d|\x1f)','gi').test(message);
  var stamp = new Date(timestamp*1000);
  var text = "<tr class=\"message\"><td class=\"text-right\">*</td><td class=\"msgbody\"><span class=\"name c"+color_of(nick)+"\">"
           + /*$("<div/>").text(*/nick.replace(/\s/g,"\xa0")/*).html()*/
           + "</span> "
           + parseMessage(message, false, localStorage.disableSmileys?JSON.parse(localStorage.disableSmileys):false)
           + "</td><td class=\"timestamp small text-right\">"
           + $("<span/>").text(stamp.toLocaleTimeString().replace(/\s/g,"\xa0")).html()
           + "</td></tr>";
  if(stamp.toLocaleDateString() != laststamp.toLocaleDateString())
    newDay(stamp);
  laststamp = stamp;
  $("#messages").append(text);
  switch(scrollFlag)
  {
    case 'normal':
      scrollSmart();
      break;
    case 'force':
      scroll();
      break;
    default:
  }
}

function newDay(timestamp)
{
  var text = "<tr class=\"message\"><td colspan=\"3\" class=\"text-center timestamp small\">"
           + $("<span/>").text(timestamp.toLocaleDateString()).html()
           + "</td></tr>";
  $("#messages").append(text);
  scrollSmart();
}

function loadOptions()
{
  if(typeof(Storage) !== "undefined")
  {
    scrollbackLines = localStorage.scrollbackLines?parseInt(localStorage.scrollbackLines):100;
    $("#scrollback-lines").val(scrollbackLines);
    $("#smileys-enable").prop('checked', localStorage.disableSmileys?JSON.parse(localStorage.disableSmileys):false);
  }
  else
  {
    $("#optionsmenu").html("<li>Sorry, your browser does not support web storage...</li>");
  }
}

function isValidDate(d)
{
  if(Object.prototype.toString.call(d) !== "[object Date]")
    return false;
  return !isNaN(d.getTime());
}

var p = window.location.pathname;
var socket = io('', {path: p.slice(0,p.lastIndexOf('/')+1)+'socket.io/'});

loadOptions();
socket.emit('settings', {});
socket.emit('auth', {});

socket.on('message', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  msg(data.name1, data.message, data.time, data.scroll);
  lines[lines.length] = data;
  if(data.name1 == auth.nick && data.Online == 1)
    readline[readline.length] = data;
  if(curreadline != readline.length-1)
    curreadline = readline.length;
});

socket.on('action', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  action(data.name1, data.message, data.time, data.scroll);
  lines[lines.length] = data;
  if(data.name1 == auth.nick && data.Online == 1)
    readline[readline.length] = data;
  if(curreadline != readline.length-1)
    curreadline = readline.length;
});

socket.on('topic', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  action(data.name1, "has changed the topic to "+data.message, data.time, data.scroll);
  $('#topic').html(parseMessage(data.message,true));
  lines[lines.length] = data;
});

socket.on('join', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  if(data.Online != 1)
    action(data.name1, "has joined the channel", data.time, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('part', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  if(data.Online != 1)
    action(data.name1, "has left the channel", data.time, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('quit', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  action(data.name1, "has quit IRC ("+data.message+")", data.time, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('kick', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  action(data.name1, "has kicked "+data.name2+" ("+data.message+")", data.time, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('mode', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  action(data.name1, "set mode "+data.message, data.time, data.scroll);
  lines[lines.length] = data;
});

socket.on('nick', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  action(data.name1, "has changed their nick to "+data.name2, data.time, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('topics', function(data)
{
  $('#topic').html(parseMessage(data.topic,true));
});

socket.on('reconnect', function(num)
{
  if(curid != 0)
    socket.emit('lastcurid', {curid: curid});
  //if(auth.nick != "")
  //  socket.emit('join', {auth: auth});
  socket.emit('userlist', {});
  $("#inputmsg").prop("placeholder", "Type here...");
  if(auth.nick != "")
    $("#inputmsg").prop("disabled", false);
  else
    $("#inputmsg").prop("placeholder", "You need to login if you want to chat!");
});


socket.on('disconnect', function()
{
  //if(auth.nick != "")
  //  socket.emit('part', {auth: auth});  
  $("#inputmsg").prop("placeholder", "WalrusIRC has been disconnected. Reconnecting...");
  $("#inputmsg").prop("disabled", true);
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
      //socket.emit('join', {auth: auth});
    }
    else
    {
      $("#inputmsg").prop("placeholder", "You need to login if you want to chat!");
    }
    socket.emit('lastlines', {lines: scrollbackLines});
    socket.emit('userlist', {});
  });
});

socket.on('userlist', function(data)
{
  var words = [];
  users = data.users;
  $("#userlist").html("");
  for(i=0;i<users.length;i++)
  {
    var user = $("<span/>").text(users[i].username).html();
    $("#userlist").append("<li><a onclick=\"$('#inputmsg').insertText('"+user+"')\">"+user+"</a></li>");
    words[words.length] = users[i].username;
  }
  $("#inputmsg").tabcomplete(words, {hint: "none", after: " "});
});

socket.on('settings', function(data)
{
  settings = data;
  $.each(settings.smileys, function(index, smiley)
  {
    if(smiley.inMenu)
      $("#smileylist").append("<img src=\""+smiley.pic+"\" alt=\""+smiley.alt+"\" onclick=\"$('#inputmsg').insertText(' "+smiley.code+" ')\" /> ");
    if(index%10 == 9)
      $("#smileylist").append("<br/>");
  });
});

socket.on('file', function(data)
{
  $('#inputmsg').insertText(data.url);
});

$("#inputmsg").keydown(function(e)
{
  if(e.which == 13)
    $("#send").click();
  if(e.which == 38)
  {
    if(curreadline == readline.length)
      curline = $('#inputmsg').val();
    if(curreadline != 0)
      curreadline--;
    $('#inputmsg').val(readline[curreadline].message);
  }
  if(e.which == 40)
  {
    if(curreadline != readline.length)
      curreadline++;
    if(curreadline != readline.length)
      $('#inputmsg').val(readline[curreadline].message);
    else
      $('#inputmsg').val(curline);
  }
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
        case 'walrii':
          var fs = document.createElement("script");
          fs.src = "http://quantuminfinity.net/WalriiHack/WalriiHack.js";
          document.head.appendChild(fs);
          break;
      }
    }
    else
    {
      socket.emit('message', {message: message, auth: auth, action: 0});      
    }
    $("#inputmsg").val("");
    scroll();
  }
});

$('.dropdown-menu').find('.input-group').click(function(e)
{
  e.stopPropagation();
});

$('.dropdown-submenu > a').submenupicker();

$('#scrollback-lines').change(function()
{
  localStorage.scrollbackLines = $('#scrollback-lines').val();
});

$('#smileys-enable').change(function()
{
  localStorage.disableSmileys = $('#smileys-enable').is(':checked');
});

$('#view-logs').click(function()
{
  var stamp = new Date(Date.parse($("#logs-date").val()));
  if(isValidDate(stamp))
  {
    location.replace("logs/0/"+stamp.getUTCFullYear()+"/"+(stamp.getUTCMonth()+1)+"/"+stamp.getUTCDate());
  }
});

$('#inputmsg').on("dragover", function(){return false;});
$('#inputmsg').on("dragend", function(){return false;});
$('#inputmsg').on("drop", function(e)
{
	e.preventDefault();
	e.stopPropagation();
	e = e.originalEvent || e;
	var file = (e.files || e.dataTransfer.files)[0],
	reader = new FileReader();
	reader.onload = function(event)
        {
    		console.log(file);
                if(auth && auth.nick != "")
                  socket.emit('file', { auth: auth,
					info: {
						lastModified: file.lastModified,
						lastModifiedDate: file.lastModifiedDate,
						name: file.name,
						size: file.size,
						type: file.type
					},
					file: event.target.result
                                      });
  	};
	if(/^image\//.test(file.type) && file.size <= (settings.fileLimit||131072))
		reader.readAsArrayBuffer(file);
});
