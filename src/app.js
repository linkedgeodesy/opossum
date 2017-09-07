import "./style/style.css";
import * as $ from "jquery";
import * as L from "leaflet";

// init map
var mymap = L.map("mapid").setView([39.4699075, -0.3762881000000107], 12);
// set tile layer
L.tileLayer("http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>, Tiles courtesy of <a href='http://hot.openstreetmap.org/' target='_blank'>Humanitarian OpenStreetMap Team</a>"
}).addTo(mymap);
// add circle
L.circle([39.4699075, -0.3762881000000107], {
    color: "red",
    fillColor: "#f03",
    fillOpacity: 0.5,
    radius: 10000
}).addTo(mymap);
// read valencia data from wikipedia api
$.ajax({
    type: "GET",
    url: "https://en.wikipedia.org/w/api.php?action=query&gsmaxdim=10000&list=geosearch&gslimit=1000&gsradius=10000&gscoord=39.4699075|-0.3762881000000107&continue&format=json&origin=*",
    error: function (jqXHR, textStatus, errorThrown) {
        alert(errorThrown);
    },
    success: function (data) {
        var geosearch = data.query.geosearch;
        for (var item in geosearch) {
            var marker = L.marker([geosearch[item].lat, geosearch[item].lon]).addTo(mymap);
            marker.bindPopup(geosearch[item].title);
        }
    }
});
