var laststamp = new Date();

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
  text += $("<div/>").text(message).html();
  text += "</li><li class=\"timestamp small pull-right\">";
  var stamp = new Date(timestamp*1000);
  text += $("<div/>").text(stamp.toLocaleTimeString()).html();
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
  text += $("<div/>").text(message).html();
  text += "</li><li class=\"timestamp small pull-right\">";
  var stamp = new Date(timestamp*1000);
  text += $("<div/>").text(stamp.toLocaleTimeString()).html();
  text += "</li></ul></li>";
  if(stamp.toLocaleDateString() != laststamp.toLocaleDateString())
    newDay(stamp);
  laststamp = stamp;
  $("#messages").append(text);
}

function newDay(timestamp)
{
  var text = "<li class=\"message\"><ul class=\"list-inline text-center\"><li class=\"timestamp small\">";
  text += $("<div/>").text(timestamp.toLocaleDateString()).html();
  text += "</li></ul></li>";
  $("#messages").append(text);
}

var socket = io();

socket.on('message', function(data){
  msg(data.name1, data.message, data.time);
});

socket.on('action', function(data){
  action(data.name1, data.message, data.time);
});

socket.on('topics', function(data){
  $('#topic').text(data.topic);
  //$('#topic').linkify();
});

socket.on('scroll', function(data){
  scroll();
});

socket.emit('conn', {lines: 100});
