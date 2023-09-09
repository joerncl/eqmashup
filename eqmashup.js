var map = null;
var markers = [];

var feeds = ['usgs25','usgs5','emsc','gfz'];
var urls = { 'usgs25' : 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.atom',
             'usgs5'  : 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.atom',
             'emsc'   : '/ajxp/emsceq-feed.xml',
             'gfz'    : '/ajxp/gfzeq-feed.xml'
};

var controlscreated = false;
var currentfeed = '';
var blockswitch = false;
var timer = null;
var lastupdate = null;
var updateinterval = 300000; // 5 minutes

var timeline = null;
var eventSource = null;
var resizeTimerID = null;
var lastinfowindow = null;

var events = [];

// do some AJAX, no longer handled by Google Maps
// this code is fairly old, hope it still works...
function mkXHR () {
    if (window.XMLHttpRequest) {
        xhr = new XMLHttpRequest(); // Mozilla, Safari, Opera
    } else if (window.ActiveXObject) {
        try {
            xhr = new ActiveXObject('Msxml2.XMLHTTP'); // IE 5
        } catch (e) {
            try {
                xhr = new ActiveXObject('Microsoft.XMLHTTP'); // IE 6
            } catch (e) {}
        }
    }
    return xhr;
}
var http = mkXHR();


var isIE = (navigator.userAgent.indexOf('MSIE') > -1);
if (isIE) {
    var IEpat = /MSIE (\d+\.\d+);/;
    var isIE8 = parseFloat(IEpat.exec(navigator.userAgent)[1]) > 8;
}

function initMashup() {
    // IE needs, of course, special treatment
    if (isIE) {
        document.getElementById('timeline').style.height = document.documentElement.clientHeight / 4;
    }

    // initialise Google Maps
    mapOptions = {
        center: new google.maps.LatLng(0, 0),
        zoom: 4,
        mapTypeId: google.maps.MapTypeId.TERRAIN,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: true
    };
    map = new google.maps.Map(document.getElementById("map"),mapOptions);
    google.maps.event.addListener(map, "click", function() {
        if (lastinfowindow) {
            lastinfowindow.close();
        }
    });

    // initialise Simile Timeline with two bands
    eventSource = new Timeline.DefaultEventSource();
    var bandInfos = [
                     Timeline.createBandInfo({
                             eventSource:    eventSource,
                             width:          "80%", 
                             intervalUnit:   Timeline.DateTime.HOUR, 
                             intervalPixels: 100
                         }),
                     Timeline.createBandInfo({
                             layout:         'overview',
                             showEventText:  false,
                             eventSource:    eventSource,
                             width:          "20%", 
                             intervalUnit:   Timeline.DateTime.DAY, 
                             intervalPixels: 100,
                             trackHeight:    0.75,
                             trackGap:       0.2
                         })
                     ];
    // synchronise bands
    bandInfos[1].syncWith = 0;
    bandInfos[1].highlight = true;
    timeline = Timeline.create(document.getElementById("timeline"), bandInfos);
    // hijack popup window callback to show earthquake
    Timeline.OriginalEventPainter.prototype._showBubble = function(x, y, evt) {
        google.maps.event.trigger(evt.marker, 'click');
        map.panTo(evt.marker.getPosition());
    }

    // load feed when map and timeline are initialized, but custom
    // controlls are not put in place. this looks weird, but was the
    // only working order of operations I was able to find
    loadInitialFeed();

    // add callback for window resize
    // here instead of the html file, to conform with XHTML 1.0
    window.onresize = onResize;
}

// Google API documentation says, this should go here instead as onload event...
google.maps.event.addDomListener(window, 'load', initMashup);

function loadInitialFeed() {
    // don't use cookies until further notice...
    // initialise feedselector, if possible with saved state
    // var cookie = document.cookie;
    // var start = cookie.indexOf('mapstate=');
    // if (start == -1) {
        switchFeed('usgs25');
    // } else {
    //     var end = cookie.indexOf(';', start);
    //     if (end == -1) {
    //         var savedfeed = decodeURIComponent(cookie.substring(start+9));
    //     } else {
    //         var savedfeed = decodeURIComponent(cookie.substring(start+9, end));
    //     }
    //     switchFeed(savedfeed);
    // }
}

