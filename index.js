var async = require("async");
var svg = require("svgutils").Svg;
var jsonselect = require("jsonselect");
var https = require("https");
var fs = require("fs");

var gui = require('nw.gui');

var tray;
var displayreminder=1;
var committedtoday;

var username="octalmage";

// Give it a menu
var menu = new gui.Menu();
menu.append(new gui.MenuItem({label: 'Exit', click: function() 
{
    gui.App.quit();
}, }));

tray = new gui.Tray({ icon: "assets/images/iconb.png" });
tray.menu = menu;

var tasks = [];

//Notify every hour. 
setInterval(function setdisplayreminder()
{
	displayreminder=1;
}, 3600000);

//Check GitHub every 10 minutes. 
setInterval(function checkcommits()
{
	check();
}, 60000*5);

check();

function makemenu(color)
{
	if (tray!=null)
	{
		tray.remove();
	}
	tray = new gui.Tray({ icon: "assets/images/icon" + color + ".png" });
	tray.menu = menu;
}

function remind()
{
	var options = {
  		icon: "assets/images/icon38.png",
  		body: "Don't forget to commit today!"
 	};

	var notification = new Notification("GithubContrib", options);
}

function check()
{
	tasks.push(function(done)
	{
		var request = https.get("https://github.com/users/" + username + "/contributions/", function(response)
		{

			var file = fs.createWriteStream(".download.svg");
			response.pipe(file);

			file.on("finish", function()
			{
				done();
			});
		});
	});

	tasks.push(function(done)
	{
		svg.fromSvgDocument("./.download.svg", function(err, svg)
		{
			if (err)
			{
				throw new Error("SVG file not found or invalid.");
			}

			var json = svg.toJSON();

			commits = jsonselect.match('.type:val("rect") ~ .data', json);

			fs.unlinkSync('./.download.svg');

			done(commits);
		});
	});

	async.series(tasks, function(re)
	{
		oldcommittedtoday=committedtoday;
		committedtoday=(re[re.length-1].count>0)

		if (oldcommittedtoday==committedtoday) return;

		if (committedtoday)
		{
			makemenu("b");
		}
		else
		{
			makemenu("r");
			if (displayreminder)
			{
				displayreminder=0;
				remind();
			}
		}
	});
}