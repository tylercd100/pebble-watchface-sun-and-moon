var SunCalc    = require('suncalc');
var collection = require('lodash/collection');

var oldSunAngle = null;
var latitude = null;
var longitude = null;
var now = new Date();
var i = 0;

var geoOptions = {
  enableHighAccuracy: true,
  maximumAge: 10000,
  timeout: 10000
};

Pebble.addEventListener('ready', function ready() {
	// PebbleKit JS is ready!
	console.log('PebbleKit JS ready!');
	main();
});

function main(){
	console.log(++i);
	getLocation(15,onGeoLocSuccess,onGeoLocError,geoOptions);
}

function getLocation(minutes,success,error,options){
	options.maximumAge = minutes * 60 * 1000;
	navigator.geolocation.getCurrentPosition(success, error, options);
}

function onGeoLocSuccess(pos){
	now = new Date();
  	latitude = pos.coords.latitude;
  	longitude = pos.coords.longitude;
  	calc();
  	setTimeout(main, 10000);
}

function calc(){
	now = new Date();

	if(latitude !== null && longitude !== null){
	  	//Sun Angle
	  	var sunAngle = Math.round(getSunAngle(now, latitude, longitude));
	  	console.log("Angle of the Sun: " + sunAngle);

	  	//Moon Angle
	  	var moonAngle = Math.round(getMoonAngle(now, latitude, longitude));
	  	console.log("Angle of the Moon: " + moonAngle);

	  	if(oldSunAngle !== sunAngle || oldMoonAngle !== moonAngle){
		  	// Assemble data object
			var dict = {
			  'SUN_ANGLE': sunAngle,
			  'MOON_ANGLE': moonAngle
			};

			// Send the object
			Pebble.sendAppMessage(dict, function() {
				oldSunAngle = sunAngle
				oldMoonAngle = moonAngle
				console.log('Message sent successfully: ' + JSON.stringify(dict));
			}, function(e) {
			  	console.log('Message failed: ' + JSON.stringify(e));
			});
	  	}
	}
}

function getSunAngle(now, latitude, longitude){
	var celestial = SunCalc.getTimes(now, latitude, longitude);
	var time_start = celestial.sunrise;
	var time_end = celestial.sunset;
	var degrees = 0;
	var percentage = 0;

	//Get proper datetime range
	if(celestial.sunset < now){
		time_start = celestial.sunset;
		var tomorrow = new Date();
		tomorrow.setDate(now.getDate() + 1);
		celestial = SunCalc.getTimes(tomorrow, latitude, longitude)
		time_end = celestial.sunrise;
		degrees += 180;
	}

	console.log("Sun Start: "+time_start);
	console.log("Sun End:   "+time_end);

	//Get percentage of datetime range
	percentage = percentOfTimeRange(now,time_start,time_end)

	//Return angle in degrees from percentage
	return degrees + (percentage * 180);
}

function getMoonStartDate(){
	var i = 0;
	var degrees = 0;
	var time_start = null;
	while(!time_start && i<=2){
		var past = new Date();
		if(i>0){
			past.setDate(now.getDate() - i);
		}
		var celestial = SunCalc.getMoonTimes(past, latitude, longitude)
		console.log(JSON.stringify(celestial));
		if(celestial.rise && celestial.rise < now && (!celestial.set || celestial.rise > celestial.set)){
			time_start = celestial.rise;
			console.log('The Moon was risen at: '+time_start)
		} else if(celestial.set && celestial.set < now && (!celestial.rise || celestial.set > celestial.rise)){
			time_start = celestial.set;
			console.log('The Moon was set at: '+time_start)
			degrees+=180;
		}
		i++;
	}

	return {time_start: time_start, modifier: degrees};
}

function getMoonEndDate(){
	var i = 0;
	var times = [];
	var time_end = null;

	for(var i=0;i<2;i++){
		var future = new Date();
		if(i>0){
			future.setDate(now.getDate() + i);
		}
		var celestial = SunCalc.getMoonTimes(future, latitude, longitude);
		if(celestial.set){
			times.push(celestial.set)
		}
		if(celestial.rise){
			times.push(celestial.rise)
		}
	}

	times = collection.sortBy(times);

	times.forEach(function(t){
		if(!time_end && t > now){
			time_end = t;
		}
	});

	return {time_end: time_end};
}

function getMoonAngle(now, latitude, longitude){
	var celestial = SunCalc.getMoonTimes(now, latitude, longitude, false);
	var percentage = 0;
	var start = getMoonStartDate();
	var end = getMoonEndDate();	
	var degrees = start.modifier;
	var time_start = start.time_start;
	var time_end = end.time_end;

	console.log("Moon Start: "+time_start);
	console.log("Moon End:   "+time_end);

	//Get percentage of datetime range
	percentage = percentOfTimeRange(now,time_start,time_end)

	//Return angle in degrees from percentage
	return degrees + (percentage * 180);
}

function percentOfTimeRange(time_now,time_start,time_end){
	var time_range = Math.abs(time_end - time_start);
	var percent = Math.abs(time_start - time_now) / time_range;
	console.log(percent);
	return percent;
}

function onGeoLocError(err) {
  console.log('location error (' + err.code + '): ' + err.message);
  setTimeout(main, 10000);
}

function round(num, places) {
    var multiplier = Math.pow(10, places);
    return Math.round(num * multiplier) / multiplier;
}