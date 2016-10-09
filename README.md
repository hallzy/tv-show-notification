# TV Show Notification

This is a google script that fetches information about TV Shows, and will set
calendar events in your Google Calendar for air dates of your favourite TV
Shows. The script will find the time of day the show airs as well.

If the date and time cannot be found for a particular show, an email will be
sent to you to warn you that this happened. The script will not check this
episode again.

The `master` branch will be considered the stable branch. The `dev` branch will
be used to develop and do initial testing. The `dev` branch should not be used.
The `testing` branch is code that I consider done and in a working state, but I
have not tested the code to the point that it should be in master. For this
reason `testing` branch can be used for if you so choose, but do so at your own
risk.

## Initial Setup

This will be a step by step guide to start using the script:

Open you Google Drive, and create a new Google Script file by clicking `New ->
more -> Google Apps Script`. Call it whatever you want, and just copy the
contents of `add-event-to-calendar.gs` to this new file. You can bury it in any
folder you want, it doesn't care where it goes.

In your Google Drive, create a new spreadsheet and call it whatever you want.
We will use this spreadsheet to start adding TV Shows to. As a start, put the
name of a TV show into cell A1. Note that the "A" column is where all the TV
show names will be. Column "B" will be used by the script to save how many
episodes the script knows about already. For example, if the script knows of
40 episodes, but only 40 episodes are still known, the script won't do
anything for that show until a new episode becomes known.

Now open the script from the first step. There is a line at the top of the file
like this:

```javascript
var spreadsheet_id = "FILL THIS"
```

Change the `FILL THIS` to the id of the spreadsheet you made in the previous
step. The id is found in the URL of the spreadsheet. If the spreadsheet has this
URL:

``` docs.google.com/spreadsheets/d/1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I/edit#gid=0 ```

Then `1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I` is your id, so the
`spreadsheet_id` variable changes to this:

```javascript
var spreadsheet_id = "1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I"
```

Now make sure that the script is saved. And run the script by pressing `Run ->
run`. Google will ask you about some permissions such as asking if it is okay
for the script to use spreadsheets and stuff like that. You have to say yes or
the script won't run. If you added something to your sheet earlier, we should
now have a calendar entry somewhere for that show, as long as it has an upcoming
episode. If you don't have a calendar entry, check the spreadsheet to see of the
"B" column was populated with a number. If it wasn't, file an issue. If it is
populated, go to your Calendar and do a search. If nothing appears, it probably
means there is no known upcoming episode for the show.

Finally, while still inside the script, at the top of the screen click:
`Resources -> Current Project's Triggers`. Now click the blue text that says `No
triggers set up. Click here to add one now`.

For the drop down menu under "Run" make sure you select "run". This runs the
"run" function inside the script. For events, you can select any type of trigger
you want. This will determine how often the script is run automatically.

From this there is also a `notifications` button. If you set this up, the script
will email you if it fails for some reason.

Now we are done. You will never need to go back to the script. If you want to
ever add or delete a show from being searched for, just edit the spreadsheet
file.

## Updating Your Script

If you want to get a newer version of this script remove all the code from the
current script you have, while saving the variables at the top of the code such
as your spreadsheet id.

Copy all of the new code into your current script (which is now empty) and
replace the variables at the top with your settings.

Check to see if the new code has a new variable at the top of the code. If you
are unsure of what a variable is for or the possible options you can give, then
see below in the section "Configuration Variables".

Once you have filled in the variables, save the file and do a manual run. This
will check to see if the script now requires new permissions for newly added
features. In order to continue accept the new requirements.



## Configuration Variables

All variables must contain a value of some kind.



### var spreadsheet_id

This is a string that comes from the URL of the spreadsheet you will use to
store your tv shows. For example, if your spreadsheet has the URL
`https://docs.google.com/spreadsheets/d/1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I/edit#gid=0`,
then your `spreadsheet_id` is `"1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I"`,
with the quotes included.

This is essential in order to get the script to work.



### var get_status_change_alert

This is a variable that controls if you get email notifications for a status
change of a TV Show. For example, if you are following a TV Show, and it changes
from `running` to `ended`, you will get a email notification saying that that TV
Show has now ended.

#### Default

The default setting is `false`.

#### Possible Values:

`var get_status_change_alert = true` means that you will receive the email
notification when this occurs.

`var get_status_change_alert = false` means that you will NOT receive the email
notification when this occurs.



### var calendar_id

