// If you are unsure if a show will be recognized, check to see what data is given by going to:
// http://api.tvmaze.com/singlesearch/shows?q=TV SHOW NAME&embed=episodes
// by replacing "TV SHOW NAME" with the name of the TV show

// For a sheet with
// URL = https://docs.google.com/spreadsheets/d/1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I/edit#gid=0
// Change these variables variable
var spreadsheet_id = "FILL THIS";
var get_status_change_alert = false;
var calendar_id = "";
var debug = false;
var added_episode_alert = false;
var mylabel = "TV Show Script";
var auto_update_check = true;
var branch_to_check_for_updates = "master";
var api_token = ""

var TESTING = false;

var month = new Array();
month[0]  = "January";
month[1]  = "February";
month[2]  = "March";
month[3]  = "April";
month[4]  = "May";
month[5]  = "June";
month[6]  = "July";
month[7]  = "August";
month[8]  = "September";
month[9]  = "October";
month[10] = "November";
month[11] = "December";


// Email Related classes and functions//{{{

// Email class.
function Email(subject, body) {
  this.body = body;
  this.subject = subject;
  this.recipient = Session.getActiveUser().getEmail();
  this.Send = function() {
    // If we are testing, don't send an email. Just log a message
    if (!TESTING) {
      MailApp.sendEmail(this.recipient, this.subject, this.body);
    }
    else {
      var log = "Testing Mode: Email = recipient: " + this.recipient;
      log = log + ", subject: " + this.subject + ", body: ";
      log = log + this.body;
      Logger.log(log);
    }
  };
}

function email_log() {
  var e = new Email();
  e.body = Logger.getLog();
  e.subject = "TV Show Script: Execution Log"
  e.Send();
}

function email_error(err) {
  var e = new Email();
  e.body = "Error at: " + err.lineNumber + ": " + err.message;
  e.subject = "TV Show Script: Error"
  e.Send();
}

function email_status_change(showname, old_val, new_val) {
  if (old_val == "" || old_val == null) {
    var body = "The status of \"" + showname + "\" has initialized to \"";
    body = body + new_val + "\".";
  }
  else {
    var body = "The status of \"" + showname + "\" has changed from \"";
    body = body + old_val + "\" to \"" + new_val + "\".";
  }
  var subject = "Automated Message: TV Show Status Change"

  var e = new Email(subject, body);
  e.Send();
}

function email_error_about_no_airstamp(showname, episode_num) {
  var body = "\"" + showname + "\"" + " episode #" + episode_num;
  body = body + " contains no information about the airdate. This episode was";
  body = body + " not automatically added to your calendar";
  var subject = "Automated Message: TV Show Not Added to Calendar"

  var e = new Email(subject, body);
  e.Send();
}

function email_alert_for_added_episodes(arr) {
  var size = arr.length;
  if (size >= 1) {
    var body = "";
    for (k = 0; k < size; k++) {
      body = body + "\n" + arr[k];
    }
    var subject = "Automated Message: TV Shows Added to Calendar"
    var e = new Email(subject, body);
    e.Send();
  }

}

function email_alert_for_script_update(newhash, oldhash) {
  var body = "An update has been made to the script.";
  body = body + "\n\n";
  body = body + "Check \"https://github.com/hallzy/tv-show-notification\"";
  body = body + "\n\n";
  body = body + "The last time an update check was made the current commit ";
  body = body + "hash was \"" + oldhash + "\"";
  body = body + "\n\n";
  body = body + "Now the current hash is \"" + newhash + "\"";
  var subject = "Automated Message: TV Shows Script Ready for Update"
  var e = new Email(subject, body);
  e.Send();
}

function email_error_about_the_reset(showname, sheet_number_episodes, num_episodes) {
  var body = "\"" + showname + "\"" + " is showing " + num_episodes;
  body = body + " episodes, but the script has logged ";
  body = body + sheet_number_episodes + ". This TV show will be reset.";
  body = body + " This may cause duplicate entries in your calendar to exist";
  body = body + " for this tv show.";
  var subject = "Automated Message: TV Show is Being Auto-Reinitialized"
  var e = new Email(subject, body);
  e.Send();
}

