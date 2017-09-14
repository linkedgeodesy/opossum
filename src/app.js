import "./style/style.css";
import * as $ from "jquery";
import * as L from "leaflet";
import * as wellknown from "wellknown";
import * as turf from "@turf/turf";
import "materialize-css";

let ors_key = "58d904a497c67e00015b45fcd2e10661dfa14f2d46c679d259b00197";

let lat = 39.4699075;
let lon = -0.3762881000000107;
let radius = 10000;

let lat_mz = 50.0;
let lon_mz = 8.271111;
let radius_mz = 10;
let lgdtype = "PlaceOfWorship"; //Museum School PlaceOfWorship Restaurant
let lgdtype2 = "Restaurant"; //Museum School PlaceOfWorship Restaurant
let range_mz_min = 25;
let range_mz = range_mz_min*60;

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
    color: "#000",
    fillOpacity: 0.0,
    radius: radius
});

let buffer2 = L.circle([lat_mz, lon_mz], {
    color: "#000",
    fillOpacity: 0.0,
    radius: radius
});

let wikipedia = L.layerGroup();
let PlaceOfWorship = L.layerGroup();
let Restaurant = L.layerGroup();
let walkingArea = L.layerGroup();
let cyclingArea = L.layerGroup();

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

let getThumbnailFromWikipedia = (json) => {
    let thumbnail_img = "";
    $.ajax({
        type: "GET",
        url: "https://en.wikipedia.org/w/api.php?action=query&pageids="+json.pageid+"&prop=info%7Cextracts%7Ccoordinates%7Cpageimages&coprop=type%7Cname%7Cdim&inprop=url&exchars=500&exsectionformat=plain&explaintext&continue=&format=json&pithumbsize=250&format=json&origin=*",
        async: false,
        error: function (jqXHR, textStatus, errorThrown) {
            //alert(errorThrown);
        },
        success: function (data) {
            let thumbnail = data.query.pages[json.pageid].thumbnail;
            if (thumbnail) {
                thumbnail_img += "<br><br><img src='"+thumbnail.source+"' width='250'>";
            }
        }
    });
    return thumbnail_img;
};

var styleValencia = {
    "color": "#0000FF",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0.8
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
            let point = turf.point([geosearch[item].lon, geosearch[item].lat]);
            let buffer = turf.buffer(point, 20, "meters");
            let envelope = turf.envelope(buffer);
            let marker = L.geoJson(envelope, {style: styleValencia});
            marker.properties = {};
            marker.properties.wiki = geosearch[item];
            marker.bindPopup("<a href='https://en.wikipedia.org/wiki/"+marker.properties.wiki.title+"' target='_blank'>"+marker.properties.wiki.title+"</a>"+getThumbnailFromWikipedia(geosearch[item]));
            //marker.bindPopup("<a href='https://en.wikipedia.org/wiki/"+marker.properties.wiki.title+"' target='_blank'>"+marker.properties.wiki.title+"</a>"+getTypesFromDBpedia(geosearch[item]));
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
            marker.bindPopup("<i class='fa fa-bell' aria-hidden='true'></i><br><br>"+marker.properties.label);
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
            marker.bindPopup("<i class='fa fa-glass' aria-hidden='true'></i><br><br>"+marker.properties.label);
            Restaurant.addLayer(marker);
        }
    }
});

var styleWalkingArea = {
    "color": "grey",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0.8
};

// load waking area via openrouteservice.org
$.ajax({
    type: "GET",
    url: "https://api.openrouteservice.org/isochrones?locations="+lon_mz+"%2C"+lat_mz+"&profile=foot-walking&range_type=time&range="+range_mz+"&location_type=start&api_key="+ors_key,
    async: false,
    error: function (jqXHR, textStatus, errorThrown) {
        alert(errorThrown);
    },
    success: function (data) {
        let marker = L.geoJson(data, {style: styleWalkingArea});
        marker.bindPopup("walking 25 minutes");
        walkingArea.addLayer(marker);
    }
});

var styleCyclingArea = {
    "color": "lightblue",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0.8
};

// load cycling area via openrouteservice.org
$.ajax({
    type: "GET",
    url: "https://api.openrouteservice.org/isochrones?locations="+lon_mz+"%2C"+lat_mz+"&profile=cycling-regular&range_type=time&range="+range_mz+"&location_type=start&api_key="+ors_key,
    async: false,
    error: function (jqXHR, textStatus, errorThrown) {
        alert(errorThrown);
    },
    success: function (data) {
        let marker = L.geoJson(data, {style: styleCyclingArea});
        marker.bindPopup("cycling 25 minutes");
        cyclingArea.addLayer(marker);
    }
});

// init map
let mymap = L.map("mapid", {
    center: [45.5, 4.8],
    zoom: 6,
    layers: [osmMap, buffer, wikipedia, buffer2, cyclingArea, walkingArea, PlaceOfWorship, Restaurant]
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
    "LGD Restaurant": Restaurant,
    "ORS WalkingArea 25min": walkingArea,
    "ORS CyclingArea 25min": cyclingArea
};

L.control.layers(baseMaps, overlays).addTo(mymap);
mymap.fitBounds(mymap.getBounds());
