// If you are unsure if a show will be recognized, check to see what data is given by going to:
// http://api.tvmaze.com/singlesearch/shows?q=TV SHOW NAME&embed=episodes
// by replacing "TV SHOW NAME" with the name of the tv show

// For a sheet with
// URL = https://docs.google.com/spreadsheets/d/1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I/edit#gid=0
// Change these variables variable
var spreadsheet_id = "FILL THIS"
var get_status_change_alert = true
var calendar_id = ""


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
    Utilities.sleep(3000);
    idx = 0;
  }
  else {
    idx++;
  }

  // Use the default calendar if one is not specified.
  if (calendar_id == "" || calendar_id == null) {
    var myCalendar = CalendarApp.getDefaultCalendar()
  }
  else {
    var myCalendar = CalendarApp.getCalendarById(calendar_id)
  }
  myCalendar.createEvent(title, date[0], date[1]);
}

function get_number_of_episodes(data) {
  return data['_embedded']['episodes'].length;
}

function get_show_status(data) {
  return data['status'];
}

function getAirdate(data, episode_num) {
  var dateStr = data['_embedded']['episodes'][episode_num]['airstamp'];
  var runtime = data['_embedded']['episodes'][episode_num]['runtime'];

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

  return [date_start, date_end];
}

function getURL(name) {
  var url1 = "http://api.tvmaze.com/singlesearch/shows?q="
  var url2 = name;
  var url3 = "&embed=episodes"

  return url1 + url2 + url3;

}

function email_status_change(showname, old_val, new_val) {
  var body = "The status of \"" + showname + "\" has changed from \"" + old_val;
  body = body + "\" to " + new_val + "\".";
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

function run() {
  var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0];
  var sheet_data = sheet.getDataRange().getValues();
  var lastrow = sheet.getDataRange().getLastRow();

  for (k = 0; k < lastrow; k++) {
    var currentshow = k;
    var currentshow_base1 = currentshow+1;

    var showname = sheet_data[currentshow][0].toString()
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
      number_of_episodes_we_know++;
    }

    //set number_of_episodes_we_know in the sheet
    sheet.getRange(currentshow_base1, 2).setValue(number_of_episodes_we_know);
  }
}