function emailUserToManuallyEnterShowID(api_w_score) {
  var body = "TV Show ID could not be determined. Please Review the below shows"
  body = body + " that matched your search and add the ID of one of them to the"
  body = body + " TV Show Google Sheet\n\n"

  var arrayLength = api_w_score.length;
  for (var i = 0; i < arrayLength; i++) {
    var name = api_w_score[i]['show']['name']
    var url = api_w_score[i]['show']['url']
    var id = api_w_score[i]['show']['id']
    body = body + "ID: " + id + " = " + name + " -- " + url + "\n"
  }
  var subject = "Automated Message: TV Show ID Could not be Determined"
  var e = new Email(subject, body);
  e.Send();
}
//}}}

var idx = 0;
function add_show_to_calendar(title, start, end) {
  // If we are adding more than 10 calendar events at a time, wait for 3 seconds
  // otherwise google will complain.
  if (idx >= 10) {
    Logger.log("Sleep for 3 seconds")
    Utilities.sleep(3000);
    idx = 0;
  }
  else {
    idx++;
  }

  // Use the default calendar if one is not specified.
  if (calendar_id == "" || calendar_id == null) {
    Logger.log("Using default calendar")
    var myCalendar = CalendarApp.getDefaultCalendar()
  }
  else {
    Logger.log("Using calendar: " + calendar_id)
    var myCalendar = CalendarApp.getCalendarById(calendar_id)
  }

  // if We are testing do not create an event. Just log it
  if (!TESTING) {
    myCalendar.createEvent(title, start, end);
  }
  Logger.log("Added Event: " + title + ", " + start + " to " + end);
}

// Retrieves the number of episodes for a TV show from the API
function get_number_of_episodes(api) {
  var num = api['_embedded']['episodes'].length;
  Logger.log("Number of episodes: " + num);
  return num;
}

function get_show_status(api) {
  Logger.log("status: " + api['status']);
  return api['status'];
}

function getAirdate(api, episode_num) {
  var dateStr = api['_embedded']['episodes'][episode_num]['airstamp'];
  var runtime = api['_embedded']['episodes'][episode_num]['runtime'];
  Logger.log("AirStamp " + dateStr);
  Logger.log("Runtime " + runtime);

  var arr = dateStr.split("-");
  var year = parseInt(arr[0], 10);
  // Months are base 0 for some reason
  var month_num = parseInt(arr[1], 10) - 1;
  var month_str = month[month_num];

  // There is a T in the stamp from tvmaze... So remove it.
  arr = arr[2].split("T");
  var day = arr[0];
  var time = arr[1];
  // add a space in front of the timezone offset
  time = time.split('+').join(' +');
  time = time.split('-').join(' -');

  // Create a string that is recognized by new Date()
  var date_str = month_str + " " + day + ", " + year + " " + time
  var date_start = new Date(date_str);

  var date_end = new Date(date_start)
  date_end.setMinutes(date_start.getMinutes() + runtime)

  Logger.log("Start Stamp: " + date_start);
  Logger.log("End Stamp: " + date_end);
  return [date_start, date_end];
}

function getScoreURL(name) {
  var url = "http://api.tvmaze.com/search/shows?q=" + name

  Logger.log("URL: " + url);
  return url;
}

function getEpisodeURL(id) {
  var url = "http://api.tvmaze.com/shows/" + id + "?embed=episodes"

  Logger.log("URL: " + url);
  return url;
}

function getShowsFromEmail() {
  var label = GmailApp.getUserLabelByName(mylabel);
  if (label == null) {
    Logger.log("label \"" + mylabel + "\" does not exist.");
    return -1;
  }
  var threads = label.getThreads();

  var shows_to_add = new Array();
  // Iterate through all threads with the specified label
  for (var i = 0; i < threads.length; i++) {
    // Iterate through all the messages in the thread
    for (var k = 0; k < threads[i].getMessageCount(); k++) {
      var msg = threads[i].getMessages()[k].getBody();
      var ar = [];
      var sp = msg.split("<br />\n");
      for (var n = 0; n < sp.length; n++) {
        var sub = sp[n].split("\n");
        for (var j = 0; j < sub.length; j++) {
          ar.push(sub[j]);
        }
      }
      shows_to_add.push.apply(shows_to_add, ar);
    }
    threads[i].moveToTrash();
  }
  // Remove empty elements from the array.
  shows_to_add = shows_to_add.filter(function(n) { return n });
  return shows_to_add;
}

