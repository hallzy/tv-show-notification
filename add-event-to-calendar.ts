// If you are unsure if a show will be recognized, check to see what data is
// given by going to:
// http://api.tvmaze.com/singlesearch/shows?q=TV SHOW NAME&embed=episodes
// by replacing "TV SHOW NAME" with the name of the TV show


// ************************************
// ***  BEGIN CONFIGURABLE OPTIONS  ***
// ************************************

// For a sheet with
// URL = https://docs.google.com/spreadsheets/d/1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I/edit#gid=0
// Change these variables variable
const SPREADSHEET_ID : any = "FILL THIS";

const API_TOKEN : any = ""

// If true, then no emails are sent, and don't create new calendar events
const TESTING : any = false;

// If true, then you will receive the full debug log as an email
const DEBUG : any = false;

// If true, then you will receive email alerts for when show episodes are added
// to your calendar
const ADDED_EPISODE_ALERT : any = false;

// If true, then check for updates to this script on github
const SCRIPT_AUTO_UPDATE_CHECK : any = false;

// Specify the github branch to check for updates for. This has no effect if
// SCRIPT_AUTO_UPDATE_CHECK is disabled
const BRANCH_TO_CHECK_FOR_UPDATES : any = "master";

// Specify the calendar to add calendar events to. If left empty it will use
// your account's default calendar.
const CALENDAR_ID : any = "";

// If true, then you will get email alerts when the status of a show has changed
// (ie, if it was running but has now been cancelled)
const GET_STATUS_CHANGE_ALERT : any = false;

// Emails in this folder (label) will be parsed for new tv show names. The email
// must have each show on a new line, and each of those will be automatically
// added to your spreadsheet when the script runs
const MYLABEL : any = "TV Show Script";

// **********************************
// ***  END CONFIGURABLE OPTIONS  ***
// **********************************

const NOW : Date = new Date();

// Global Variable
var SHEET               : GoogleSheet;
var EPISODE_API         : EpisodeAPI;
var SHOW_SIMILARITY_API : ShowSimilarityAPI;
var ADDED_TO_CALENDAR   : string[];
var CALENDAR            : GoogleAppsScript.Calendar.Calendar
var LABEL               : GoogleAppsScript.Gmail.GmailLabel;

// Modifying default object prototypes//{{{

// The purpose of these is to have a common function for all the possible types
// that are allowed to be entered into the she
Object.prototype.toString = function() {
    return JSON.stringify(this);
}

Array.prototype.toString = Object.prototype.toString;

//}}}

// I don't want to rely on typescript for the config variables typing because
// user's will make changes to the config variables in the JS so the type
// checking here is meaningless.
function validateConfigVariables() : void {
    try {
        SpreadsheetApp.openById(SPREADSHEET_ID);
    } catch(e) {
        e.message = "SPREADSHEET_ID ["+SPREADSHEET_ID+"] is not valid";
        emailError(e);
    }

    var bools : any = {
        'TESTING'                  : TESTING,
        'DEBUG'                    : DEBUG,
        'ADDED_EPISODE_ALERT'      : ADDED_EPISODE_ALERT,
        'SCRIPT_AUTO_UPDATE_CHECK' : SCRIPT_AUTO_UPDATE_CHECK,
        'GET_STATUS_CHANGE_ALERT'  : GET_STATUS_CHANGE_ALERT,
    };

    var keys : string[] = Object.keys(bools);
    for (var i in keys) {
        var key : string = keys[i];
        var value : any = bools[key];

        // Each value should be a bool...
        if (typeof(value) === 'boolean') {
            continue;
        }

        // Not a boolean. Fail
        var e : Error = new Error(key + " ["+value+"] must be either true or false");
        emailError(e);
    }


    // const BRANCH_TO_CHECK_FOR_UPDATES = "master";
    var res : boolean = BRANCH_TO_CHECK_FOR_UPDATES === 'master'  ||
                        BRANCH_TO_CHECK_FOR_UPDATES === 'dev'     ||
                        BRANCH_TO_CHECK_FOR_UPDATES === 'testing';
    if (!res) {
        var e : Error = new Error("BRANCH_TO_CHECK_FOR_UPDATES ["+BRANCH_TO_CHECK_FOR_UPDATES+"] is not a valid branch.");
        emailError(e);
    }

    // If calendar ID is an empty string, then we just use the default calendar,
    // so we can skip the check
    if (CALENDAR_ID === "") {
        CALENDAR = CalendarApp.getDefaultCalendar();
    } else {
        CALENDAR = CalendarApp.getCalendarById(CALENDAR_ID);
    }

    if (CALENDAR === null) {
        var e : Error = new Error("CALENDAR_ID ["+CALENDAR_ID+"] is not valid");
        emailError(e);
    }

    // if label is null, then it is ignored anyways
    if (MYLABEL !== null) {
        LABEL = GmailApp.getUserLabelByName(MYLABEL);

        if (LABEL === null) {
            var e : Error = new Error("MYLABEL ["+MYLABEL+"] does not exist");
            emailError(e);
        }
    }
}

