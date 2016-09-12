// If you are unsure if a show will be recognized, check to see what data is given by going to:
// http://api.tvmaze.com/singlesearch/shows?q=TV SHOW NAME&embed=episodes
// by replacing "TV SHOW NAME" with the name of the tv show

// For a sheet with
// URL = https://docs.google.com/spreadsheets/d/1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I/edit#gid=0
// Change these variables variable
var spreadsheet_id = "FILL THIS";
var get_status_change_alert = false;
var calendar_id = "";
var debug = false;
var added_episode_alert = false;
var mylabel = "TV Show Script";


var month = new Array();
month[0] = "January";
month[1] = "February";
month[2] = "March";
month[3] = "April";
month[4] = "May";
month[5] = "June";
month[6] = "July";
month[7] = "August";
month[8] = "September";
month[9] = "October";
month[10] = "November";
month[11] = "December";

var idx = 0;
function add_show_to_calendar(title, date) {
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
  myCalendar.createEvent(title, date[0], date[1]);
  Logger.log("Added Event: " + title + ", " + date[0] + " to " + date[1]);
}

function email_log() {
  var body = Logger.getLog();
  var subject = "TV Show Script: Execution Log"
  var recipient = Session.getActiveUser().getEmail();
  MailApp.sendEmail(recipient, subject, body);
}

function get_number_of_episodes(data) {
  var num = data['_embedded']['episodes'].length;
  Logger.log("Number of episodes: " + num);
  return num;
}

function get_show_status(data) {
  Logger.log("status: " + data['status']);
  return data['status'];
}

