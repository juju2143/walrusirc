// WalriiHack.js
// by Cumred_Snektron
// http://quantuminfinity.space/WalriiHack/

var first = false;
if (typeof walriis === 'undefined')
{
	var walriis = [];
	var collide = true;
	var ms;
	var idcounter = 0;
	first = true;
}

function init(fps)
{
	for (var i = 0; i < 10; i++)
	{
		var s = Math.random() * 3 + 2;
		var r = Math.random() * Math.PI * 2;
		walriis.push(new Walrii(Math.random()*(window.innerWidth - 24), Math.random()* (window.innerHeight - 25), s * Math.cos(r), s * Math.sin(r)));
	}

	if (first)
		setInterval(update, 1000/fps);
}

function update()
{		
	for (var i=0;i<walriis.length;i++)
		walriis[i].update();
}

function Walrii(x, y, vx, vy)
{
	this.id = idcounter++;
	this.x = x;
	this.y = y;
	this.vx = vx;
	this.vy = vy;
	this.img = document.createElement("img");
	this.img.src = "http://codewalr.us/other/flyingwalrii.gif";
	this.img.width = 24;
	this.img.height = 25;
	this.img.alt = "FlyringWalrii";
	this.img.style.position = "fixed";
	this.img.style.left =  Math.round(this.x)+"px";	
	this.img.style.top =   Math.round(this.y)+"px";
	document.body.appendChild(this.img);
	
	this.update = function()
	{
		this.x += this.vx;
		this.y += this.vy;
		this.vx *= ((this.x < 0 && this.vx < 0) || (this.x + 24 > window.innerWidth && this.vx > 0)) ? -1 : 1;
		this.vy *= ((this.y < 0  && this.vy < 0) || (this.y + 25 > window.innerHeight && this.vy > 0)) ? -1 : 1;
		if (collide)
			this.collide();
		this.img.style.left =  Math.round(this.x)+"px";
		this.img.style.top =   Math.round(this.y)+"px";
	}
	
	this.collide = function()
	{
		for (var i=0;i<walriis.length;i++)
		{
			walrii = walriis[i];
			if (walrii.id != this.id && this.intersects(walrii))
			{
				var s = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
				this.vx = this.x - walrii.x;
				this.vy = this.y - walrii.y;
				s *= Math.sqrt(this.vx * this.vx + this.vy * this.vy);
				this.vx /= s;
				this.vy /= s;
			}
		}
	}
	
	this.intersects = function(walrii)
	{
		return !(walrii.x 	   > this.x + 24 || 
				 walrii.x + 24 < this.x || 
				 walrii.y 	   > this.y + 25 ||
				 walrii.y + 25 < this.y);
	}
}

init(60);