// Email Related classes and functions//{{{

// Email class to easily send emails or log information
//
// @param  string  subject   The email subject
// @param  string  body      The email body
//
// @return  void
class Email {
    body : string;
    subject : string;
    recipient : string;

    constructor(subject : string, body : string) {
        this.body = body;
        this.subject = subject;
        this.recipient = Session.getActiveUser().getEmail();
    }

    Send() : void {
        // If we are testing, don't send an email. Just log a message
        if (TESTING) {
            var log : string = "Testing Mode: Email = recipient: " + this.recipient;
            log += ", subject: " + this.subject + ", body: ";
            log += this.body;
            Logger.log(log);
            return;
        }

        MailApp.sendEmail(this.recipient, this.subject, this.body);
    };
}

// Email the execution log in case debug is needed.
//
// @return  void
function emailLog() : void {
    if (!DEBUG) {
        return;
    }

    var body : string = Logger.getLog();
    var subject : string = "TV Show Script: Execution Log"
    var e : Email = new Email(subject, body);
    e.Send();
}

// Email an error that occurred due to a thrown exception.
//
// @param  Object  err   A caught exception object.
//
// @return  void. Always throws the exception so that execution halts.
function emailError(err : Error) : void {
    var body : string | undefined = err.stack;

    if (typeof(body) === 'undefined') {
        body = "<Unknown Stack Trace>";
    }

    var subject : string = "TV Show Script: Error"
    var e : Email = new Email(subject, body);
    e.Send();

    throw err;
}

// Email a notification about a change in status of a show
//
// @param  string  showname   The name of the show we are notifying about
// @param  string  oldVal     The previous status of the show
// @param  string  newVal     The new status of the show
//
// @return  void
function emailStatusChange(showname : string, oldVal : string, newVal : string) : void {
    var body : string;
    if (oldVal === "") {
        body = 'The status of "' + showname + '" has initialized to "';
        body += newVal + '".';
    } else {
        body = 'The status of "' + showname + '" has changed from "';
        body += oldVal + '" to "' + newVal + '".';
    }
    var subject : string = "Automated Message: TV Show Status Change"

    var e : Email = new Email(subject, body);
    e.Send();
}

// Email a notification that an episode of a show had no air date
//
// @param  string  showname    The name of the show we are notifying about
// @param  int     episodeNum  The episode number that is missing the stamp
//
// @return  void
function emailNoAirstamp(showname : string, episodeNum : number) : void {
    var body : string = `"${showname}" episode #${episodeNum}`;
    body += " contains no information about the airdate. This episode was";
    body += " not automatically added to your calendar";
    var subject : string = "Automated Message: TV Show Not Added to Calendar"

    var e : Email = new Email(subject, body);
    e.Send();
}

// Email a notification that episodes have been added to the calendar
//
// @param  array  arr    Array of strings to show in the email body
//
// @return  void
function emailAddedEpisodes() : void {
    // if user doesn't want email alerts for episodes then don't send it
    if (!ADDED_EPISODE_ALERT) {
        return;
    }

    if (ADDED_TO_CALENDAR.length === 0) {
        return;
    }

    var body : string = "\n" + ADDED_TO_CALENDAR.join("\n");
    var subject : string = "Automated Message: TV Shows Added to Calendar"
    var e : Email = new Email(subject, body);
    e.Send();
}

