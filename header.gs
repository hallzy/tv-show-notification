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
