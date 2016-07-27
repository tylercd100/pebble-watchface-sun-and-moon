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

Pebble.addEventListener('ready', onReady);

function onReady(){
	console.log('PebbleKit JS ready!');

	// Get pre-existing position
	latitude = localStorage.getItem('latitude');
	longitude = localStorage.getItem('longitude');

	// Start the loops
	setInterval(calc, 5000);
  	setInterval(function(){
  		getLocation(15,onGeoLocSuccess,onGeoLocError,geoOptions);
  	}, 10000);

  	// Call the basics right away
	calc();
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
  	localStorage.setItem('latitude', latitude);
	localStorage.setItem('longitude', longitude);

	console.log('location success lat:'+latitude+" long:"+longitude);
}

function onGeoLocError(err) {
	console.log('location error (' + err.code + '): ' + err.message);
}

function calc(){
	if(latitude !== null && longitude !== null){
		now = new Date();
	  	
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

function getCelestialStartDate(func,rise,set,name){
	var i = 0;
	var degrees = 0;
	var time_start = null;
	while(!time_start && i<=2){
		var past = new Date();
		if(i>0){
			past.setDate(now.getDate() - i);
		}
		var celestial = SunCalc[func](past, latitude, longitude)
		// if(name === 'Sun')
			// console.log(JSON.stringify(celestial));
		if(celestial[rise] && celestial[rise] < now && (!celestial[set] || (celestial[rise] > celestial[set] || celestial[set] > now))){
			time_start = celestial[rise];
			// console.log('The '+name+' was risen at: '+time_start)
		} else if(celestial[set] && celestial[set] < now && (!celestial[rise] || celestial[set] > celestial[rise])){
			time_start = celestial[set];
			// console.log('The '+name+' was set at: '+time_start)
			degrees+=180;
		}
		i++;
	}

	return {time_start: time_start, modifier: degrees};
}

function getCelestialEndDate(func,rise,set,name){
	var i = 0;
	var times = [];
	var time_end = null;

	for(var i=0;i<2;i++){
		var future = new Date();
		if(i>0){
			future.setDate(now.getDate() + i);
		}
		var celestial = SunCalc[func](future, latitude, longitude);
		if(celestial[set]){
			times.push(celestial[set])
		}
		if(celestial[rise]){
			times.push(celestial[rise])
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
	var start = getCelestialStartDate('getMoonTimes','rise','set','Moon');
	var end = getCelestialEndDate('getMoonTimes','rise','set','Moon');	
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

function getSunAngle(now, latitude, longitude){
	var celestial = SunCalc.getTimes(now, latitude, longitude);
	var percentage = 0;
	var start = getCelestialStartDate('getTimes','sunrise','sunset','Sun');
	var end = getCelestialEndDate('getTimes','sunrise','sunset','Sun');	
	var degrees = start.modifier;
	var time_start = start.time_start;
	var time_end = end.time_end;

	console.log("Sun Start: "+time_start);
	console.log("Sun End:   "+time_end);

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



function round(num, places) {
    var multiplier = Math.pow(10, places);
    return Math.round(num * multiplier) / multiplier;
}