// Email a notification that a script update is available
//
// @param  string  newhash  The latest hash for the script
// @param  string  oldhash  The previous hash for the script
//
// @return  void
function emailUpdateAvailable(newhash : string, oldhash : string) : void {
    var body : string = "An update has been made to the script.\n\n";
    body += "Check \"https://github.com/hallzy/tv-show-notification\"\n\n";
    body += "The last time an update check was made the current commit ";
    body += "hash was \"" + oldhash + "\"\n\n";
    body += "Now the current hash is \"" + newhash + "\"";
    var subject : string = "Automated Message: TV Shows Script Ready for Update"
    var e : Email = new Email(subject, body);
    e.Send();
}

function emailShowReset(showname : string, sheetNumberEpisodes : number, numEpisodes : number) : void {
    var body : string = "\"" + showname + "\"" + " is showing " + numEpisodes;
    body += " episodes, but the script has logged ";
    body += sheetNumberEpisodes + ". This TV show will be reset.";
    body += " This may cause duplicate entries in your calendar to exist";
    body += " for this tv show.";
    var subject : string = "Automated Message: TV Show is Being Auto-Reinitialized"
    var e : Email = new Email(subject, body);
    e.Send();
}

function emailUserToManuallyEnterShowID() : void {
    var body : string = "TV Show ID could not be determined. Please Review the below shows"
    body += " that matched your search and add the ID of one of them to the"
    body += " TV Show Google Sheet\n\n"

    for (var i in SHOW_SIMILARITY_API.getMatchingShows()) {
        var idx : number = parseInt(i, 10);

        var name : string = SHOW_SIMILARITY_API.getShowName(idx);
        var url : string = SHOW_SIMILARITY_API.getShowURL(idx);
        var id : number = SHOW_SIMILARITY_API.getShowID(idx);
        body += "ID: " + id + " = " + name + " -- " + url + "\n"
    }
    var subject : string = "Automated Message: TV Show ID Could not be Determined"
    var e : Email = new Email(subject, body);
    e.Send();
}
//}}}

class ThrottleAddCalendar {
    private static count : number = 0;

    public static throttle() : void {
        // If we have ran throttle more than 10 times, then stop execution for 3
        // seconds otherwise google will throw an error
        if (ThrottleAddCalendar.count >= 10) {
            Logger.log("Sleep for 3 seconds")
            Utilities.sleep(3000);
            ThrottleAddCalendar.count = 0;
        }
        ThrottleAddCalendar.count++;
    }
}

function addShowToCalendar(title : string, start : Date, end : Date) : void {
    ThrottleAddCalendar.throttle();

    Logger.log("Added Event: " + title + ", " + start + " to " + end);

    ADDED_TO_CALENDAR.push(title + ": " + start);

    // If testing then don't add to calendar
    if (TESTING) {
        return;
    }

    CALENDAR.createEvent(title, start, end);
}

function getShowsFromEmail() : string[] {
    // Get all threads from this gmail label
    var threads : GoogleAppsScript.Gmail.GmailThread[] = LABEL.getThreads();

    // Keep track of the shows to add to the sheet from an email
    var showsToAdd : string[] = [];

    // Iterate through all threads with the specified label
    for (var i in threads) {
        var thread : GoogleAppsScript.Gmail.GmailThread = threads[i];

        // Get the messages in this thread
        var messages : GoogleAppsScript.Gmail.GmailMessage[] = thread.getMessages();

        // Iterate through all the messages in the thread
        for (var k in messages) {
            // Get the current message
            var message : GoogleAppsScript.Gmail.GmailMessage = messages[k];

            // Get the body of this message
            var body : string = message.getPlainBody();

            // Split the email by new lines
            var lines : string[] = body.split("\n");

            // Add each line to our shows to add
            showsToAdd.push.apply(showsToAdd, lines);
        }

        thread.moveToTrash();
    }

    // Remove empty elements from the array.
    return showsToAdd.filter(n => n);
}

