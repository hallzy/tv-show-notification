# TV Show Notification

This is a google script that fetches information about TV Shows, and will set
calendar events in your Google Calendar for air dates of your favourite TV
Shows.

## Setup

This will be a step by step guide to start using the script:

Download the script. That is, the .gs file and put it somewhere in your google
drive. It can be anywhere that your heart desires, so go crazy and make some
folders to bury it in if that makes you happy :) The script can be named
anything that you want.

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

Now make sure that the script is saved.

Finally, while still inside the script, at the top of the screen click:
`Resources -> Current Project's Triggers`. Now click the blue text that says `No
triggers set up. Click here to add one now`.

For the drop down menu under "Run" make sure you select "run". This runs the
"run" function inside the script. For events, you can select any type of trigger
you want. This will determine how often the script is run automatically.

Now we are done. You will never need to go back to the script. If you want to
ever add or delete a show from being searched for, just edit the spreadsheet
file.


## Questions

### What if I Accidentally mess with the "B" Column?

You can just make it blank. A blank cell is interpreted as an undefined value
and the script will create a starting number which will be the number of
episodes that have aired before the current day's date. You may end up with
duplicate calendar entries after this, but at least the script will be back on
track.


