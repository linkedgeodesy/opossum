import "./style/style.css";
import * as $ from "jquery";
import * as L from "leaflet";

let lat = 39.4699075;
let lon = -0.3762881000000107;
let radius = 10000;

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
let buffer = L.circle([lat, lon], {
    color: "red",
    fillColor: "#f03",
    fillOpacity: 0.5,
    radius: radius
});

let wikipedia = L.layerGroup();

let getTypesFromDBpedia = (json) => {
    let types = "";
    $.ajax({
        type: "GET",
        url: "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=SELECT+*+WHERE+%7B+%3Fs+%3Chttp%3A%2F%2Fdbpedia.org%2Fontology%2FwikiPageID%3E+%22"+json.pageid+"%22%5E%5Exsd%3Ainteger+.+%3Fs+%3Fp+%3Fo+.%0D%0A%7D&format=application%2Fsparql-results%2Bjson&CXML_redir_for_subjs=121&CXML_redir_for_hrefs=&timeout=30000&run=+Run+Query+",
        async: false,
        error: function (jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        },
        success: function (data) {
            let bindings = data.results.bindings;
            for (var item in bindings) {
                if (bindings[item].p.value.includes("#type")) {
                    if (bindings[item].o.value.includes("http://dbpedia.org/ontology/")) {
                        let split = bindings[item].o.value.split("/");
                        types += split[split.length-1]+"<br>";
                    }
                }
            }
        }
    });
    return types;
};

// read valencia data from wikipedia api
$.ajax({
    type: "GET",
    url: "https://en.wikipedia.org/w/api.php?action=query&gsmaxdim=10000&list=geosearch&gslimit=1000&gsradius="+radius+"&gscoord="+lat+"|"+lon+"&continue&format=json&origin=*",
    async: false,
    error: function (jqXHR, textStatus, errorThrown) {
        alert(errorThrown);
    },
    success: function (data) {
        let geosearch = data.query.geosearch;
        for (var item in geosearch) {
            let marker = L.marker([geosearch[item].lat, geosearch[item].lon]);
            marker.properties = {};
            marker.properties.wiki1 = geosearch[item];
            marker.bindPopup(marker.properties.wiki1.title+" <br><br><b>types</b><br>"+getTypesFromDBpedia(geosearch[item]));
            wikipedia.addLayer(marker);
        }
    }
});

// init map
let mymap = L.map("mapid", {
    center: [lat, lon],
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