function check_for_updates(sheet) {
  // Get the Github API URL where we can find the latest commit hash.
  var url = "https://api.github.com/repos/hallzy/tv-show-notification/commits/"
  url = url + branch_to_check_for_updates;

  // If an API token has been specified then use it, otherwise, don't.
  if (api_token !== "") {
    url = url + "?access_token="
    url = url + api_token
  }

  // Try to fetch the content of the API as a string
  try {
    var newhash = UrlFetchApp.fetch(url).getContentText()
  }
  catch(e) {
    Logger.log("Github API Error. No commit found.")
    email_error(e)
    throw e
  }
  // Try to parse the API response as JSON
  try {
    newhash = JSON.parse(newhash)
  }
  catch(e) {
    Logger.log("Failed to Parse \"newhash\"")
    email_error(e)
    throw e
  }
  // Try to access the "sha" property
  try {
    newhash = newhash["sha"]
  }
  catch(e) {
    Logger.log("No hash in JSON")
    email_error(e)
    throw e
  }
  Logger.log(newhash)

  var oldhash;
  // Get the previously saved hash from the sheet
  if (sheet.isVersionHashBlank()) {
    Logger.log("hash is initialized to: " + newhash);
    sheet.setVersionHash(newhash)
  }
  else {
    oldhash = sheet.getVersionHash()
    if (newhash != oldhash) {
      Logger.log("hash is now: " + newhash);
      email_alert_for_script_update(newhash, oldhash);
      sheet.setVersionHash(newhash)
    }
  }
  Logger.log("Old hash is: " + oldhash);
}

function reset_tv_show(currentshow) {
  var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];

  // Reset the number of episodes
  sheet.getRange(currentshow + 1, 3).setValue("");
  // Reset the Status of the episodes
  sheet.getRange(currentshow + 1, 4).setValue("");
  // Reset the null column
  sheet.getRange(currentshow + 1, 5).setValue("");
}

function addEmailedShowsToSheet(sheet) {
  // Populate an array of the current shows in the sheet
  var current_shows = new Array();
  for (var k = 0; k < sheet.getLastRow; k++) {
    current_shows.push(sheet.getShowName(k).toString().toLowerCase());
  }

  // Get show names from emails
  var shows_to_add_from_email = getShowsFromEmail();
  if (shows_to_add_from_email == -1) {
    return -1;
  }

  // Convert all shows to lowercase
  var tmp = shows_to_add_from_email.join("~~~").toLowerCase();
  shows_to_add_from_email = tmp.split("~~~");

  // If a show exists in the emailed shows that already exists in the sheet,
  // delete it from the array of emailed shows
  shows_to_add_from_email = shows_to_add_from_email.filter( function( el ) {
    return current_shows.indexOf( el ) < 0;
  } );

  Logger.log(shows_to_add_from_email);

  // Any show that is left from the emailed shows, append it to the sheet.
  for (var i = 0; i < shows_to_add_from_email.length; i++) {
    sheet.appendShow(shows_to_add_from_email[i]);
  }
}

function getResponseWithShowScores(showname, episodes_added_to_calendar) {
  // get the API URL for the current show
  var url = getScoreURL(showname.toLowerCase());
  // remove whitespace from the end of the URL
  url = url.replace(/^\s+|\s+$/g, '');

  // If we fail to get a response, send off some logs and exit
  var exit_now = false;
  try {
    var response = UrlFetchApp.fetch(url);
    return response;
  }
  catch(e) {
    exit_now = true;
    var err = e;
  }

  if (exit_now == true) {
    if (added_episode_alert == true) {
      email_alert_for_added_episodes(episodes_added_to_calendar);
    }
    if (debug == true) {
      email_log();
    }

    email_error(err);
    throw err;
  }
  return response;
}

function getResponseWithEpisodes(id, episodes_added_to_calendar) {
  // get the API URL for the current show
  var url = getEpisodeURL(id);

  // If we fail to get a response, send off some logs and exit
  var exit_now = false;
  try {
    var response = UrlFetchApp.fetch(url);
  }
  catch(e) {
    exit_now = true;
    var err = e;
  }

  if (exit_now == true) {
    if (added_episode_alert == true) {
      email_alert_for_added_episodes(episodes_added_to_calendar);
    }
    if (debug == true) {
      email_log();
    }

    email_error(err);
    throw err;
  }
  return response;
}


