var laststamp = new Date();
var curid = 0;
var auth;
var users = [];
var lines = [];
var settings = {};
var readline = [];
var curreadline = 0;
var curline = "";
var titleOn = false;
var titleHighlight = false;
var realTitle = "";
var scrollbackLines = 100;
var notificationsEnabled = false;
var previousScrollTop = 0;
var hasScrolledUp = false;
var animateScroll = false;

$.fn.insertText = function(text)
{
  var caretPos = $(this)[0].selectionStart;
  var textArea = $(this).val();
  $(this).val(textArea.substring(0, caretPos)+text+textArea.substring(caretPos));
};

function scroll()
{
  if ($(document).height() >= $(window).height())
    if($('#animateScroll-enable').is(':checked'))
      $("body,html").animate({scrollTop: $(document).height()-$(window).height()}, 200);
    else
      $("body,html").scrollTop($(document).height()-$(window).height());

  hasScrolledUp = false;
}

function scrollSmart()
{
  if(!hasScrolledUp)
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

function msg(nick, message, timestamp, isAction, scrollFlag, isLink)
{
  var highlighted = false;
  if(auth && auth.nick != "")
    highlighted = new RegExp("(\\b|\x02|\x03[0-9]{0,2}(,[0-9]{0,2})?|\x0f|\x16|\x1d|\x1f)"+auth.nick+'(\\b|\x02|\x03|\x0f|\x16|\x1d|\x1f)','gi').test(message);
  if(highlighted && !document.hasFocus() && scrollFlag != "no")
  {
    if($('#notifications-enable').is(':checked'))
    {
      if(titleHighlight)
      {
        clearInterval(titleHighlight);
        titleHighlight = false;
      }
      titleHighlight = setInterval(function(){poke(nick)}, 1000);
    }
    if(notificationsEnabled)
    {
      var n = new Notification(nick, {body: message, tag: "WalrusIRCMessage", icon: "logo.png"});
      n.onshow = function () { 
        setTimeout(n.close.bind(n), 15000); 
      }
    }
  }
  var stamp = new Date(timestamp*1000);
  if(isAction)
  {
    var text = "<tr class=\"message"+(highlighted?" danger":"")+((isLink&&nick==auth.nick)?" ownmessage":"")+" "+nick+" action\"><td class=\"text-right\">*</td><td class=\"msgbody\">";
    if(isLink) text += "<a href=\""+settings.checkLoginURL+"?ul="+nick+"\" target=\"_top\">";
        text+= "<span class=\"name c"+color_of(nick)+"\">"+/*$("<div/>").text(*/nick.replace(/\s/g,"\xa0")/*).html()*/+"</span> ";
    if(isLink) text+= "</a>";
  }
  else
  {
    var text = "<tr class=\"message"+(highlighted?" danger":"")+((isLink&&nick==auth.nick)?" ownmessage":"")+" "+nick+"\"><td class=\"name text-right c"+color_of(nick)+"\">";
    if(isLink) text += "<a href=\""+settings.checkLoginURL+"?ul="+nick+"\" class=\"c"+color_of(nick)+"\" target=\"_top\">";
        text+= /*$("<div/>").text(*/nick.replace(/\s/g,"\xa0")/*).html()*/;
    if(isLink) text += "</a>";
        text+= "</td><td class=\"msgbody\">";
  }
  text+= parseMessage(message, false, localStorage.disableSmileys?JSON.parse(localStorage.disableSmileys):false)
       + "</td><td class=\"timestamp small text-right\">"
       + $("<span/>").text(stamp.toLocaleTimeString().replace(/\s/g,"\xa0")).html()
       + "</td></tr>";
  if(stamp.toLocaleDateString() != laststamp.toLocaleDateString())
    newDay(stamp);
  laststamp = stamp;
  var line = $(text);
  $("#messages").append(line);
  line.click(function()
  {
    for(var i=0; i<Opentip.tips.length; i++)
      Opentip.tips[i].hide();
  });
  line.find('img').load(function(e)
  {
    scrollSmart();
  });
  line.find('a').each(newTip);

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
    $("#notifications-enable").prop('checked', localStorage.notifications?JSON.parse(localStorage.notifications):false);
    $("#animateScroll-enable").prop('checked', localStorage.animateScroll?JSON.parse(localStorage.animateScroll):false);
    if(localStorage.theme)
      loadTheme(localStorage.theme);
    else
      if(window.frameElement)
        if($(window.frameElement).data("theme"))
          loadTheme($(window.frameElement).data("theme"), true);
    if($('#notifications-enable').is(':checked'))
    {
      if(window.Notification && Notification.permission !== "granted") {
        Notification.requestPermission(function (status) {
          if(Notification.permission !== status) {
            Notification.permission = status;
          }
          if(Notification.permission === "granted") notificationsEnabled = true;
        });
      }
      if(Notification.permission === "granted") notificationsEnabled = true;
    }
  }
  else
  {
    $("#optionsmenu").html("<li>Sorry, your browser does not support web storage...</li>");
  }
  $.getJSON("themes/themes.json", function(data)
  {
    data.forEach(function(i){
      $("#themesmenu").append('<li><a href="#" onclick="loadTheme(\''+i.file+'\');scroll()">'+i.name+'</a></li>');
    });
  });
}