// add additional buttons to Google Maps, see GM API docs for more information
function makeButtons() {
    var container = document.createElement('div');
    var buttons = document.getElementById('buttons');
    for (var i = 0; i < feeds.length; i++) {
        makeButton(feeds[i],buttons,container);
    }
    var counter = buttons.removeChild(document.getElementById('counter'));
    container.appendChild(counter);
    var follow = buttons.removeChild(document.getElementById('follow'));
    container.appendChild(follow);
    var info = buttons.removeChild(document.getElementById('info'));
    container.appendChild(info);
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(container);
}

function makeButton(feed, buttons, container) {
    var button = buttons.removeChild(document.getElementById(feed));
    container.appendChild(button);
    google.maps.event.addDomListener(button, 'click', function() {
            switchFeed(feed);
        });
}

function showCounter() {
    // show remaining time until next reload of RSS feed
    var now = new Date();
    var elapsed = updateinterval - (now - lastupdate);
    var min = Math.floor(elapsed / 60000);
    var sec = Math.floor((elapsed - 60000*min) / 1000);
    if (sec < 10) { sec = '0'+sec; }
    document.getElementById('counter').innerHTML = min+':'+sec;
}

function switchFeed(newfeed) {
    // switch to different feed
    if ((newfeed != currentfeed) && !blockswitch) {
        // change style of button(s)
        if (currentfeed != '') {
            document.getElementById(currentfeed).setAttribute('class','button');
        }
        document.getElementById(newfeed).setAttribute('class','buttonselected');
        // stop the timer
        if (timer) {
            clearInterval(timer);
        }
        // switch to new feed
        currentfeed = newfeed;
        loadFeed();
        // restart the timer
        timer = setInterval('loadFeed()', updateinterval);
        // update cookie with new feed
        document.cookie = 'mapstate='+encodeURIComponent(currentfeed)+'; max-age='+(60*60*24*7);
    }
}

function loadFeed() {
    // clean map and timeline and reload everything
    for (var i in markers) {
        markers[i].setMap(null);
    }
    markers = [];
    events = [];
    eventSource.clear();
    // reset the timer
    lastupdate = new Date();
    // block switching to different feed, until this one is loaded
    blockswitch = true;
    // load the currently selected feed
    http.open('GET', urls[currentfeed]);
    http.send(null);
    http.onreadystatechange = showFeed;
}

function showFeed() {
    if (http.readyState == 4) {
        if (http.status == 200) {
            // allow switching to other feed again
            blockswitch = false;
            // center on most recent event?
            var followYN = document.getElementById('checkfollow').checked;
            var xml = http.responseXML;
            // iterate over all items and call the appropriate parser
            var items = xml.documentElement.getElementsByTagName('item');
            if (items.length == 0) {
                items = xml.documentElement.getElementsByTagName('entry');
            }
            for (var i = items.length - 1; i >= 0; i--) {
                var eq = null;
                switch(currentfeed) {
                case 'usgs25':
                    eq = parseUSGS(items[i]);
                    break;
                case 'usgs5':
                    eq = parseUSGS(items[i]);
                    break;
                case 'emsc':
                    eq = parseEMSC(items[i]);
                    break;
                case 'gfz':
                    eq = parseGFZ(items[i]);
                    break;
                }
                // if data was valid, display event on map
                if (eq.mag) {
                    createMarker(eq.pos,eq.date,eq.mag,eq.loc,eq.depth,eq.link);
                }
                // if desired, center on most recent earthquake
                if (i == 0 && followYN) {
                    map.panTo(eq.pos);
                }
            }
            // add all events to the timeline 
            eventSource.addMany(events);
            // and, if desired,  move the timeline to the most recent entry
            if (followYN) {
                timeline.getBand(0).setCenterVisibleDate(eventSource.getLatestDate());
            }

            // only now check, if we already created the custom
            // controls. doing this any time sooner simply doesn't
            // work...
            if (!controlscreated) {
                makeButtons();
                setInterval('showCounter()', 1000);
                controlscreated = true;
            }

        } else {
            if (http.status >= 400) {
                alert("Unable to load data feed: HTTP Status Code "+http.status);
                // fall back to reliable(?) feed, still needs reload though
                document.cookie = 'mapstate=usgs25; max-age='+(60*60*24*7);
                blockswitch = false;
            }
        }
    }
}

