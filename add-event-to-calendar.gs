// If you are unsure if a show will be recognized, check to see what data is given by going to:
// http://api.tvmaze.com/singlesearch/shows?q=TV SHOW NAME&embed=episodes
// by replacing "TV SHOW NAME" with the name of the tv show

// For a sheet with
// URL = https://docs.google.com/spreadsheets/d/1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I/edit#gid=0
// Change this variable
var spreadsheet_id = "FILL THIS"

function add_show_to_calendar(title, date) {
  CalendarApp.getDefaultCalendar().createAllDayEvent(title, date);
}

function get_number_of_episodes(data) {
  return data['_embedded']['episodes'].length;
}

function getAirdate(data, episode_num) {
  var dateStr = data['_embedded']['episodes'][episode_num]['airdate'];

  var arr = dateStr.split("-");
  var year = parseInt(arr[0], 10);
  // Months are base 0 for some reason
  var month = parseInt(arr[1], 10) - 1;
  var day = parseInt(arr[2], 10);

  return new Date(year, month, day)
}

function getURL(name) {
  var url1 = "http://api.tvmaze.com/singlesearch/shows?q="
  var url2 = name;
  var url3 = "&embed=episodes"

  return url1 + url2 + url3;

}

function run() {
  if (spreadsheet_id == "FILL THIS") {
    return
  }

  var sheet = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0].getDataRange().getValues();
  var lastrow = SpreadsheetApp.openById(spreadsheet_id).getSheets()[0].getDataRange().getLastRow();

  for (k = 0; k < lastrow; k++) {
    var currentshow = k;
    var currentshow_base1 = currentshow+1;

    var showname = sheet[currentshow][0].toString()
    var showname_url = showname.toLowerCase();
    //sheets[row][column] -- ie B1 = sheets[0][1]
    var number_of_episodes_we_know = undefined;
    var number_of_episodes_we_know = sheet[currentshow][1];

    var url = getURL(showname_url);

    var response = UrlFetchApp.fetch(url);
    var json_string = response.getContentText();
    var data = JSON.parse(json_string);
    var episodes = data['_embedded']['episodes'];

    var num_episodes = get_number_of_episodes(data);


    // If we don't have a number, create it. The number will be the number of episodes that are before todays date
    if (number_of_episodes_we_know == null || number_of_episodes_we_know == "") {
      var now = new Date();

      number_of_episodes_we_know = 0;
      for (var i = num_episodes-1; i >= 0; i--) {
        var airdate = getAirdate(data, i);
        if (airdate < now) {
          number_of_episodes_we_know = i+1;
          break;
        }
      }
    }

    // if this happens, we need to add them to calendar
    while (num_episodes > number_of_episodes_we_know) {
      airdate = getAirdate(data, number_of_episodes_we_know);
      Logger.log(airdate);
      add_show_to_calendar(data['name'], airdate);
      number_of_episodes_we_know++;

    }

    //set number_of_episodes_we_know in the sheet
    SpreadsheetApp.openById(spreadsheet_id).getSheets()[0].getRange(currentshow_base1, 2).setValue(number_of_episodes_we_know);
  }
}
