"use strict";
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
var SPREADSHEET_ID = "FILL THIS";

var API_TOKEN = "";

// If true, then no emails are sent, and don't create new calendar events
var TESTING = false;

// If true, then you will receive the full debug log as an email
var DEBUG = false;

// If true, then you will receive email alerts for when show episodes are added
// to your calendar
var ADDED_EPISODE_ALERT = false;

// If true, then check for updates to this script on github
var SCRIPT_AUTO_UPDATE_CHECK = false;

// Specify the github branch to check for updates for. This has no effect if
// SCRIPT_AUTO_UPDATE_CHECK is disabled
var BRANCH_TO_CHECK_FOR_UPDATES = "master";

// Specify the calendar to add calendar events to. If left empty it will use
// your account's default calendar.
var CALENDAR_ID = "";

// If true, then you will get email alerts when the status of a show has changed
// (ie, if it was running but has now been cancelled)
var GET_STATUS_CHANGE_ALERT = false;

// Emails in this folder (label) will be parsed for new tv show names. The email
// must have each show on a new line, and each of those will be automatically
// added to your spreadsheet when the script runs
var MYLABEL = "TV Show Script";

// **********************************
// ***  END CONFIGURABLE OPTIONS  ***
// **********************************

var NOW = new Date();
var SHEET;
var EPISODE_API;
var SHOW_SIMILARITY_API;
var ADDED_TO_CALENDAR;
var CALENDAR;
var LABEL;
Object.prototype.toString = function () {
    return JSON.stringify(this);
};
Array.prototype.toString = Object.prototype.toString;
function validateConfigVariables() {
    try {
        SpreadsheetApp.openById(SPREADSHEET_ID);
    }
    catch (e) {
        e.message = "SPREADSHEET_ID [" + SPREADSHEET_ID + "] is not valid";
        emailError(e);
    }
    var bools = {
        'TESTING': TESTING,
        'DEBUG': DEBUG,
        'ADDED_EPISODE_ALERT': ADDED_EPISODE_ALERT,
        'SCRIPT_AUTO_UPDATE_CHECK': SCRIPT_AUTO_UPDATE_CHECK,
        'GET_STATUS_CHANGE_ALERT': GET_STATUS_CHANGE_ALERT,
    };
    var keys = Object.keys(bools);
    for (var i in keys) {
        var key = keys[i];
        var value = bools[key];
        if (typeof (value) === 'boolean') {
            continue;
        }
        var e = new Error(key + " [" + value + "] must be either true or false");
        emailError(e);
    }
    var res = BRANCH_TO_CHECK_FOR_UPDATES === 'master' ||
        BRANCH_TO_CHECK_FOR_UPDATES === 'dev' ||
        BRANCH_TO_CHECK_FOR_UPDATES === 'testing';
    if (!res) {
        var e = new Error("BRANCH_TO_CHECK_FOR_UPDATES [" + BRANCH_TO_CHECK_FOR_UPDATES + "] is not a valid branch.");
        emailError(e);
    }
    if (CALENDAR_ID === "") {
        CALENDAR = CalendarApp.getDefaultCalendar();
    }
    else {
        CALENDAR = CalendarApp.getCalendarById(CALENDAR_ID);
    }
    if (CALENDAR === null) {
        var e = new Error("CALENDAR_ID [" + CALENDAR_ID + "] is not valid");
        emailError(e);
    }
    if (MYLABEL !== null) {
        LABEL = GmailApp.getUserLabelByName(MYLABEL);
        if (LABEL === null) {
            var e = new Error("MYLABEL [" + MYLABEL + "] does not exist");
            emailError(e);
        }
    }
}
var Email = (function () {
    function Email(subject, body) {
        this.body = body;
        this.subject = subject;
        this.recipient = Session.getActiveUser().getEmail();
    }
    Email.prototype.Send = function () {
        if (TESTING) {
            var log = "Testing Mode: Email = recipient: " + this.recipient;
            log += ", subject: " + this.subject + ", body: ";
            log += this.body;
            Logger.log(log);
            return;
        }
        MailApp.sendEmail(this.recipient, this.subject, this.body);
    };
    ;
    return Email;
}());
function emailLog() {
    if (!DEBUG) {
        return;
    }
    var body = Logger.getLog();
    var subject = "TV Show Script: Execution Log";
    var e = new Email(subject, body);
    e.Send();
}
function emailError(err) {
    var body = err.stack;
    if (typeof (body) === 'undefined') {
        body = "<Unknown Stack Trace>";
    }
    var subject = "TV Show Script: Error";
    var e = new Email(subject, body);
    e.Send();
    throw err;
}
function emailStatusChange(showname, oldVal, newVal) {
    var body;
    if (oldVal === "") {
        body = 'The status of "' + showname + '" has initialized to "';
        body += newVal + '".';
    }
    else {
        body = 'The status of "' + showname + '" has changed from "';
        body += oldVal + '" to "' + newVal + '".';
    }
    var subject = "Automated Message: TV Show Status Change";
    var e = new Email(subject, body);
    e.Send();
}
function emailNoAirstamp(showname, episodeNum) {
    var body = "\"" + showname + "\" episode #" + episodeNum;
    body += " contains no information about the airdate. This episode was";
    body += " not automatically added to your calendar";
    var subject = "Automated Message: TV Show Not Added to Calendar";
    var e = new Email(subject, body);
    e.Send();
}
function emailAddedEpisodes() {
    if (!ADDED_EPISODE_ALERT) {
        return;
    }
    if (ADDED_TO_CALENDAR.length === 0) {
        return;
    }
    var body = "\n" + ADDED_TO_CALENDAR.join("\n");
    var subject = "Automated Message: TV Shows Added to Calendar";
    var e = new Email(subject, body);
    e.Send();
}
function emailUpdateAvailable(newhash, oldhash) {
    var body = "An update has been made to the script.\n\n";
    body += "Check \"https://github.com/hallzy/tv-show-notification\"\n\n";
    body += "The last time an update check was made the current commit ";
    body += "hash was \"" + oldhash + "\"\n\n";
    body += "Now the current hash is \"" + newhash + "\"";
    var subject = "Automated Message: TV Shows Script Ready for Update";
    var e = new Email(subject, body);
    e.Send();
}
function emailShowReset(showname, sheetNumberEpisodes, numEpisodes) {
    var body = "\"" + showname + "\"" + " is showing " + numEpisodes;
    body += " episodes, but the script has logged ";
    body += sheetNumberEpisodes + ". This TV show will be reset.";
    body += " This may cause duplicate entries in your calendar to exist";
    body += " for this tv show.";
    var subject = "Automated Message: TV Show is Being Auto-Reinitialized";
    var e = new Email(subject, body);
    e.Send();
}
function emailUserToManuallyEnterShowID() {
    var body = "TV Show ID could not be determined. Please Review the below shows";
    body += " that matched your search and add the ID of one of them to the";
    body += " TV Show Google Sheet\n\n";
    for (var i in SHOW_SIMILARITY_API.getMatchingShows()) {
        var idx = parseInt(i, 10);
        var name = SHOW_SIMILARITY_API.getShowName(idx);
        var url = SHOW_SIMILARITY_API.getShowURL(idx);
        var id = SHOW_SIMILARITY_API.getShowID(idx);
        body += "ID: " + id + " = " + name + " -- " + url + "\n";
    }
    var subject = "Automated Message: TV Show ID Could not be Determined";
    var e = new Email(subject, body);
    e.Send();
}
var ThrottleAddCalendar = (function () {
    function ThrottleAddCalendar() {
    }
    ThrottleAddCalendar.throttle = function () {
        if (ThrottleAddCalendar.count >= 10) {
            Logger.log("Sleep for 3 seconds");
            Utilities.sleep(3000);
            ThrottleAddCalendar.count = 0;
        }
        ThrottleAddCalendar.count++;
    };
    ThrottleAddCalendar.count = 0;
    return ThrottleAddCalendar;
}());
function addShowToCalendar(title, start, end) {
    ThrottleAddCalendar.throttle();
    Logger.log("Added Event: " + title + ", " + start + " to " + end);
    ADDED_TO_CALENDAR.push(title + ": " + start);
    if (TESTING) {
        return;
    }
    CALENDAR.createEvent(title, start, end);
}
function getShowsFromEmail() {
    var threads = LABEL.getThreads();
    var showsToAdd = [];
    for (var i in threads) {
        var thread = threads[i];
        var messages = thread.getMessages();
        for (var k in messages) {
            var message = messages[k];
            var body = message.getPlainBody();
            var lines = body.split("\n");
            showsToAdd.push.apply(showsToAdd, lines);
        }
        thread.moveToTrash();
    }
    return showsToAdd.filter(function (n) { return n; });
}
function checkForScriptUpdates() {
    if (!SCRIPT_AUTO_UPDATE_CHECK) {
        return;
    }
    var url = "https://api.github.com/repos/hallzy/tv-show-notification/commits/";
    url += BRANCH_TO_CHECK_FOR_UPDATES;
    var newhash;
    if (API_TOKEN !== "") {
        url += "?access_token=" + API_TOKEN;
    }
    try {
        newhash = UrlFetchApp.fetch(url).getContentText();
    }
    catch (e) {
        Logger.log("Github API Error. No commit found.");
        emailError(e);
        return;
    }
    try {
        newhash = JSON.parse(newhash);
    }
    catch (e) {
        Logger.log("Failed to Parse \"newhash\"");
        emailError(e);
    }
    try {
        newhash = newhash["sha"];
    }
    catch (e) {
        Logger.log("No hash in JSON");
        emailError(e);
    }
    Logger.log(newhash);
    if (SHEET.isVersionHashBlank()) {
        Logger.log("hash is initialized to: " + newhash);
        SHEET.setVersionHash(newhash);
        return;
    }
    var oldhash = SHEET.getVersionHash();
    Logger.log("Old hash is: " + oldhash);
    if (newhash !== oldhash) {
        Logger.log("hash is now: " + newhash);
        emailUpdateAvailable(newhash, oldhash);
        SHEET.setVersionHash(newhash);
    }
}
function addEmailedShowsToSheet() {
    var toAddFromEmail = getShowsFromEmail();
    if (toAddFromEmail.length === 0) {
        return;
    }
    toAddFromEmail = toAddFromEmail.map(function (showName) { return showName.toLowerCase(); });
    var currentShows = [];
    for (var k = 0; k < SHEET.getNumShows(); k++) {
        currentShows.push(SHEET.getShow(k).name.toLowerCase());
    }
    toAddFromEmail = toAddFromEmail.filter(function (el) { return currentShows.indexOf(el) < 0; });
    Logger.log(toAddFromEmail);
    for (var i in toAddFromEmail) {
        SHEET.appendShow(toAddFromEmail[i]);
    }
}
;
var GoogleSheet = (function () {
    function GoogleSheet() {
        this.base = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
        this.data = this.base.getDataRange().getValues();
        this.numShows = this.base.getDataRange().getLastRow();
    }
    GoogleSheet.prototype.getNumShows = function () {
        return this.numShows;
    };
    GoogleSheet.prototype.update = function () {
        this.base = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
        this.data = this.base.getDataRange().getValues();
        this.numShows = this.base.getDataRange().getLastRow();
    };
    ;
    GoogleSheet.prototype.isVersionHashBlank = function () {
        return this.base.getRange(1, 7).isBlank();
    };
    ;
    GoogleSheet.prototype.getVersionHash = function () {
        if (this.isVersionHashBlank()) {
            return '';
        }
        return this.data[0][6];
    };
    ;
    GoogleSheet.prototype.isNullColumnBlank = function (show) {
        return this.base.getRange(show + 1, 5).isBlank();
    };
    ;
    GoogleSheet.prototype.getShow = function (showIdx) {
        var nullCol;
        if (this.isNullColumnBlank(showIdx)) {
            nullCol = [];
        }
        else {
            nullCol = JSON.parse(this.base.getRange(showIdx + 1, 5).getValue());
        }
        var id = parseInt(this.data[showIdx][0], 10);
        var name = this.data[showIdx][1];
        var episodeCount = parseInt(this.data[showIdx][2], 10);
        var status = this.data[showIdx][3];
        if (isNaN(id)) {
            id = -1;
        }
        if (isNaN(episodeCount)) {
            episodeCount = -1;
        }
        return {
            'id': id,
            'name': name,
            'episodeCount': episodeCount,
            'status': status,
            'null': nullCol
        };
    };
    GoogleSheet.prototype.setShow = function (show, showObject) {
        var showObjectAny = showObject;
        var column;
        var value;
        var expectedType;
        for (var key in showObjectAny) {
            value = showObjectAny[key];
            if (key === 'id') {
                column = 1;
                expectedType = 'number';
            }
            else if (key === 'name') {
                column = 2;
                expectedType = 'string';
            }
            else if (key === 'episodeCount') {
                column = 3;
                expectedType = 'number';
            }
            else if (key === "status") {
                column = 4;
                expectedType = 'string';
            }
            else if (key === "null") {
                column = 5;
                expectedType = 'object';
            }
            else {
                continue;
            }
            var type = typeof (value);
            if (type !== expectedType) {
                var err = "Did not update " + key + "in sheet.";
                err += " Expected type " + expectedType + " but got " + type;
                Logger.log(err);
                continue;
            }
            this.base.getRange(show + 1, column).setValue(value.toString());
        }
    };
    ;
    GoogleSheet.prototype.setVersionHash = function (hash) {
        this.base.getRange(1, 7).setValue(hash);
    };
    ;
    GoogleSheet.prototype.appendShow = function (showname) {
        this.base.appendRow(["", showname]);
    };
    ;
    GoogleSheet.prototype.resetShow = function (idx, showObj) {
        this.setShow(idx, {
            'id': showObj.id,
            'name': showObj.name,
            'episodeCount': 0,
            'status': "",
            'null': [],
        });
    };
    return GoogleSheet;
}());
var EpisodeAPI = (function () {
    function EpisodeAPI() {
        this.response = {};
        this.numEpisodes = -1;
        this.episodes = [];
        this.name = '';
        this.status = '';
    }
    EpisodeAPI.prototype.getNumEpisodes = function () {
        return this.numEpisodes;
    };
    EpisodeAPI.prototype.getName = function () {
        return this.name;
    };
    EpisodeAPI.prototype.getStatus = function () {
        return this.status;
    };
    EpisodeAPI.prototype.requestAPI = function (showID) {
        var url = "http://api.tvmaze.com/shows/" + showID + "?embed=episodes";
        var response;
        try {
            response = UrlFetchApp.fetch(url);
        }
        catch (e) {
            emailAddedEpisodes();
            emailLog();
            emailError(e);
        }
        var jsonString = response.getContentText();
        this.response = JSON.parse(jsonString);
        this.episodes = this.response['_embedded']['episodes'];
        this.numEpisodes = this.episodes.length;
        this.status = this.response['status'];
        this.name = this.response['name'];
    };
    EpisodeAPI.prototype.getAirTime = function (episodeNum) {
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
    };
    return EpisodeAPI;
}());
var ShowSimilarityAPI = (function () {
    function ShowSimilarityAPI() {
    }
    ShowSimilarityAPI.prototype.getMatchingShows = function () {
        return this.matchingShows;
    };
    ShowSimilarityAPI.prototype.getNumMatchingShows = function () {
        return Object.keys(this.matchingShows).length;
    };
    ShowSimilarityAPI.prototype.requestAPI = function (showName) {
        var url = "http://api.tvmaze.com/search/shows?q=" + showName.trim();
        var response;
        try {
            response = UrlFetchApp.fetch(url);
        }
        catch (e) {
            emailAddedEpisodes();
            emailLog();
            emailError(e);
        }
        var jsonString = response.getContentText();
        this.response = JSON.parse(jsonString);
        this.matchingShows = this.response;
    };
    ShowSimilarityAPI.prototype.getScore = function (showIdx) {
        return parseFloat(this.matchingShows[showIdx]['score']);
    };
    ShowSimilarityAPI.prototype.getShowID = function (showIdx) {
        return parseInt(this.matchingShows[showIdx]['show']['id'], 10);
    };
    ShowSimilarityAPI.prototype.getShowName = function (showIdx) {
        return this.matchingShows[showIdx]['show']['name'];
    };
    ShowSimilarityAPI.prototype.getShowURL = function (showIdx) {
        return this.matchingShows[showIdx]['show']['url'];
    };
    return ShowSimilarityAPI;
}());
function runSimilarityCheck(showName) {
    SHOW_SIMILARITY_API.requestAPI(showName);
    if (SHOW_SIMILARITY_API.getNumMatchingShows() < 1) {
        return -1;
    }
    if (SHOW_SIMILARITY_API.getNumMatchingShows() === 1) {
        return SHOW_SIMILARITY_API.getShowID(0);
    }
    var score1 = SHOW_SIMILARITY_API.getScore(0);
    var score2 = SHOW_SIMILARITY_API.getScore(1);
    var diff = score1 - score2;
    if (diff < 1) {
        emailUserToManuallyEnterShowID();
        return -1;
    }
    return SHOW_SIMILARITY_API.getShowID(0);
}
function addNullEpisodesToCalendar(nullArr) {
    var notNullAnymore = [];
    for (var i = 0; i < nullArr.length; i++) {
        var episode = nullArr[i];
        var _a = EPISODE_API.getAirTime(episode), startObj = _a[0], endObj = _a[1];
        if (typeof (startObj) === 'undefined' || typeof (endObj) === 'undefined') {
            continue;
        }
        notNullAnymore.push(i);
        if (endObj > NOW) {
            addShowToCalendar(EPISODE_API.getName(), startObj, endObj);
        }
    }
    for (var i = 0; i < notNullAnymore.length; i++) {
        nullArr.splice(notNullAnymore[i], 1);
    }
    return nullArr;
}
function initializeEpisodeCount() {
    for (var i = EPISODE_API.getNumEpisodes() - 1; i >= 0; i--) {
        var _a = EPISODE_API.getAirTime(i), startObj = _a[0], endObj = _a[1];
        if (typeof (startObj) === 'undefined' || typeof (endObj) === 'undefined') {
            continue;
        }
        if (endObj < NOW) {
            return i + 1;
        }
    }
    return 0;
}
function addNewShowsToCalendar(showObj) {
    while (EPISODE_API.getNumEpisodes() > showObj.episodeCount) {
        var _a = EPISODE_API.getAirTime(showObj.episodeCount), startObj = _a[0], endObj = _a[1];
        if (typeof (startObj) === 'undefined' || typeof (endObj) === 'undefined') {
            showObj.null.push(showObj.episodeCount);
            showObj.episodeCount++;
            Logger.log(EPISODE_API.getName());
            emailNoAirstamp(EPISODE_API.getName(), showObj.episodeCount);
            continue;
        }
        if (endObj > NOW) {
            addShowToCalendar(EPISODE_API.getName(), startObj, endObj);
        }
        showObj.episodeCount++;
    }
    return showObj;
}
function runTVShow(showIdx) {
    var showObj = SHEET.getShow(showIdx);
    Logger.log("==============================");
    Logger.log("Show Name: " + showObj.name);
    Logger.log("Show Index: " + showIdx);
    if (showObj.id === -1) {
        showObj.id = runSimilarityCheck(showObj.name);
        if (showObj.id === -1) {
            return;
        }
        SHEET.setShow(showIdx, showObj);
        SHEET.update();
        showObj = SHEET.getShow(showIdx);
    }
    EPISODE_API.requestAPI(showObj.id);
    if (EPISODE_API.getNumEpisodes() < showObj.episodeCount) {
        SHEET.resetShow(showIdx, showObj);
        emailShowReset(showObj.name, showObj.episodeCount, EPISODE_API.getNumEpisodes());
        return runTVShow(showIdx - 1);
    }
    if (GET_STATUS_CHANGE_ALERT) {
        if (showObj.status !== EPISODE_API.getStatus()) {
            emailStatusChange(showObj.name, showObj.status, EPISODE_API.getStatus());
            showObj.status = EPISODE_API.getStatus();
        }
    }
    if (showObj.episodeCount === -1) {
        showObj.episodeCount = initializeEpisodeCount();
    }
    Logger.log("Episodes with null stamps: " + showObj.null);
    showObj.null = addNullEpisodesToCalendar(showObj.null);
    showObj = addNewShowsToCalendar(showObj);
    showObj.name = EPISODE_API.getName();
    SHEET.setShow(showIdx, showObj);
    Logger.log("==============================");
}
function run() {
    validateConfigVariables();
    SHEET = new GoogleSheet();
    EPISODE_API = new EpisodeAPI();
    SHOW_SIMILARITY_API = new ShowSimilarityAPI();
    ADDED_TO_CALENDAR = [];
    checkForScriptUpdates();
    addEmailedShowsToSheet();
    SHEET.update();
    for (var idx = 0; idx < SHEET.getNumShows(); idx++) {
        runTVShow(idx);
    }
    emailAddedEpisodes();
    emailLog();
}
