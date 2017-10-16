"use strict";
let players = {};
let id      = 1;

let http    = require("http");
let express = require("express");
let Player  = require("./public/player");
let app     = express().use(express.static(__dirname + "/public/"));
let port    = process.env.PORT || 8080;

let server = http.createServer(app).listen(port, function() {
  console.log('Listening on %d', server.address().port);
});
let WebSocket = require('ws');
let wss = new WebSocket.Server({server});
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
wss.on('connection', function(ws) {

  ws.on('message', function(data) {
    let packet = JSON.parse(data);

    if (packet.name) {
      players[id] = new Player(packet.name, packet.position);
      ws.id = id;
      players[id].ws = ws;
      start(id);
      add(id);
      id++;

    } else if (packet.message){
      if (packet.to === "global") {broadcast(packet);}
      if (players[packet.to])     {players[packet.to].ws.send(JSON.stringify(packet));}
    }
  });//message

  ws.on('close', function (event) {
    delete players[ws.id];
    broadcast( {remove:ws.id} );
    ws.terminate();
  });//close

});//connection
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function start(id) {
  let packet = {};

  for (var id in players) {
    packet[id] = {
      name     : players[id].name,
      position : players[id].position,
    };
  }

  players[id].ws.send(JSON.stringify( {start:packet} ));
};
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function add(id) {
  let packet = {
    id       : id,
    name     : players[id].name,
    position : players[id].position,
  };

  for (var i in players) {
    if (i == id) {continue;}
    players[i].ws.send(JSON.stringify( {add:packet} ));
  }
};
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function broadcast(data) {
  for (var id in players) {
    players[id].ws.send(JSON.stringify(data));
  }
};
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
