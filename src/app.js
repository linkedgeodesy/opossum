import "./style/style.css";
import * as $ from "jquery";
import * as L from "leaflet";
import * as wellknown from "wellknown";
import * as turf from "@turf/turf";
import "materialize-css";

let lat = 39.4699075;
let lon = -0.3762881000000107;
let radius = 10000;

let lat_mz = 50.0;
let lon_mz = 8.271111;
let radius_mz = 10;
let lgdtype = "PlaceOfWorship"; //Museum School PlaceOfWorship Restaurant
let lgdtype2 = "Restaurant"; //Museum School PlaceOfWorship Restaurant

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
    fillOpacity: 0.0,
    radius: radius
});

let buffer2 = L.circle([lat_mz, lon_mz], {
    color: "red",
    fillColor: "#f03",
    fillOpacity: 0.0,
    radius: radius
});

let wikipedia = L.layerGroup();
let PlaceOfWorship = L.layerGroup();
let Restaurant = L.layerGroup();

let getTypesFromDBpedia = (json) => {
    let types = "<br><br><b>types</b><br>";
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
            marker.bindPopup("<a href='https://en.wikipedia.org/wiki/"+marker.properties.wiki1.title+"' target='_blank'>"+marker.properties.wiki1.title+"</a>"+getTypesFromDBpedia(geosearch[item]));
            wikipedia.addLayer(marker);
        }
    }
});

var stylePlaceOfWorship = {
    "color": "#ff7800",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0.8
};

// load place of worships via linkedgeodata.org
$.ajax({
    type: "GET",
    url: "http://linkedgeodata.org/sparql?default-graph-uri=http%3A%2F%2Flinkedgeodata.org&query=Prefix+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0APrefix+ogc%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgeosparql%23%3E%0D%0APrefix+geom%3A+%3Chttp%3A%2F%2Fgeovocab.org%2Fgeometry%23%3E%0D%0APrefix+lgdo%3A+%3Chttp%3A%2F%2Flinkedgeodata.org%2Fontology%2F%3E%0D%0A%0D%0ASelect+%3Fitem+%3Flabel+%3Fgeo%0D%0AFrom+%3Chttp%3A%2F%2Flinkedgeodata.org%3E+%7B%0D%0A++%3Fitem%0D%0A++++a+lgdo%3A"+lgdtype+"+%3B%0D%0A++++rdfs%3Alabel+%3Flabel+%3B%0D%0A++++geom%3Ageometry+%5B%0D%0A++++++ogc%3AasWKT+%3Fgeo%0D%0A++++%5D+.%0D%0A+++%0D%0A++Filter+%28%0D%0A++++bif%3Ast_intersects+%28%3Fgeo%2C+bif%3Ast_point+%28"+lon_mz+"%2C+"+lat_mz+"%29%2C+"+radius_mz+"%29%0D%0A++%29+.%0D%0A%7D&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on",
    async: false,
    error: function (jqXHR, textStatus, errorThrown) {
        alert(errorThrown);
    },
    success: function (data) {
        let bindings = data.results.bindings;
        for (var item in bindings) {
            // WKT TO GEOJSON via
            let geojson = wellknown.parse(bindings[item].geo.value);
            // LINESTRING TO POLYGON VIA turf
            if (bindings[item].geo.value.includes("LINESTRING")) {
                var coord = turf.getCoords(geojson);
                var line = turf.lineString(coord);
                var polygon = turf.lineStringToPolygon(line);
                geojson = polygon;
            } else if (bindings[item].geo.value.includes("POINT")) {
                let coord = turf.getCoords(geojson);
                let point = turf.point(coord);
                let buffer = turf.buffer(point, 10, "meters");
                let envelope = turf.envelope(buffer);
                geojson = envelope;
            }
            let marker = L.geoJson(geojson, {style: stylePlaceOfWorship});
            marker.properties = {};
            marker.properties.item = bindings[item].item.value;
            marker.properties.label = bindings[item].label.value;
            marker.bindPopup("<i class='small material-icons'>account_balance</i>"+marker.properties.label);
            PlaceOfWorship.addLayer(marker);
        }
    }
});

var styleRestaurant = {
    "color": "#447550",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0.8
};

// load restaurants via linkedgeodata.org
$.ajax({
    type: "GET",
    url: "http://linkedgeodata.org/sparql?default-graph-uri=http%3A%2F%2Flinkedgeodata.org&query=Prefix+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0APrefix+ogc%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgeosparql%23%3E%0D%0APrefix+geom%3A+%3Chttp%3A%2F%2Fgeovocab.org%2Fgeometry%23%3E%0D%0APrefix+lgdo%3A+%3Chttp%3A%2F%2Flinkedgeodata.org%2Fontology%2F%3E%0D%0A%0D%0ASelect+%3Fitem+%3Flabel+%3Fgeo%0D%0AFrom+%3Chttp%3A%2F%2Flinkedgeodata.org%3E+%7B%0D%0A++%3Fitem%0D%0A++++a+lgdo%3A"+lgdtype2+"+%3B%0D%0A++++rdfs%3Alabel+%3Flabel+%3B%0D%0A++++geom%3Ageometry+%5B%0D%0A++++++ogc%3AasWKT+%3Fgeo%0D%0A++++%5D+.%0D%0A+++%0D%0A++Filter+%28%0D%0A++++bif%3Ast_intersects+%28%3Fgeo%2C+bif%3Ast_point+%28"+lon_mz+"%2C+"+lat_mz+"%29%2C+"+radius_mz+"%29%0D%0A++%29+.%0D%0A%7D&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on",
    async: false,
    error: function (jqXHR, textStatus, errorThrown) {
        alert(errorThrown);
    },
    success: function (data) {
        let bindings = data.results.bindings;
        for (var item in bindings) {
            // WKT TO GEOJSON via
            let geojson = wellknown.parse(bindings[item].geo.value);
            // LINESTRING TO POLYGON VIA turf
            if (bindings[item].geo.value.includes("LINESTRING")) {
                let coord = turf.getCoords(geojson);
                let line = turf.lineString(coord);
                let polygon = turf.lineStringToPolygon(line);
                geojson = polygon;
            } else if (bindings[item].geo.value.includes("POINT")) {
                let coord = turf.getCoords(geojson);
                let point = turf.point(coord);
                let buffer = turf.buffer(point, 10, "meters");
                let envelope = turf.envelope(buffer);
                geojson = envelope;
            }
            let marker = L.geoJson(geojson, {style: styleRestaurant});
            marker.properties = {};
            marker.properties.item = bindings[item].item.value;
            marker.properties.label = bindings[item].label.value;
            marker.bindPopup("<i class='small material-icons'>account_balance</i>"+marker.properties.label);
            Restaurant.addLayer(marker);
        }
    }
});

// init map
let mymap = L.map("mapid", {
    center: [45.758889, 4.841389],
    zoom: 5,
    layers: [osmMap, buffer, wikipedia, buffer2, PlaceOfWorship, Restaurant]
});

let baseMaps = {
    "Hot": hotMap,
    "OSM Mapnik": osmMap
};

let overlays ={
    "Buffer Wikipedia": buffer,
    "wikipedia": wikipedia,
    "Buffer LGD": buffer2,
    "LGD PlaceOfWorship": PlaceOfWorship,
    "LGD Restaurant": Restaurant
};

L.control.layers(baseMaps, overlays).addTo(mymap);
