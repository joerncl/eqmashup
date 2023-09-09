# Earthquake Mashup

## Introduction

Way back in 2006, when
[Mashups](https://en.wikipedia.org/wiki/Mashup_(web_application_hybrid))
and [AJAX](https://en.wikipedia.org/wiki/Ajax_(programming)) were
relatively new (well, at least from today's perspective...), I wanted to
give these techniques a try and started with the "hello world" of mashup
programming: Show geolocated data on Google Maps. And the easiest source
for such data was and still is earthquake data.

The first version of the Earthquake Mashup was a simple map showing a
single data source from the [USGS](https://earthquake.usgs.gov/). I soon
added more data feeds from the European counterpart
[EMSC-CSEM](https://www.emsc-csem.org/) and the German
[GFZ](https://www.emsc-csem.org/). With the addition of a [timeline
widget](https://www.simile-widgets.org/timeline/) developed for MIT's
[SIMILE Widgets project](https://www.simile-widgets.org/), the mashup
was completed.

## Downfall

Although I had to adapt the mashup a few times to changing APIs and move
it from one hosting provider to another, the Earthquake Mashup
essentially ran from 2006 to 2023 without any major interruptions. Not
bad in WWW time, I think...

In 2016 Google announced that they were no longer providing Google Maps
for free to web developers, and in 2018 it was mandatory to set up a
billing account. Google would charge the owner of a web application, if
access to Google Maps went over a certain limit. While it is okay for me
to pay a small but fixed amount of money to run my servers, I had no
intention to take a gamble and suddenly be in debt of an unexpected sum
to Google. So I simply did nothing...

In February of 2023, a devastating [earthquake hit Turkey and
Syria](https://en.wikipedia.org/wiki/2023_Turkey%E2%80%93Syria_earthquake). As
in similar events before, the number of visitors to my Earthquake Mashup
skyrocketed. But this time, it blew the limit for my free allowance of
Google Maps usage, and Google blocked further access to their service.

Unfortunately, this is still the status quo. I had hoped Google would
unblock the access after some time, but this seems not to be the
case. So the Earthquake Mashup is no longer usable, at least not the way
I intended it to be used.

As I have still no intention to pay Google, and I do not have the time
to rewrite the Mashup to use another mapping service, I have released
the code to the mashup to the public - well, most of it is HTML and
JavaScript, so it was not really well hidden in the first place...

