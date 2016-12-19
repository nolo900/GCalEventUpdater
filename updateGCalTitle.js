

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var eventID = process.argv[2];
var newTitle = process.argv[3];
var startDateTime = process.argv[4];
var endDateTime = process.argv[5];
var calID = "austinbmiles.com_isc8j69dhqij1sncqefgd9b02o@group.calendar.google.com";

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/updateGCalTitle-nodejs.json
var SCOPES = ['https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
	process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'updateGCalTitle-nodejs.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
	if (err) {
		console.log('Error loading client secret file: ' + err);
		return;
	}
	// Authorize a client with the loaded credentials, then call the
	// Google Calendar API.
	//authorize(JSON.parse(content), listEvents);

	if (process.argv.length === 6){
		authorize(JSON.parse(content), updateCalendarEventWithDatetimes);
	} else if (process.argv.length === 4){
		authorize(JSON.parse(content), updateCalendarEvent);
	} else {
		console.log("Incorrect params. Here's some event IDs to work with...");
		authorize(JSON.parse(content), listEvents);
		displayUsageHints();
	}

});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
	var clientSecret = credentials.installed.client_secret;
	var clientId = credentials.installed.client_id;
	var redirectUrl = credentials.installed.redirect_uris[0];
	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, function(err, token) {
		if (err) {
			getNewToken(oauth2Client, callback);
		} else {
			oauth2Client.credentials = JSON.parse(token);
			callback(oauth2Client);
		}
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
	});
	console.log('Authorize this app by visiting this url: ', authUrl);
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question('Enter the code from that page here: ', function(code) {
		rl.close();
		oauth2Client.getToken(code, function(err, token) {
			if (err) {
				console.log('Error while trying to retrieve access token', err);
				return;
			}
			oauth2Client.credentials = token;
			storeToken(token);
			callback(oauth2Client);
		});
	});
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
	try {
		fs.mkdirSync(TOKEN_DIR);
	} catch (err) {
		if (err.code != 'EEXIST') {
			throw err;
		}
	}
	fs.writeFile(TOKEN_PATH, JSON.stringify(token));
	console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
	var calendar = google.calendar('v3');
	calendar.events.list({
		auth: auth,
		calendarId: calID,
		timeMin: (new Date()).toISOString(),
		maxResults: 10,
		singleEvents: true,
		orderBy: 'startTime'
	}, function(err, response) {
		if (err) {
			console.log('The API returned an error: ' + err);
			return;
		}
		var events = response.items;
		if (events.length == 0) {
			console.log('No upcoming events found.');
		} else {
			console.log('Upcoming 10 events:');
			for (var i = 0; i < events.length; i++) {
				var event = events[i];
				var start = event.start.dateTime || event.start.date;
				console.log('START: %s | DESC: %s | EVENTID: %s', start, event.summary, event.id);
			}
		}
	});
}

function updateCalendarEvent(auth){
	var calendar = google.calendar('v3');
	calendar.events.patch({
		auth: auth,
		calendarId: calID,
		eventId: eventID,
		resource:{
			summary: newTitle
		}

	}, function (err, response) {
		console.log("MODIFIED EVENT OBJECT: ",response);
		console.log("#of argv: ", process.argv.length - 2);
		console.log(new Date(Date.now()).toISOString());
		if (err){
			console.log("The API returned an error: " + err);
			displayUsageHints();
		} else {
			console.log("Event updated successfully. New Title: \"" + response.summary + "\"");
		}
	});
}

function updateCalendarEventWithDatetimes(auth){
	var calendar = google.calendar('v3');
	calendar.events.patch({
		auth: auth,
		calendarId: calID,
		eventId: eventID,
		resource:{
			summary: newTitle,
			start: {
				//dateTime: "2016-12-07T19:30:00-05:00"
				dateTime: startDateTime
			},
			end: {
				dateTime: endDateTime
				//dateTime: "2016-12-07T20:30:00-05:00"
				//dateTime: new Date(Date.now()).toISOString()
			},
		}

	}, function (err, response) {
		console.log("MODIFIED EVENT OBJECT: ",response);
		if (err){
			console.log("The API returned an error: " + err);
			displayUsageHints();
		} else {
			console.log("Event updated successfully. New Title: \"" + response.summary + "\"");
		}
	});
}

function displayUsageHints() {
	console.log('--------------------------- USAGE HINTS -------------------------------');
	console.log('node updateGCalTitle.js eventID newTitle [startDatetime endDatetime]');
	console.log('** Datetime must be in ISO format: "2016-12-07T20:30:00-05:00" **');
	console.log('-----------------------------------------------------------------------');
}