// Google Sheet Class//{{{
function GoogleSheet() {
  this.base       = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
  this.getData    = this.base.getDataRange().getValues();
  this.getLastRow = this.base.getDataRange().getLastRow();

  this.getShowID = function(index) {
    return this.getData[index][0];
  };

  this.getShowName = function(index) {
    return this.getData[index][1];
  };

  this.getNumberOfEpisodes = function(index) {
    return this.getData[index][2];
  };

  this.getShowStatus = function(index) {
    return this.getData[index][3];
  };

  this.getVersionHash = function() {
    return this.getData[0][6]
  };

  this.isVersionHashBlank = function() {
    return this.base.getRange(1, 7).isBlank();
  };

  this.isNullColumnBlank = function(show) {
    return this.base.getRange(show+1, 5).isBlank();
  };

  this.getNullColumn = function(show) {
    return this.base.getRange(show+1, 5).getValue();
  };

  this.setShowID = function(show, string) {
    this.base.getRange(show+1, 1).setValue(string);
  };

  this.setNullColumn = function(show, string) {
    this.base.getRange(show+1, 5).setValue(string);
  };

  this.setVersionHash = function(hash) {
    this.base.getRange(1, 7).setValue(hash);
  };

  this.appendShow = function(showname) {
    this.base.appendRow(["", showname]);
  };

  this.setStatus = function(show, show_status) {
    this.base.getRange(show+1, 4).setValue(show_status);
  };

  this.setNumberOfEpisodes = function(show, value) {
    this.base.getRange(show+1, 3).setValue(value);
  };

  this.Update = function() {
    this.base       = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
    this.getData    = this.base.getDataRange().getValues();
    this.getLastRow = this.base.getDataRange().getLastRow();
  };
}
//}}}