function checkForScriptUpdates() : void {
    if (!SCRIPT_AUTO_UPDATE_CHECK) {
        return;
    }
    // Get the Github API URL where we can find the latest commit hash.
    var url : string = "https://api.github.com/repos/hallzy/tv-show-notification/commits/"
    url += BRANCH_TO_CHECK_FOR_UPDATES;

    var newhash : any;

    // If an API token has been specified then use it, otherwise, don't.
    if (API_TOKEN !== "") {
        url += "?access_token=" + API_TOKEN
    }

    // Try to fetch the content of the API as a string
    try {
        newhash = UrlFetchApp.fetch(url).getContentText()
    } catch(e) {
        Logger.log("Github API Error. No commit found.")
        emailError(e)
        return;
    }

    // Try to parse the API response as JSON
    try {
        newhash = JSON.parse(newhash)
    } catch(e) {
        Logger.log("Failed to Parse \"newhash\"")
        emailError(e)
    }

    // Try to access the "sha" property
    try {
        newhash = newhash["sha"]
    } catch(e) {
        Logger.log("No hash in JSON")
        emailError(e)
    }
    Logger.log(newhash)

    // Get the previously saved hash from the sheet
    if (SHEET.isVersionHashBlank()) {
        Logger.log("hash is initialized to: " + newhash);
        SHEET.setVersionHash(newhash)
        return;
    }

    var oldhash : string = SHEET.getVersionHash()
    Logger.log("Old hash is: " + oldhash);
    if (newhash !== oldhash) {
        Logger.log("hash is now: " + newhash);
        emailUpdateAvailable(newhash, oldhash);
        SHEET.setVersionHash(newhash)
    }
}

function addEmailedShowsToSheet() : void {
    // Get show names from emails
    var toAddFromEmail : string[] = getShowsFromEmail();
    if (toAddFromEmail.length === 0) {
        return;
    }

    // Convert all shows to lowercase
    toAddFromEmail = toAddFromEmail.map(showName => showName.toLowerCase());

    // Populate an array of the current shows in the sheet
    var currentShows : string[] = [];
    for (var k = 0; k < SHEET.getNumShows(); k++) {
        currentShows.push(SHEET.getShow(k).name.toLowerCase());
    }

    // If a show exists in the emailed shows that already exists in the sheet,
    // delete it from the array of emailed shows
    toAddFromEmail = toAddFromEmail.filter(el => currentShows.indexOf(el) < 0);

    Logger.log(toAddFromEmail);

    // Any show that is left from the emailed shows, append it to the sheet.
    for (var i in toAddFromEmail) {
        SHEET.appendShow(toAddFromEmail[i]);
    }
}

// Google Sheet Class//{{{

interface ShowObj {
    id           : number;
    name         : string;
    episodeCount : number;
    status       : string;
    null         : number[];
};

class GoogleSheet {
    // The base sheet object
    private base : GoogleAppsScript.Spreadsheet.Sheet;

    // a 2D array of data in the sheet indexed by row then column
    private data : any;

    private numShows : number;

    constructor() {
        this.base     = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
        this.data     = this.base.getDataRange().getValues();
        this.numShows = this.base.getDataRange().getLastRow();
    }

    getNumShows() : number {
        return this.numShows;
    }

    // Update this object to be inline with the current state of the sheet
    //
    // @return  void
    update() : void {
        this.base     = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
        this.data     = this.base.getDataRange().getValues();
        this.numShows = this.base.getDataRange().getLastRow();
    };

    // Is there a git commit hash in the sheet?
    //
    // @return  bool
    isVersionHashBlank() : boolean {
        return this.base.getRange(1, 7).isBlank();
    };

    // Get the git commit hash of the script that is saved in the sheet
    //
    // @return  string Git commit hash (empty string if non existent)
    getVersionHash() : string {
        if (this.isVersionHashBlank()) {
            return '';
        }
        return this.data[0][6]
    };

    // Given the index of a show in the sheet, check if the null column is empty
    // (The null column is the column with the array of episode IDs with no
    // airstamp information)
    //
    // @param  int  index   The index of the show (sheet row minus 1)
    //
    // @return  bool
    isNullColumnBlank(show : number) : boolean {
        return this.base.getRange(show+1, 5).isBlank();
    };