function parseUSGS (item) {
    // parse the USGS feeds
    var eq = {};
    var cdata = item.getElementsByTagName('summary')[0].firstChild.data;
    var datepat = /^.*<dd>(\d+)-(\d+)-(\d+)\s+(\d+):(\d+):(\d+) UTC<\/dd>.*/;
    var datearray = datepat.exec(cdata);
    if (datearray) {
        var date = new Date;
        date.setUTCFullYear(datearray[1]);
        date.setUTCMonth(datearray[2]-1);
        date.setUTCDate(datearray[3]);
        date.setUTCHours(datearray[4]);
        date.setUTCMinutes(datearray[5]);
        date.setUTCSeconds(datearray[6]);
        eq.date = date;
    }
    var titlepat = /^M\s([\d\.]*) - (\w.*)/;
    var titlestring = item.getElementsByTagName('title')[0].firstChild.data;
    var titlearray = titlepat.exec(titlestring);
    if (titlearray) {
        eq.mag = titlearray[1];
        eq.loc = titlearray[2];
    }
    eq.link = item.getElementsByTagName('link')[0].getAttribute('href');
    var latlonpat = /([\d\.-]*)\s+([\d\.-]*)/;
    try {
        var latlon = item.getElementsByTagName('point')[0].firstChild.data;
    } catch (e) {
        var latlon = item.getElementsByTagName('georss:point')[0].firstChild.data;
    }
    var latlonarray = latlonpat.exec(latlon);
    var lat = latlonarray[1];
    var lon = latlonarray[2];
    eq.pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lon));
    try {
        var depth = item.getElementsByTagName('elev')[0].firstChild.data;
    } catch (e) {
        var depth = item.getElementsByTagName('georss:elev')[0].firstChild.data;
    }
    eq.depth = Math.round(depth/100)/10+' km';
    return(eq);
}

function parseEMSC (item) {
    // parse the EMSC feed
    // sometimes, essential data like the magnitude is missing
    var eq = {};
    try {
        var datestring = item.getElementsByTagName('time')[0].firstChild.data;
    } catch (e) {
        var datestring = item.getElementsByTagName('emsc:time')[0].firstChild.data;
    }
    var datepat = /^(\d+)-(\d+)-(\d+)\s+(\d+):(\d+):(\d+).*/;
    var datearray = datepat.exec(datestring);
    if (datearray) {
        var date = new Date;
        date.setUTCFullYear(datearray[1]);
        date.setUTCMonth(datearray[2]-1);
        date.setUTCDate(datearray[3]);
        date.setUTCHours(datearray[4]);
        date.setUTCMinutes(datearray[5]);
        date.setUTCSeconds(datearray[6]);
        eq.date = date;
    }
    var titlepat = /^\w+\s+([\d\.]*)\s+(\w.*)/;
    var titlestring = item.getElementsByTagName('title')[0].firstChild.data;
    var titlearray = titlepat.exec(titlestring);
    if (titlearray) {
        eq.mag = titlearray[1];
        eq.loc = titlearray[2];
    }
    eq.link = item.getElementsByTagName('link')[0].firstChild.data;
    try {
        var lat = item.getElementsByTagName('lat')[0].firstChild.data;
        var lon = item.getElementsByTagName('long')[0].firstChild.data;
    } catch (e) {
        var lat = item.getElementsByTagName('geo:lat')[0].firstChild.data;
        var lon = item.getElementsByTagName('geo:long')[0].firstChild.data;
    }
    eq.pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lon));
    try {
        var depth = item.getElementsByTagName('depth')[0].firstChild.data;
    } catch (e) {
        var depth = item.getElementsByTagName('emsc:depth')[0].firstChild.data;
    }
    eq.depth = depth.replace(/ *$/,'') + ' km';
    return(eq);
}