function run() {
  // Get the google sheet with TV show data
  var sheet = new GoogleSheet();

  if (auto_update_check == true) {
    check_for_updates(sheet);
  }

  addEmailedShowsToSheet(sheet);

  var episodes_added_to_calendar = new Array();

  // Iterate through every TV show
  for (k = 0; k < sheet.getLastRow; k++) {
    var currentshow_index = k;

    // Repopulate the sheet after adding emailed shows to the sheet. Also,
    // execute this when we come back through the loop for rechecking shows.
    sheet.Update();

    var showname = sheet.getShowName(currentshow_index).toString();
    Logger.log("==============================");
    Logger.log("Show Name: " + showname);
    Logger.log("Show Index: " + k);
    var sheet_num_episodes = undefined;
    var sheet_num_episodes = sheet.getNumberOfEpisodes(currentshow_index);

    // get show ID
    var sheet_show_id = sheet.getShowID(currentshow_index);
    // if no show id in sheet, get the list of shows with the same name
    if (sheet_show_id == null || sheet_show_id == "") {
      var response = getResponseWithShowScores(showname, episodes_added_to_calendar);
      var json_string = response.getContentText();
      var api_w_score = JSON.parse(json_string);
      if (api_w_score.length == 1) {
        var id = api_w_score[0]['show']['id'].toString()
        sheet.setShowID(currentshow_index, id);
      }
      else if (api_w_score.length < 1) {
        // Error
        continue;
      }
      else {
        var score1 = parseFloat(api_w_score[0]['score'])
        var score2 = parseFloat(api_w_score[1]['score'])
        var diff = score1 - score2

        if (diff < 1) {
          emailUserToManuallyEnterShowID(api_w_score);
          continue;
        }
        var id = api_w_score[0]['show']['id'].toString()
        sheet.setShowID(currentshow_index, id);
      }
    }

    sheet.Update();
    sheet_show_id = sheet.getShowID(currentshow_index);

    var response = getResponseWithEpisodes(sheet_show_id, episodes_added_to_calendar);


    // Get the TV show data from the API
    var json_string = response.getContentText();
    var api = JSON.parse(json_string);
    var api_episodes = api['_embedded']['episodes'];
    var api_num_episodes = get_number_of_episodes(api);

    if (api_num_episodes < sheet_num_episodes) {
      // If we know of more episodes than what exist, something weird has
      // happened. We should reset the show
      reset_tv_show(currentshow_index);
      email_error_about_the_reset(showname, sheet_num_episodes, api_num_episodes);

      // Now re loop for this show to make sure we do not miss anything.
      k--;
      continue;
    }

    if (get_status_change_alert == true) {
      var show_status_sheet = undefined;
      var show_status_sheet = sheet.getShowStatus(currentshow_index);
      var show_status_api = get_show_status(api);

      if (show_status_sheet != show_status_api) {
        email_status_change(showname, show_status_sheet, show_status_api);
      }
      show_status_sheet = show_status_api;
      sheet.setStatus(currentshow_index, show_status_sheet);
    }

    // If we don't have a number, create it. The number will be the number of
    // episodes that are before today's date
    if (sheet_num_episodes == null || sheet_num_episodes == "") {
      var now = new Date();

      sheet_num_episodes = 0;
      // Iterate through every episode of the current TV show, starting from the
      // latest episode, going through towards the first episode
      for (var i = api_num_episodes-1; i >= 0; i--) {
        var no_stamp = false;
        var stamp = api_episodes[i]['airstamp'];
        // if the stamp is non existent, continue to the next iteration
        if (stamp == null || stamp == "") {
          continue;
        }
        // if the current episode starts before today, make that episode number
        // be the number of episodes that we know of. Break out of the loop
        var airTime = getAirdate(api, i);
        var start_time = airTime[0];
        var end_time = airTime[1];
        if (end_time < now) {
          sheet_num_episodes = i+1;
          break;
        }
      }
    }


    // Get the null stamps from the spreadsheet
    var episodes_with_null_stamps = new Array();
    if (sheet.isNullColumnBlank(currentshow_index)) {
      var json_null_stamped_episodes = {};
    }
    else {
      var json_null_stamped_episodes = JSON.parse(sheet.getNullColumn(currentshow_index));
    }

    var episodes_with_null_stamps = [];

    // Populate my array of episodes with null stamps with the API data
    for (var x in json_null_stamped_episodes) {
      episodes_with_null_stamps.push(json_null_stamped_episodes[x]);
    }

    Logger.log("Episodes with null stamps: " + episodes_with_null_stamps);

    // Iterate through all these episodes and check to see if the stamp has been
    // updated from null. If it has check if the airdate for it is after today,
    // and if it is prepare it for addition to the calendar.
    var indices_to_remove = new Array();
    for (var i = 0; i < episodes_with_null_stamps.length; i++) {
      var episode = episodes_with_null_stamps[i];
      var stamp = api_episodes[episode]['airstamp'];
      // If a show is no longer null, then I want it added to the calendar, so
      // long as it is still a future event
      if (stamp != null && stamp != "") {
        indices_to_remove.push(i);
        var airTime = getAirdate(api, episode);
        var start_time = airTime[0];
        var end_time = airTime[1];
        if (end_time > new Date()) {
          add_show_to_calendar(api['name'], start_time, end_time);
          episodes_added_to_calendar.push(api['name'] + ": " + start_time);
        }
      }
    }

    // Now remove the episodes from the null list if we determined that they are
    // no longer null
    for (var i = 0; i < indices_to_remove.length; i++) {
      episodes_with_null_stamps.splice(indices_to_remove[i], 1);
    }


    // if this happens, we need to add them to calendar
    while (api_num_episodes > sheet_num_episodes) {
      var no_stamp = false;
      var stamp = api_episodes[sheet_num_episodes]['airstamp'];
      if (stamp == null || stamp == "") {
        episodes_with_null_stamps.push(sheet_num_episodes);
        sheet_num_episodes++;
        Logger.log(showname);
        email_error_about_no_airstamp(showname, sheet_num_episodes)
        continue;
      }
      airTime = getAirdate(api, sheet_num_episodes);
      var start_time = airTime[0];
      var end_time = airTime[1];
      // Only Add the episode of it is still in the future
      if (end_time > new Date()) {
          add_show_to_calendar(api['name'], start_time, end_time);
          episodes_added_to_calendar.push(api['name'] + ": " + start_time);
        }
      sheet_num_episodes++;
    }

    var myJsonString = JSON.stringify(episodes_with_null_stamps);
    sheet.setNullColumn(currentshow_index, myJsonString);

    //set sheet_num_episodes in the sheet
    sheet.setNumberOfEpisodes(currentshow_index, sheet_num_episodes);
    Logger.log("==============================");
  }

  if (added_episode_alert == true) {
    email_alert_for_added_episodes(episodes_added_to_calendar);
  }

  if (debug == true) {
    email_log();
  }

}
