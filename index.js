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

tray = new gui.Tray({ icon: "assets/images/iconb.png", iconsAreTemplates: false });
tray.menu = menu;

var tasks = [];

//Notify every hour. 
setInterval(function setdisplayreminder()
{
	displayreminder=1;
}, 3600000);

//Check GitHub every 5 minutes. 
setInterval(function checkcommits()
{
	check();
}, 60000*5);

check();

/**
 * Changes the tray icon.
 * @param  {string} color r for red, or b for blue.
 */
function makemenu(color)
{
	if (tray !== null)
	{
		tray.remove();
	}
	tray = new gui.Tray({ icon: "assets/images/icon" + color + ".png",  iconsAreTemplates: false  });
	tray.menu = menu;
}

/**
 * Display the commit reminder.
 */
function remind()
{
	var options = {
  		icon: "assets/images/icon38.png",
  		body: "Don't forget to commit today!"
 	};

	var notification = new Notification("GithubContrib", options);
}

/**
 * Checks GitHub for commits. 
 */
function check()
{
	//Download the contributions SVG to .download.svg.
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

	//Parse the SVG to find today's commits. 
	tasks.push(function(done)
	{
		svg.fromSvgDocument("./.download.svg", function(err, svg)
		{
			if (err)
			{
				done("SVG file not found or invalid.");
				return;
			}

			var json = svg.toJSON();
			
			commits = jsonselect.match('.type:val("rect") ~ .data', json);

			fs.unlinkSync('./.download.svg');

			done(null, commits);
		});
	});

	async.series(tasks, function(err, results)
	{
		if (err)
		{
			console.log(err);
			return;
		}

		//Grab the second result from the tasks. 
		commits=results[1];

		//Is the number of commits today greater than 0? 
		committedtoday=(commits[commits.length-1].count>0);
	
		if (committedtoday)
		{
			//Only update the tray icon if there's a change. 
			if (tray.icon.indexOf("b")==-1) makemenu("b");
		}
		else
		{
			if (tray.icon.indexOf("r")==-1) makemenu("r");

			//Only display reminder if it's time. 
			if (displayreminder)
			{
				displayreminder=0;
				remind();
			}
		}
	});
}