    // Given the index of a show in the sheet, Get all the stored information
    // about that show from the sheet
    //
    // @param  int  index   The index of the show (sheet row minus 1)
    //
    // @return  object
    getShow(showIdx : number) : ShowObj {
        // Get the null column info
        var nullCol : number[];
        if (this.isNullColumnBlank(showIdx)) {
            nullCol = [];
        } else {
            nullCol = JSON.parse(this.base.getRange(showIdx + 1, 5).getValue());
        }

        var id           : number = parseInt(this.data[showIdx][0], 10);
        var name         : string = this.data[showIdx][1];
        var episodeCount : number = parseInt(this.data[showIdx][2], 10);
        var status       : string = this.data[showIdx][3];

        if (isNaN(id)) {
            id = -1;
        }

        if (isNaN(episodeCount)) {
            episodeCount = -1;
        }

        return {
            'id' : id,
            'name': name,
            'episodeCount': episodeCount,
            'status': status,
            'null': nullCol
        };
    }

    // Given the index of a show in the sheet, Set the data in that row
    // according to the object provided.
    //
    // @param  int    index       The index of the show (sheet row minus 1)
    // @param  object showObject  Object of show information to set
    //
    // @return  void
    setShow(show : number, showObject : ShowObj) : void {
        // The only purpose of this is to suppress the typescript error when
        // trying to iterate over this object... TypeScript thinks it is so
        // smart telling me that the current key from showObject might not be a
        // key of showObject... makes sense...
        var showObjectAny : any = showObject;

        var column       : number;
        var value        : any;
        var expectedType : string;

        // Loop through all keys in the input object
        for (var key in showObjectAny) {
            value = showObjectAny[key];

            // Set the column number and expected type for known data
            if (key === 'id') {
                column = 1;
                expectedType = 'number';
            } else if (key === 'name') {
                column = 2;
                expectedType = 'string';
            } else if (key === 'episodeCount') {
                column = 3;
                expectedType = 'number';
            } else if (key === "status") {
                column = 4;
                expectedType = 'string';
            } else if (key === "null") {
                column = 5;
                expectedType = 'object';
            } else {
                continue;
            }

            var type : string = typeof(value);
            if (type !== expectedType) {
                var err : string = "Did not update " + key + "in sheet.";
                err += " Expected type " + expectedType + " but got " + type;

                Logger.log(err);

                continue;
            }

            // Set the data in the sheet
            this.base.getRange(show+1, column).setValue(value.toString());
        }
    };

    // Set a new commit hash in the sheet
    //
    // @param  string hash  The hash to set
    //
    // @return  void
    setVersionHash(hash : string) : void {
        this.base.getRange(1, 7).setValue(hash);
    };

    // Append a show to the sheet. All we need is the showname
    //
    // @param  string showName  The name of the show to append
    //
    // @return  void
    appendShow(showname : string) : void {
        this.base.appendRow(["", showname]);
    };

    // Reset all auto updated columns for a tv show
    //
    // @param  int idx  The show index
    //
    // @return  void
    resetShow(idx : number, showObj : ShowObj) : void {
        this.setShow(idx, {
            'id' : showObj.id,
            'name' : showObj.name,
            'episodeCount': 0,
            'status': "",
            'null': [],
        });
    }

}
//}}}

class EpisodeAPI {
    private response : any;

    private numEpisodes : number;
    private episodes : [];
    private name : string;
    private status : string;

    constructor() {
        this.response = {};
        this.numEpisodes = -1;
        this.episodes = [];
        this.name = '';
        this.status = '';
    }

    getNumEpisodes() : number {
        return this.numEpisodes;
    }

    getName() : string {
        return this.name;
    }

    getStatus() : string {
        return this.status;
    }

    requestAPI(showID : number) : void {
        // get the API URL for the current show
        var url : string = "http://api.tvmaze.com/shows/" + showID + "?embed=episodes";

        var response : any;

        // If we fail to get a response, send off some logs and exit
        try {
            response = UrlFetchApp.fetch(url);
        } catch(e) {
            emailAddedEpisodes();
            emailLog();
            emailError(e);
        }

        var jsonString : string = response.getContentText();
        this.response = JSON.parse(jsonString);

        this.episodes = this.response['_embedded']['episodes'];
        this.numEpisodes = this.episodes.length;
        this.status = this.response['status'];
        this.name = this.response['name'];
    }