function parseGFZ (item) {
    // parse the GFZ feed
    // most of the data is crammed into the description string
    var eq = {};
    var dateposdeppat = /^(\d+)-(\d+)-(\d+)\s+(\d+):(\d+):(\d+)\s+([\d\.-]*)\s+([\d\.-]*)\s+(\d+) km.*/;
    var descstring = item.getElementsByTagName('description')[0].firstChild.data;
    var dateposdeparray = dateposdeppat.exec(descstring);
    if (dateposdeparray) {
        var date = new Date;
        date.setUTCFullYear(dateposdeparray[1]);
        date.setUTCMonth(dateposdeparray[2]-1);
        date.setUTCDate(dateposdeparray[3]);
        date.setUTCHours(dateposdeparray[4]);
        date.setUTCMinutes(dateposdeparray[5]);
        date.setUTCSeconds(dateposdeparray[6]);
        eq.date = date;
        var lat = dateposdeparray[7];
        var lon = dateposdeparray[8];
        eq.pos = new google.maps.LatLng(parseFloat(lat), parseFloat(lon));
	eq.depth = dateposdeparray[9] + ' km';
    }
    var titlepat = /^M\s+([\d\.]*),\s+(\w.*)/;
    var titlestring = item.getElementsByTagName('title')[0].firstChild.data;
    var titlearray = titlepat.exec(titlestring);
    if (titlearray) {
        eq.mag = titlearray[1];
        eq.loc = titlearray[2];
    }
    eq.link = item.getElementsByTagName('link')[0].firstChild.data;
    return(eq);
}

function createMarker (point, date, magstring, location, depth, link) {
    // create a marker on the map
    // age in days
    var age = (lastupdate.getTime() - date.getTime()) / 86400000;
    var grey = '0';
    if (age > 0.2) { grey = '4'; }
    if (age > 1) { grey = '8'; }
    if (age > 4) { grey = 'c'; }
    // create icon, size proportional to magnitude
    // use exponential icon size for USGS 5+ feed
    var mag = parseFloat(magstring);
    if (currentfeed == 'usgs5') {
        var icondir = 'icons_exp';
        var iconcenter = Math.sqrt(Math.pow(10,mag-3))/3;
    } else {
        var icondir = 'icons';
        var iconcenter = mag * 3;
    }
    var url;
    if (isIE && !isIE8) {
        url = icondir+'/eq'+magstring+'.gif';
    } else {
        url = icondir+'/eq'+magstring+'_'+grey+'.png';
    }

    // clicking the icon opens a window with some data and a link to
    // the feed provider's information page
    var html ='<div class="title">'+location+'</div>'+
              '<div>Magnitude: '+magstring+'</div>'+
              '<div>Depth: '+depth+'</div>'+
              '<div>Time: '+date.toGMTString()+'</div>'+
              '<div><a target="_blank" href="'+link+'">more information</a></div>';
    var title = magstring+' '+location;
    marker = createMarkerCL(point, iconcenter, url, title, html, date, age);

    // create a color coded marker on the timeline
    var color = 'green';
    if (mag >= 4) { color = 'yellow'; }
    if (mag >= 6) { color = 'red'; }

    var evt = new Timeline.DefaultEventSource.Event ({
            start: date,
            // end: date,
            // instant : true,
            text : magstring+' - '+location,
            classname: color,
            textColor: 'black'
        });

    // thanks to David Huynh for pointing this out
    evt.marker = marker;
    markers.push(marker);
    events.push(evt);
    return(marker);
}

function createMarkerCL(point,offset,url,title,html,date,age) {
    var anchor = new google.maps.Point(offset,offset);
    var icon = new google.maps.MarkerImage(url,null,null,anchor);
    var marker = new google.maps.Marker({
            position: point,
            anchorPoint: new google.maps.Point(0,0),
            map: map,
            title: title,
            icon: icon,
            zindex: -age
        });
    var infowindow = new google.maps.InfoWindow({
            content: html
        });
    google.maps.event.addListener(marker, "click", function() {
            if (lastinfowindow) {
                lastinfowindow.close();
            }
            infowindow.open(map,marker);
            timeline.getBand(0).scrollToCenter(date);
            lastinfowindow = infowindow;
        });
    return(marker);
}

// this is directly from the Timeline tutorial
function onResize() {
    if (isIE) {
        document.getElementById('timeline').style.height = document.documentElement.clientHeight / 4;
    }
    if (resizeTimerID == null) {
        resizeTimerID = window.setTimeout(function() {
            resizeTimerID = null;
            timeline.layout();
        }, 500);
    }
}