function getAirdate(data, episode_num) {
  var dateStr = data['_embedded']['episodes'][episode_num]['airstamp'];
  var runtime = data['_embedded']['episodes'][episode_num]['runtime'];
  Logger.log("AirStamp " + dateStr);
  Logger.log("Runtime " + runtime);

  var arr = dateStr.split("-");
  var year = parseInt(arr[0], 10);
  // Months are base 0 for some reason
  var month_num = parseInt(arr[1], 10) - 1;
  var month_str = month[month_num];

  // There is a T in the stamp from tvmaze... so remove it.
  arr = arr[2].split("T");
  var day = arr[0];
  var time = arr[1];
  // add a space in front of the timzone offset
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

function getURL(name) {
  var url1 = "http://api.tvmaze.com/singlesearch/shows?q="
  var url2 = name;
  var url3 = "&embed=episodes"
  var url = url1 + url2 + url3;

  Logger.log("URL: " + url);
  return url;

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
  var recipient = Session.getActiveUser().getEmail();
  MailApp.sendEmail(recipient, subject, body);
}

function email_error_about_no_airstamp(showname, episode_num) {
  var body = "\"" + showname + "\"" + " episode #" + episode_num;
  body = body + " contains no information about the airdate. This episode was";
  body = body + " not automatically added to your calendar";
  var subject = "Automated Message: TV Show Not Added to Calendar"
  var recipient = Session.getActiveUser().getEmail();
  MailApp.sendEmail(recipient, subject, body);
}

function email_alert_for_added_episodes(arr) {
  var size = arr.length;
  if (size >= 1) {
    var body = "";
    for (k = 0; k < size; k++) {
      body = body + "\n" + arr[k];
    }
    var subject = "Automated Message: TV Shows Added to Calendar"
    var recipient = Session.getActiveUser().getEmail();
    MailApp.sendEmail(recipient, subject, body);
  }

}

function getShowsFromEmail() {
  var label = GmailApp.getUserLabelByName(mylabel);
  var threads = label.getThreads();

  var shows_to_add = new Array();
  // Iterate through all threads with the specified label
  for (var i = 0; i < threads.length; i++) {
    // Iterate through all the messages in the thread
    for (var k = 0; k < threads[i].getMessageCount(); k++) {
      var msg = threads[i].getMessages()[k].getBody();
      msg = msg.split("<br />\n");
      shows_to_add.push.apply(shows_to_add, msg);
    }
    threads[i].moveToTrash();
  }
  // Remove empty elements from the array.
  shows_to_add = shows_to_add.filter(function(n) { return n });
  return shows_to_add;
}


function run() {
  var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
  var sheet_data = sheet.getDataRange().getValues();
  var lastrow = sheet.getDataRange().getLastRow();

  // Populate an array of the current shows in the sheet
  var current_shows = new Array();
  for (var k = 0; k < lastrow; k++) {
    current_shows.push(sheet_data[k][0].toString().toLowerCase());
  }

  // Get show names from emails
  var shows_to_add_from_email = getShowsFromEmail();

  // Convert all shows to lowercase
  var tmp = shows_to_add_from_email.join("~~~").toLowerCase();
  shows_to_add_from_email = tmp.split("~~~");

  // If a show exists in the emailed shows that already exists in the sheet,
  // delete it from the array of emailed shows
  shows_to_add_from_email = shows_to_add_from_email.filter( function( el ) {
      return current_shows.indexOf( el ) < 0;
  } );

  // Any show that is left from the emailed shows, append it to the sheet.
  for (var i = 0; i < shows_to_add_from_email.length; i++) {
    sheet.appendRow([shows_to_add_from_email[i]]);
  }

  // Recalculate these after shows have been appended.
  var sheet_data = sheet.getDataRange().getValues();
  var lastrow = sheet.getDataRange().getLastRow();

  var episodes_added_to_calendar = new Array();

  for (k = 0; k < lastrow; k++) {
    var currentshow = k;
    var currentshow_base1 = currentshow+1;

    var showname = sheet_data[currentshow][0].toString()
    Logger.log("==============================");
    Logger.log("Show Name: " + showname);
    Logger.log("Show Index: " + k);
    var showname_url = showname.toLowerCase();
    //sheet_data[row][column] -- ie B1 = sheet_data[0][1]
    var number_of_episodes_we_know = undefined;
    var number_of_episodes_we_know = sheet_data[currentshow][1];

    var url = getURL(showname_url);

    var response = UrlFetchApp.fetch(url);
    var json_string = response.getContentText();
    var data = JSON.parse(json_string);
    var episodes = data['_embedded']['episodes'];

    var num_episodes = get_number_of_episodes(data);

    if (get_status_change_alert == true) {
      var show_status_sheet = undefined;
      var show_status_sheet = sheet_data[currentshow][2];
      var show_status_current = get_show_status(data);

      // This is the first time we are checking for the status of the show
      if (show_status_sheet == null) {
        show_status_sheet = show_status_current;
        sheet.getRange(currentshow_base1, 3).setValue(show_status_sheet);
      }
      else if (show_status_sheet != show_status_current) {
        email_status_change(showname, show_status_sheet, show_status_current);
        show_status_sheet = show_status_current;
        sheet.getRange(currentshow_base1, 3).setValue(show_status_sheet);
      }
    }


    // If we don't have a number, create it. The number will be the number of
    // episodes that are before todays date
    if (number_of_episodes_we_know == null || number_of_episodes_we_know == "") {
      var now = new Date();

      number_of_episodes_we_know = 0;
      for (var i = num_episodes-1; i >= 0; i--) {
        var no_stamp = false;
        var stamp = episodes[i]['airstamp'];
        if (stamp == null || stamp == "") {
          continue;
        }
        var airdate = getAirdate(data, i);
        if (airdate[1] < now) {
          number_of_episodes_we_know = i+1;
          break;
        }
      }
    }

    // if this happens, we need to add them to calendar
    while (num_episodes > number_of_episodes_we_know) {
      var no_stamp = false;
      var stamp = episodes[number_of_episodes_we_know]['airstamp'];
      if (stamp == null || stamp == "") {
        number_of_episodes_we_know++;
        Logger.log(showname);
        email_error_about_no_airstamp(showname, number_of_episodes_we_know)
        continue;
      }
      airdate = getAirdate(data, number_of_episodes_we_know);
      add_show_to_calendar(data['name'], airdate);
      episodes_added_to_calendar.push(data['name'] + ": " + airdate[0]);
      number_of_episodes_we_know++;
    }

    //set number_of_episodes_we_know in the sheet
    sheet.getRange(currentshow_base1, 2).setValue(number_of_episodes_we_know);
    Logger.log("==============================");
  }

  if (added_episode_alert == true) {
    email_alert_for_added_episodes(episodes_added_to_calendar);
  }

  if (debug == true) {
    email_log();
  }

}