function isValidDate(d)
{
  if(Object.prototype.toString.call(d) !== "[object Date]")
    return false;
  return !isNaN(d.getTime());
}

function loadTheme(t)
{
  if(typeof(Storage) !== "undefined" && !temp)
    localStorage.theme = t;
  $("#theme").prop("href", "themes/"+t+".css");
}

function defaultTheme()
{
  if(typeof(Storage) !== "undefined" && !temp)
    localStorage.theme = undefined;
}
function poke(who)
{
  var thetitle;
  if(titleOn)
    top.document.title = who + " poked you on IRC!"
  else
    top.document.title = realTitle;
  titleOn = !titleOn;
}

function newTip()
{
  Opentip.styles.picture = {
    fixed: true,
    tipJoint: "left",
    removeElementsOnHide: true,
    target: true
  };
  Opentip.styles.youtube = {
    fixed: true,
    tipJoint: "left",
    removeElementsOnHide: true,
    hideTrigger: "closeButton",
    target: true
  };
  var href = $(this)[0].href;
  var regexes = [];
  regexes[0] = /(?:youtube\.com\/\S*(?:(?:\/e(?:mbed))?\/|watch\?(?:\S*?&?v\=))|youtu\.be\/)([a-zA-Z0-9_-]{6,11})/g; // YouTube
  regexes[1] = /\.(jpe?g|gif|png|bmp)$/gi; // pictures
  if(regexes[0].test(href))
  {
    regexes[0].test(href);
    var yid = regexes[0].exec(href)[1];
    $(this).opentip('<iframe width="256" height="144" src="https://www.youtube.com/embed/'+yid+'" frameborder="0" allowfullscreen></iframe>', {style: "youtube"});
  }
  else if(regexes[1].test(href))
  {
    $(this).opentip('<img src="'+href+'" style="max-height: 144px; max-width: 512px" />', {style: "picture"});
  }
}

function admin()
{
  $.getJSON(settings.checkLoginURL+"?op&u="+auth.uid+"&nick="+btoa(auth.nick).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, ","), function(data)
  {
    var form = $('<form action="admin" method="post">'+
                 '<input type="hidden" name="nick" value="'+auth.nick+'">'+
                 '<input type="hidden" name="signature" value="'+auth.signature+'">'+
                 '<input type="hidden" name="uid" value="'+auth.uid+'">'+
                 '<input type="hidden" name="group" value=\''+data.group+'\'>'+
                 '</form>');
    $('body').append(form);
    form.submit();
  });
}