    getAirTime(episodeNum : number) : [Date?, Date?] {
        var airstamp = this.episodes[episodeNum]['airstamp'];
        var runtime = this.episodes[episodeNum]['runtime'];

        if (airstamp === null || airstamp === "") {
            return [];
        }

        if (runtime === null || runtime === "") {
            return [];
        }

        var startObj = new Date(airstamp);
        var endObj = new Date(airstamp);

        endObj.setMinutes(endObj.getMinutes() + runtime);

        Logger.log("Start Stamp: " + startObj);
        Logger.log("End Stamp: " + endObj);
        return [startObj, endObj];
    }
}

class ShowSimilarityAPI {
    private response : any;
    private matchingShows : any;

    constructor() { }

    getMatchingShows() : any {
        return this.matchingShows;
    }

    getNumMatchingShows() : number {
        return Object.keys(this.matchingShows).length;
    }

    requestAPI(showName : string) : void {
        // get the API URL for the current show
        var url : string = "http://api.tvmaze.com/search/shows?q=" + showName.trim();

        var response : any;

        // If we fail to get a response, send off some logs and exit
        try {
            response = UrlFetchApp.fetch(url);
        } catch(e) {
            emailAddedEpisodes();
            emailLog();
            emailError(e);
        }

        var jsonString : string = response.getContentText();
        this.response = JSON.parse(jsonString);

        this.matchingShows = this.response;
    }

    getScore(showIdx : number) : number {
        return parseFloat(this.matchingShows[showIdx]['score']);
    }

    getShowID(showIdx : number) : number {
        return parseInt(this.matchingShows[showIdx]['show']['id'], 10);
    }

    getShowName(showIdx : number) : string {
        return this.matchingShows[showIdx]['show']['name'];
    }

    getShowURL(showIdx : number) : string {
        return this.matchingShows[showIdx]['show']['url'];
    }
}

function runSimilarityCheck(showName : string) : number {
    SHOW_SIMILARITY_API.requestAPI(showName);

    // If no shows match, then there is an error
    if (SHOW_SIMILARITY_API.getNumMatchingShows() < 1) {
        // ERROR
        return -1;
    }

    // If there is only 1 match, then we will use that
    if (SHOW_SIMILARITY_API.getNumMatchingShows() === 1) {
        return SHOW_SIMILARITY_API.getShowID(0);
    }

    // If there is more than 1 match, TV Maze has the 2 highest scoring shows
    // first. If the difference between those scores is less than 1 then we will
    // assume that the shows are too similar to decide on our own so we will ask
    // the user to check the ID themselves.
    var score1 : number = SHOW_SIMILARITY_API.getScore(0);
    var score2 : number = SHOW_SIMILARITY_API.getScore(1);
    var diff : number = score1 - score2

    if (diff < 1) {
        emailUserToManuallyEnterShowID();
        return -1;
    }
    return SHOW_SIMILARITY_API.getShowID(0);
}

function addNullEpisodesToCalendar(nullArr : number[]) : number[] {
    // Keep track of episodes that aren't null anymore so we can remove them
    // from the null list later
    var notNullAnymore : number[] = [];

    for (var i = 0; i < nullArr.length; i++) {
        var episode : number = nullArr[i];

        // If the start and end dates are still null then skip this. it is still
        // a null episode
        var [startObj, endObj] : [Date?, Date?] = EPISODE_API.getAirTime(episode);
        if (typeof(startObj) === 'undefined' || typeof(endObj) === 'undefined') {
            continue;
        }

        // If we get here then the episode isn't null anymore. Add it to our
        // list of not nulls
        notNullAnymore.push(i);

        // If the end date of the episode is still in the future, then add it to
        // our calendar
        if (endObj > NOW) {
            addShowToCalendar(EPISODE_API.getName(), startObj, endObj);
        }
    }

    // Now remove the episodes from the null list if we determined that they are
    // no longer null
    for (var i = 0; i < notNullAnymore.length; i++) {
        nullArr.splice(notNullAnymore[i], 1);
    }

    return nullArr;
}

function initializeEpisodeCount() : number {
    // Iterate over all episodes starting from the last ones. This is
    // because we don't care about the episodes that have aired before
    // today's date
    for (var i = EPISODE_API.getNumEpisodes() - 1; i >= 0; i--) {
        // if the current episode starts before today, make that episode number
        // be the number of episodes that we know of. Break out of the loop
        var [startObj, endObj] : [Date?, Date?] = EPISODE_API.getAirTime(i);

        if (typeof(startObj) === 'undefined' || typeof(endObj) === 'undefined') {
            continue;
        }

        // If the episode ended before today's date, then the episode count
        // is this episodes index plus 1. We can break out of the loop now
        if (endObj < NOW) {
            return i + 1;
        }
    }

    return 0;
}

