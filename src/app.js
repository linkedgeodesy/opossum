import "./style/style.css";
import * as $ from "jquery";
import * as L from "leaflet";

// set tile layer
let hotMap = L.tileLayer("http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>, Tiles courtesy of <a href='http://hot.openstreetmap.org/' target='_blank'>Humanitarian OpenStreetMap Team</a>"
});

let osmMap = L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> Contributors"
});

// add circle
let buffer = L.circle([39.4699075, -0.3762881000000107], {
    color: "red",
    fillColor: "#f03",
    fillOpacity: 0.5,
    radius: 10000
});

let wikipedia = L.layerGroup();

// read valencia data from wikipedia api
$.ajax({
    type: "GET",
    url: "https://en.wikipedia.org/w/api.php?action=query&gsmaxdim=10000&list=geosearch&gslimit=1000&gsradius=10000&gscoord=39.4699075|-0.3762881000000107&continue&format=json&origin=*",
    error: function (jqXHR, textStatus, errorThrown) {
        alert(errorThrown);
    },
    success: function (data) {
        let geosearch = data.query.geosearch;
        for (var item in geosearch) {
            let marker = L.marker([geosearch[item].lat, geosearch[item].lon]);
            marker.bindPopup(geosearch[item].title);
            wikipedia.addLayer(marker);
        }
    }
});

// init map
let mymap = L.map("mapid", {
    center: [39.4699075, -0.3762881000000107],
    zoom: 12,
    layers: [hotMap, buffer, wikipedia]
});

let baseMaps = {
    "Hot": hotMap,
    "OSM Mapnik": osmMap
};

let overlays ={
    "Buffer": buffer,
    "wikipedia": wikipedia
};

L.control.layers(baseMaps, overlays).addTo(mymap);