var p = window.location.pathname;
var socket = io('', {path: p.slice(0,p.lastIndexOf('/')+1)+'socket.io/'});

$(document).ready(function(){
  realTitle = top.document.title;
  loadOptions();
  socket.emit('settings', {});
  socket.emit('auth', {});
});

socket.on('message', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  msg(data.name1, data.message, data.time, false, data.scroll, data.Online == settings.network);
  lines[lines.length] = data;
  if(data.name1 == auth.nick && data.Online == settings.network)
    readline[readline.length] = data;
  if(curreadline != readline.length-1)
    curreadline = readline.length;
});

socket.on('action', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  msg(data.name1, data.message, data.time, true, data.scroll, data.Online == settings.network);
  lines[lines.length] = data;
  if(data.name1 == auth.nick && data.Online == settings.network)
    readline[readline.length] = data;
  if(curreadline != readline.length-1)
    curreadline = readline.length;
});

socket.on('topic', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  msg(data.name1, "has changed the topic to "+data.message, data.time, true, data.scroll);
  $('#topic').html(parseMessage(data.message,true));
  lines[lines.length] = data;
});

socket.on('join', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  if(data.Online != 1)
    msg(data.name1, "has joined the channel", data.time, true, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('part', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  if(data.Online != 1)
    msg(data.name1, "has left the channel", data.time, true, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('quit', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  msg(data.name1, "has quit IRC ("+data.message+")", data.time, true, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('kick', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  msg(data.name1, "has kicked "+data.name2+" ("+data.message+")", data.time, true, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('mode', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  msg(data.name1, "set mode "+data.message, data.time, true, data.scroll);
  lines[lines.length] = data;
});

socket.on('nick', function(data)
{
  if(data.line_number)
    curid = data.line_number;
  msg(data.name1, "has changed their nick to "+data.name2, data.time, true, data.scroll);
  socket.emit('userlist', {});
  lines[lines.length] = data;
});

socket.on('topics', function(data)
{
  $('#topic').html(parseMessage(data.topic,true));
});

socket.on('reconnect', function(num)
{
  if(!auth)
  {
    $("#messages").append("<tr class='message'><td></td><td><span style='color: red;'>You are either not authenticated or you are affected by a bug. Click <a href='javascript:localStorage.clear();location.reload();'>here</a> to fix it.</span></td><td></td></tr>");
    $("body,html").scrollTop($(document).height()-$(window).height());
  }
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
  $('#inputmsg').insertText(encodeURI(data.url));
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
          fs.src = "lib/derpy/mousefly.js";
          document.body.appendChild(fs);
          break;
        case 'walrii':
          var fs = document.createElement("script");
          fs.src = "lib/WalriiHack.js";
          document.body.appendChild(fs);
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

$('#notifications-enable').change(function()
{
  localStorage.notifications = $('#notifications-enable').is(':checked');
  if($('#notifications-enable').is(':checked'))
  {
    if(window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission(function (status) {
        if(Notification.permission !== status) {
          Notification.permission = status;
        }
        if(Notification.permission === "granted") notificationsEnabled = true;
      });
    }
    if(Notification.permission === "granted") notificationsEnabled = true;
  }
  else
  {
    notificationsEnabled = false;
  }
});

$('#animateScroll-enable').change(function()
{
  localStorage.animateScroll = $('#animateScroll-enable').is(':checked');
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

var resizeTimer;
$(window).resize(function()
{
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(scroll, 100);
}).focus(function()
{
  if(titleHighlight)
  {
    clearInterval(titleHighlight);
    titleHighlight = false;
    top.document.title = realTitle;
  }
}).scroll(function()
{
  var st = $(document).scrollTop();

  if (st < previousScrollTop)
  {
    hasScrolledUp = true;
  }
  else if (st == $(document).height() - $(window).height())
  {
    hasScrolledUp = false;
  }

  previousScrollTop = st;
});

$("#clear-storage-btn").click(function()
{
  localStorage.clear();
  location.reload();
});
