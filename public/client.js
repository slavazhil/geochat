"use strict";
let map, websocket;
let my      = {};
let players = {};
let frame   = document.getElementById("map");
let options = {
	  center : {},
	  zoom : 18,
		mapTypeId : google.maps.MapTypeId.HYBRID,
	  disableDefaultUI : true,
};

if (navigator.geolocation) {
	navigator.geolocation.getCurrentPosition(showPosition, showError);
} else {
	alert("Geolocation is not supported by this browser.");
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function showPosition(position) {
	options.center.lat = position.coords.latitude;
	options.center.lng = position.coords.longitude;
	connectToServer();
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function connectToServer() {
	websocket = new WebSocket(location.origin.replace(/^http/, 'ws'));

	websocket.onopen = function() {
		document.getElementById("name").placeholder = "name";
	};//websocket.onopen

	websocket.onmessage = function(data) {
		var packet = JSON.parse(data.data);

		if (packet.start) {
			for (var id in packet.start) {
				players[id] = new Player(packet.start[id].name, packet.start[id].position);

				if (players[id].position.lat === options.center.lat
					&& players[id].position.lng === options.center.lng
					&& players[id].name === my.name) {my.id = id;}

				addMarker(id);
			}

			document.getElementById("input").style.display = "block";
			document.getElementById("findMe").style.display = "block";

		} else if (packet.add) {
			players[packet.add.id] = new Player(packet.add.name, packet.add.position);
			addMarker(packet.add.id);

		} else if (packet.remove) {
			players[packet.remove].marker.setMap(null);
			delete players[packet.remove];

		} else if (packet.error) {
			alert(packet.error);

		} else if (packet.message) {
			(packet.to === "global") ? showGlobalMessage(packet) : showPrivateMessage(packet);
		}
	};//websocket.onmessage

	websocket.onclose = function() {
		alert("Connection lost.");
	};//websocket.onclose
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function start() {
	if (document.getElementById("name").placeholder !== "name") {return;}
	my.name = document.getElementById("name").value;

	if      (my.name.length > 10) {alert("Your name is too long."); return;}
	else if (my.name.length == 0) {alert("Nothing entered.");       return;}

	websocket.send(JSON.stringify({
		name     : my.name,
		position : options.center,
	}));

	map = new google.maps.Map(frame, options);
	document.getElementById("welcome").style.display = "none";
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function showGlobalMessage(packet) {
	let message = new google.maps.InfoWindow({
		disableAutoPan : true,
		content        : packet.message,
		maxWidth       : 200,
	});

	message.open(map, players[packet.from].marker);

	setTimeout(function(){
		message.close(map, players[packet.from].marker);
	}, 5000);

	//message.setContent("");
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function showPrivateMessage(packet) {
	document.getElementById("private").style.display = "block";
	let message = document.createElement("p");
	message.onclick = function() {
		moveTo((packet.from === my.id) ? packet.to : packet.from);
	};
	message.innerHTML = players[packet.from].name + " to " + players[packet.to].name + ": " + packet.message;
	document.getElementById("privateContainer").appendChild(message);
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function sendMessage() {
	let packet = {
		from    : my.id,
		to      : document.getElementById("text").name,
		message : document.getElementById("text").value,
	};

	if (packet.message.length > 50) {alert("Your message is too long."); return;}
	if (packet.message.length == 0) {alert("Empty message.");            return;}

	if (packet.to !== "" && !players[packet.to]) {
		alert("Person left.");
		return;
	}

	if (packet.to === "") {packet.to = "global";}
	if (players[packet.to]) {showPrivateMessage(packet);}
	websocket.send(JSON.stringify(packet));
	document.getElementById("text").value = "";
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function addMarker(id) {
  players[id].marker = new google.maps.Marker({
		animation : google.maps.Animation.DROP,
    position  : players[id].position,
		label     : {text:players[id].name, color:"#ffffff"},
    map       : map,
	});

	players[id].marker.addListener("click", function() {
		moveTo(id);

		if (id === my.id) {return;}
		document.getElementById("text").name = id;
		document.getElementById("text").placeholder = players[id].name;
		document.getElementById("private").style.display = "block";
		players[id].marker.setAnimation(google.maps.Animation.BOUNCE);
	});
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function closePrivate() {
	let id = document.getElementById("text").name;

	if (players[id]) {players[id].marker.setAnimation(null);}
	document.getElementById("text").name = "";
	document.getElementById("text").placeholder = "global";
	document.getElementById("private").style.display = "none";
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function moveTo(id) {
	if (!players[id]) {return;}
	map.panTo(players[id].position);
	map.setZoom(18);
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function showError(error) {
  switch(error.code) {
  	case error.PERMISSION_DENIED:
			alert("User denied the request for Geolocation.");
      break;
    case error.POSITION_UNAVAILABLE:
			alert("Location information is unavailable.");
      break;
    case error.TIMEOUT:
			alert("The request to get user location timed out.");
      break;
    case error.UNKNOWN_ERROR:
			alert("An unknown error occurred.");
    	break;
  }
}
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