This variable tells the script what calendar it should use.

#### Default

The default setting is `""`.

#### Possible Values:

`var calendar_id = ""` or `var calendar_id = null` means that the script will
use the default calendar that is setup (by default, this is the main calendar
that comes with your account).

`var calendar_id = "calendarid"` specifies to use a specific calendar based on
the id. For this example my id is `calendarid`. To find your calendar id, go to
your calendars. On the left side will be a list of calendars that you have.
Hover over the calendar you want and click the little arrow that shows up to the
right of the calendar name then select calendar settings. On this page you will
see `Calendar ID: someid` where `someid` is your calendar id. Now copy this
value and put it into the script as the above variable.



### var debug

This variable tells the script if you want to get emailed log reports.

#### Default

The default setting is `false`.

#### Possible Values:

`var debug = true` means that you want to get emails with the logs for
every execution of the script.

`var debug = false` means that you do NOT want to get emails with the logs
at all.



### var added_episode_alert

This variable tells the script if you want to get emailed every time a new
episode is added to your calendar. It will give you the name of the show, and
the start date and time of that episode. All additions for that execution of the
script will be in the same email.

#### Default

The default setting is `false`.

#### Possible Values:

`var added_episode_alert = true` means that you want to get the emails.

`var added_episode_alert = false` means that you do NOT want to get the emails.


### var mylabel

This variable tells the script what label to look for in your gmail for adding
new episodes.

The script will check your inbox for messages with a label on them that matches
the variable `mylabel`. If it does, it checks takes the body of the email and
assumes that it is a newline separated list of TV Show titles (ie. Your email is
a list of TV Show titles with a new title on each line). It will then take those
titles, and append them to your spreadsheet for you as long as that TV show does
not already exist in the sheet (the check is case insensitive, so a TV Show
named `Suits` and `suits` are seen as the same. Any other difference in
spelling, spelling or other characters will be treated as a new show).

The easiest way to make assign labels automatically is to setup a filter in
gmail.

#### Setting up a Filter to Use "mylabel"

1. Go to your gmail inbox.

2. Press the gear icon on the right and select `Settings`.

3. Select the tab at the top labelled `Filters and Blocked Addresses`.

4. Click the button that says `Create a new filter`.

5. Select the criteria that you want to match then press the button that says
   `Create filter with this search` (The button is in the bottom right of the
   window that pops up) (For me, I selected to specify that `From` should only
   be my email address, and `subject` is `TV Shows: Add to Calendar`. This
   filter will then be triggered every time I send myself an email from my own
   email with the subject `TV Shows: Add to Calendar`).

6. On the next screen check the box for `Apply the label:` and then select the
   label that you defined by the variable `mylabel`. If you haven't already
   created this label, select the button to create a new label.

7. Select `Create Filter`.

8. Make sure that the label is defined in the script, and that is all that needs
   to be done. The email you send yourself will be deleted by the script once it
   is read, so do not delete these emails manually.

#### Default

The default setting is `"TV Show Script"`.


### var branch_to_check_for_updates

This variable tells the script what branch to check for updates. It will use
this to see if any new commits have come in since the last time the update
function was run.

#### Default

The default setting is `"master"`.

#### Possible Values:

`var branch_to_check_for_updates = "master"`

`var branch_to_check_for_updates = "testing"`

`var branch_to_check_for_updates = "dev"`


### var auto_update_check

This variable tells the script if you want the update function to run
automatically when you run your script. When the update script is run you will
get a email if an update has happened since the last time the script ran. You
will not receive an email at any other time.

Note that this will **NOT** update the script. It will just warn you of updates
that have occurred.

#### Default

The default setting is `true`.

#### Possible Values:

`var auto_update_check = true` Means to check for updates automatically before
looking for TV Shows.

`var auto_update_check = false` Means that the script will never automatically
check for updates for you. So you will need to manually run the
`check_for_updates` function in order to get updates.

## Questions

### What if I Accidentally mess with the data in the sheet?

Changing the "A" column is perfectly okay, since this is the column you will use
to tell the script what shows you want. You can freely add and delete new shows
as you choose.

If you change data in any of the other columns and ff it isn't too late to undo
what you just did, then do that.

Otherwise you can just make the cell blank. A blank cell is interpreted as an
undefined value and the script will create a starting value, as if it was the
first time it was populating that cell.

## Thanks To

* `tvmaze.com` for the amazingly easy to use API to gather TV Show data.
