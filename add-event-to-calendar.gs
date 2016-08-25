LABEL = "TV Show Script";

function AddToCalendar() {
  var label_pending = GmailApp.getUserLabelByName(LABEL);

  var threads = label_pending.getThreads();

  for (var t in threads) {
    var thread = threads[t];

    var messages = thread.getMessages();

    for (m in messages) {
      var msg = messages[m].getPlainBody();
      var title = msg.substring(0, msg.lastIndexOf(", "));
      var dateStr = msg.substring(msg.lastIndexOf(", ")+2, msg.length);
      dateStr = dateStr.replace("th", ",");
      var date = new Date(dateStr);

      Logger.log(date);
      Logger.log(dateStr);

      CalendarApp.getDefaultCalendar().createAllDayEvent(title, date);
    }
    thread.moveToTrash();
  }
}

