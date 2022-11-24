# TV Show Notification

## Description

This is a google script that fetches information about TV Shows, and will set
calendar events in your Google Calendar for air dates of your favourite TV
Shows. The script will find the time of day the show airs as well.

If the date and time cannot be found for a particular show, an email will be
sent to you to warn you that this happened. A list of the episodes that have
been found to be null will be held in the fifth column of the spreadsheet. The
script will continue to check these episodes until the script removes them
(which only happens when a time stamp has been found for it). You may choose to
remove them yourself by manually editing the cells if you feel the need to do
so.

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
folder you want, it doesn't care where it goes (the `*.ts` file is for
development only and will not work directly with google script).

In your Google Drive, create a new spreadsheet and call it whatever you want.
We will use this spreadsheet to start adding TV Shows to. As a start, put the
name of a TV show into cell B1. Note that the "B" column is where all the TV
show names will be. Column "C" will be used by the script to save how many
episodes the script knows about already. For example, if the script knows of
40 episodes, but only 40 episodes are still known, the script won't do
anything for that show until a new episode becomes known.

### Overview of the Columns

#### Column A

Column `A` is used to hold the unique Show ID that TVMaze uses. This value will
be found automatically if possible using just the TV Show name that you specify.
If The script has a hard time finding out what TV Show to pick given just the
name you provide, it will email you a list of the TV Shows that it thinks you
might be referring to and it will provide you with the unique ID of each, along
with a URL to go and check to see which show is the one you want. Once you have
chosen the one you want, manually fill in column `A` with the unique ID.

#### Column B

This Column Holds the Names of the shows. This is (almost always) the only
column that you will have to edit.

#### Column C

Holds the Number of episodes that the script currently knows about for that TV
show. This is automatically updated and initialized, so you will probably never
have to do anything with this.

#### Column D

Holds the current state of the show (ie. Running, ended etc). This is also
automatically initialized and updated.

#### Column E

Holds the numbers of episodes that did not have an airtime provided the
last time that the script ran. This is automatically initialized and updated as
well. This column exists so that the script knows to go back and check these
previous episodes as well as the new ones.

#### Column G

Column `G` is currently only used for cell `G1` which stores the commit hash
that was found to be the most recent commit the last time the script ran. The
script uses this value to check to see if an update has been made to the script
since the last time you ran the script.

### Continuing with Instructions

Now open the script from the first step. There is a line at the top of the file
like this:

```javascript
var SPREADSHEET_ID = "FILL THIS"
```

Change the `FILL THIS` to the id of the spreadsheet you made in the previous
step. The id is found in the URL of the spreadsheet. If the spreadsheet has this
URL:

``` docs.google.com/spreadsheets/d/1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I/edit#gid=0 ```

Then `1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I` is your id, so the
`spreadsheet_id` variable changes to this:

```javascript
var SPREADSHEET_ID = "1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I"
```

Now make sure that the script is saved. And run the script by pressing `Run ->
run`. Google will ask you about some permissions such as asking if it is okay
for the script to use spreadsheets and stuff like that. You have to say yes or
the script won't run. If you added something to your sheet earlier, we should
now have a calendar entry somewhere for that show, as long as it has an upcoming
episode. If you don't have a calendar entry, check the spreadsheet to see of the
"C" column was populated with a number. If it wasn't, file an issue. If it is
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



### var SPREADSHEET_ID

This is a string that comes from the URL of the spreadsheet you will use to
store your tv shows. For example, if your spreadsheet has the URL
`https://docs.google.com/spreadsheets/d/1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I/edit#gid=0`,
then your `SPREADSHEET_ID` is `"1RSklW9SKI535TG0LnH9cjU2c3spLtnbPBAKWahUWO7I"`,
with the quotes included.

This is essential in order to get the script to work.



### var GET_STATUS_CHANGE_ALERT

This is a variable that controls if you get email notifications for a status
change of a TV Show. For example, if you are following a TV Show, and it changes
from `running` to `ended`, you will get a email notification saying that that TV
Show has now ended.

#### Default

The default setting is `false`.

#### Possible Values:

`var GET_STATUS_CHANGE_ALERT = true` means that you will receive the email
notification when this occurs.

`var GET_STATUS_CHANGE_ALERT = false` means that you will NOT receive the email
notification when this occurs.



### var CALENDAR_ID

This variable tells the script what calendar it should use.

#### Default

The default setting is `""`.

#### Possible Values:

`var CALENDAR_ID = ""` or `var calendar_id = null` means that the script will
use the default calendar that is setup (by default, this is the main calendar
that comes with your account).

`var CALENDAR_ID = "calendarid"` specifies to use a specific calendar based on
the id. For this example my id is `calendarid`. To find your calendar id, go to
your calendars. On the left side will be a list of calendars that you have.
Hover over the calendar you want and click the little arrow that shows up to the
right of the calendar name then select calendar settings. On this page you will
see `Calendar ID: someid` where `someid` is your calendar id. Now copy this
value and put it into the script as the above variable.



### var DEBUG

This variable tells the script if you want to get emailed log reports.

#### Default

The default setting is `false`.

#### Possible Values:

`var DEBUG = true` means that you want to get emails with the logs for
every execution of the script.

