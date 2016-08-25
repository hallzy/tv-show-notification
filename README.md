# TV Show Notification

NOTE: Not yet functional.

This script will be scheduled to run and find dates of TV shows that I watch. An
email will be sent to my inbox which will execute a google script on the email,
and add it to my google calendar.

## Setup

Start a filter in gmail to separate these emails by a label called `TV Show
Script`

Set the google script to run on a clock (Make a test run so that you can tell
the script that it is okay to access your mail and calendar).

Set a cronjob for the bash script.

## Todo

* Make the bash script that finds the tv shows.
* Add more details about usage to README.