function addNewShowsToCalendar(showObj : ShowObj) : ShowObj {
    // If the API shows more episodes than we have in the sheet, then we need to
    // add those new episodes to our calendar
    while (EPISODE_API.getNumEpisodes() > showObj.episodeCount) {
        // Get the start and end time of the next episode
        var [startObj, endObj] : [Date?, Date?] = EPISODE_API.getAirTime(showObj.episodeCount);

        // If the start or end time doesn't exist, then add it to our NULL list
        if (typeof(startObj) === 'undefined' || typeof(endObj) === 'undefined') {
            showObj.null.push(showObj.episodeCount);
            showObj.episodeCount++;
            Logger.log(EPISODE_API.getName());
            emailNoAirstamp(EPISODE_API.getName(), showObj.episodeCount)
            continue;
        }

        // We have start and end times. But is the episode in the future?
        if (endObj > NOW) {
            // yes, so add it to the calendar
            addShowToCalendar(EPISODE_API.getName(), startObj, endObj);
        }
        showObj.episodeCount++;
    }

    return showObj;
}

function runTVShow(showIdx : number) : void {
    var showObj : ShowObj = SHEET.getShow(showIdx);

    Logger.log("==============================");
    Logger.log("Show Name: " + showObj.name);
    Logger.log("Show Index: " + showIdx);

    // If this show doesn't have an ID yet, use the name in the sheet to
    // determine the ID from the API
    if (showObj.id === -1) {
        showObj.id = runSimilarityCheck(showObj.name);

        // If we still don't have a show ID, then skip this show.
        if (showObj.id === -1) {
            return;
        }

        SHEET.setShow(showIdx, showObj);
        SHEET.update();
        showObj = SHEET.getShow(showIdx);
    }

    EPISODE_API.requestAPI(showObj.id);

    if (EPISODE_API.getNumEpisodes() < showObj.episodeCount) {
        // If the number of episodes listed in the sheet is more than what
        // exists in the API, then the API has removed an episode.
        SHEET.resetShow(showIdx, showObj);
        emailShowReset(showObj.name, showObj.episodeCount, EPISODE_API.getNumEpisodes());

        // Now re loop for this show to make sure we do not miss anything.
        return runTVShow(showIdx - 1);
    }

    if (GET_STATUS_CHANGE_ALERT) {
        if (showObj.status !== EPISODE_API.getStatus()) {
            emailStatusChange(showObj.name, showObj.status, EPISODE_API.getStatus());
            showObj.status = EPISODE_API.getStatus();
        }
    }

    // If we don't have a number, create it. The number will be the number of
    // episodes that are before today's date. We don't want to consider the
    // episodes after today's date yet. That will come later when we actually
    // add them to the calendar
    if (showObj.episodeCount === -1) {
        showObj.episodeCount = initializeEpisodeCount();
    }

    Logger.log("Episodes with null stamps: " + showObj.null);

    // Check the episodes in our null list, and if they aren't null anymore add
    // them to calendar
    showObj.null = addNullEpisodesToCalendar(showObj.null);

    showObj = addNewShowsToCalendar(showObj);

    showObj.name = EPISODE_API.getName();

    SHEET.setShow(showIdx, showObj);
    Logger.log("==============================");
}

function run() : void {
    validateConfigVariables();

    SHEET = new GoogleSheet();
    EPISODE_API = new EpisodeAPI();
    SHOW_SIMILARITY_API = new ShowSimilarityAPI();
    ADDED_TO_CALENDAR = [];

    checkForScriptUpdates();

    addEmailedShowsToSheet();

    // Repopulate the sheet after adding emailed shows to the sheet. Also,
    // execute this when we come back through the loop for rechecking shows.
    SHEET.update();

    // Iterate through every TV show
    for (var idx = 0; idx < SHEET.getNumShows(); idx++) {
        runTVShow(idx);
    }

    emailAddedEpisodes();
    emailLog();
}