`var DEBUG = false` means that you do NOT want to get emails with the logs
at all.



### var ADDED_EPISODE_ALERT

This variable tells the script if you want to get emailed every time a new
episode is added to your calendar. It will give you the name of the show, and
the start date and time of that episode. All additions for that execution of the
script will be in the same email.

#### Default

The default setting is `false`.

#### Possible Values:

`var ADDED_EPISODE_ALERT = true` means that you want to get the emails.

`var ADDED_EPISODE_ALERT = false` means that you do NOT want to get the emails.


### var MYLABEL

This variable tells the script what label to look for in your gmail for adding
new episodes.

The script will check your inbox for messages with a label on them that matches
the variable `MYLABEL`. If it does, it checks takes the body of the email and
assumes that it is a newline separated list of TV Show titles (ie. Your email is
a list of TV Show titles with a new title on each line). It will then take those
titles, and append them to your spreadsheet for you as long as that TV show does
not already exist in the sheet (the check is case insensitive, so a TV Show
named `Suits` and `suits` are seen as the same. Any other difference in
spelling, spelling or other characters will be treated as a new show).

The easiest way to make assign labels automatically is to setup a filter in
gmail.

#### Setting up a Filter to Use "MYLABEL"

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
   label that you defined by the variable `MYLABEL`. If you haven't already
   created this label, select the button to create a new label.

7. Select `Create Filter`.

8. Make sure that the label is defined in the script, and that is all that needs
   to be done. The email you send yourself will be deleted by the script once it
   is read, so do not delete these emails manually.

#### Default

The default setting is `"TV Show Script"`.


### var SCRIPT_AUTO_UPDATE_CHECK

This variable tells the script if you want the update function to run
automatically when you run your script. When the update script is run you will
get a email if an update has happened since the last time the script ran. You
will not receive an email at any other time.

Note that this will **NOT** update the script. It will just warn you of updates
that have occurred.

#### Default

The default setting is `true`.

#### Possible Values:

`var SCRIPT_AUTO_UPDATE_CHECK = true` Means to check for updates automatically before
looking for TV Shows.

`var SCRIPT_AUTO_UPDATE_CHECK = false` Means that the script will never automatically
check for updates for you. So you will need to manually run the
`check_for_updates` function in order to get updates.


### var BRANCH_TO_CHECK_FOR_UPDATES

NOTE: This variable has NO effect if `auto_update_check` is set to `false`

This variable tells the script what branch to check for updates. It will use
this to see if any new commits have come in since the last time the update
function was run.

#### Default

The default setting is `"master"`.

#### Possible Values:

`var BRANCH_TO_CHECK_FOR_UPDATES = "master"`

`var BRANCH_TO_CHECK_FOR_UPDATES = "testing"`

`var BRANCH_TO_CHECK_FOR_UPDATES = "dev"`


### var API_TOKEN

NOTE: This variable has NO effect if `SCRIPT_AUTO_UPDATE_CHECK` is set to `false`

This variable holds the value of your Github API Token which will ONLY be used
for the purpose of checking for updates. The Github API does not require a
token, but you will be subject to rate limiting if you don't. As a result, if
you do not provide a token to this script, you may find that you get errors in
your script because the API didn't return anything. That being said, it is up to
you whether or not you want to provide a token. The script will work whether you
provide a token or leave the string empty.

#### How to Get a Token?

First, you need a Github Account. If you do not have one, then register for one.
Once you have an account:

1. Login
2. Click your profile picture in the top right corner of the page
3. Select `Settings` from the drop down
4. In the left pane select `Developer Settings`
5. In the left pane select `Personal Access Tokens`
6. Click `Generate new token`
7. Give a description for the token.
8. Below that are scopes. We do NOT need any of them, so leave them all
   unchecked and click `Generate Token`

The next page shows the token. Use this as your token. Note that you will never
be able to see that token again, so copy it there and put it into the script
right away. If you lose the token somehow that is not big deal. Just generate a
new one with the above steps and delete your old token.

#### Default

The default setting is `""` which means that NO token will be used

#### Possible Values:

`var BRANCH_TO_CHECK_FOR_UPDATES = ""`

If `123456` is your token:

`var BRANCH_TO_CHECK_FOR_UPDATES = "123456"`


## Questions

### What if I Accidentally mess with the data in the sheet?

Changing the "B" column is perfectly okay, since this is the column you will use
to tell the script what shows you want. You can freely add and delete new shows
as you choose (Deleting a show consists of just deleting that whole row).

If you change data in any of the other columns and if it isn't too late to undo
what you just did, then do that.

Otherwise you can just make the changed cells blank. A blank cell is interpreted
as an undefined value and the script will create a starting value, as if it was
the first time it was populating that cell.

## For Development

Development is to be done in the TypesScript file using the provided Makefile
for compilation.

In order to compile this script you need the Google Apps Script TypeScript type
definitions which can be installed with this command:

```
npm install --save @types/google-apps-script
```

The header.gs file is just what the top of the final `*.gs` file should look
like. I made the decision to remove empty space and comments in the compiled
version but it is still important to have comments for the top part where the
config variables are.

## Thanks To

* `tvmaze.com` for the amazingly easy to use API to gather TV Show data.
