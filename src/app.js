import "./style/style.css";
import * as $ from "jquery";
import * as L from "leaflet";
import * as wellknown from "wellknown";
import * as turf from "@turf/turf";
import "materialize-css";
import "leaflet-draw";

let ors_key = "58d904a497c67e00015b45fcd2e10661dfa14f2d46c679d259b00197";

let lat_mz = -1;
let lon_mz = -1;
let radius_mz = 10;
let lgdtype = "PlaceOfWorship"; //Museum School PlaceOfWorship Restaurant BusStation PublicTransportThing
let lgdtype2 = "Restaurant"; //Museum School PlaceOfWorship Restaurant BusStation PublicTransportThing
let lgdtype3 = "Amenity"; //Museum School PlaceOfWorship Restaurant BusStation PublicTransportThing
let time = -1;
let type = "";
let calculated_buffer_length = 0;
let area;

$("select").material_select();

// set tile layer
const hotMap = L.tileLayer("http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a>, Tiles courtesy of <a href='http://hot.openstreetmap.org/' target='_blank'>Humanitarian OpenStreetMap Team</a>"
});

const osmMap = L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; <a href='http://openstreetmap.org'>OpenStreetMap</a> Contributors"
});

let buffer = L.layerGroup();
let wikipedia = L.layerGroup();
let PlaceOfWorship = L.layerGroup();
let Restaurant = L.layerGroup();
let BusStation = L.layerGroup();
let walkingArea = L.layerGroup();
let cyclingArea = L.layerGroup();
let center = L.layerGroup();

// init map
const mymap = L.map("mapid", {
    center: [45.5, 4.8],
    zoom: 5,
    layers: [osmMap, center, wikipedia, cyclingArea, walkingArea, PlaceOfWorship, Restaurant, BusStation]
});

const baseMaps = {
    "Hot": hotMap,
    "OSM Mapnik": osmMap
};

const overlays ={
    "Wikipedia": wikipedia,
    "LGD PlaceOfWorship": PlaceOfWorship,
    "LGD Restaurant": Restaurant,
    "LGD Bus Station": BusStation,
    "ORS WalkingArea": walkingArea,
    "ORS CyclingArea": cyclingArea
};

L.control.layers(baseMaps, overlays).addTo(mymap);

var drawControl;
var drawnItems = new L.FeatureGroup();
L.drawLocal.draw.toolbar.buttons.rectangle = "Draw a boundingbox for selection";
L.drawLocal.draw.toolbar.buttons.marker = "Select a point";
function drawControlbar() {
    drawControl = new L.Control.Draw({
        position: "topleft",
        draw: {
            polyline: false,
            polygon: false,
            circle: false,
            marker: true,
            rectangle: false,
            circlemarker: false
        },
        edit: {
            featureGroup: drawnItems,
            remove: false,
            edit: false
        }
    });
    mymap.addControl(drawControl);
}

mymap.on("draw:created", function (e) {
    $("#lat").val(e.layer._latlng.lat.toFixed(5));
    $("#lon").val(e.layer._latlng.lng.toFixed(5));
    center.clearLayers();
    addCenter(e.layer._latlng.lat.toFixed(5),e.layer._latlng.lng.toFixed(5));
    mymap.setView([e.layer._latlng.lat.toFixed(5), e.layer._latlng.lng.toFixed(5)], 15);
});

drawControlbar();

let isInside = (geojson, polygonGeom) => {
    let coord_gj = turf.getCoords(geojson);
    let polygon = turf.polygon(coord_gj);
    let centroid = turf.centroid(polygon);
    // is point in polygonGeom?
    let inside = turf.inside(centroid, polygonGeom);
    return inside;
};

let isInsideWiki = (geojson, polygonGeom) => {
    let inside = turf.inside(geojson, polygonGeom);
    return inside;
};

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
            for (let item in bindings) {
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

const styleBuffer = {
    "color": "black",
    "weight": 3,
    "opacity": 1.0,
    "fillOpacity": 0.0
};

const styleValencia = {
    "color": "#0000FF",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0.8
};

const stylePlaceOfWorship = {
    "color": "#ff7800",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0.8
};

const styleRestaurant = {
    "color": "#447550",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0.8
};

const styleBus = {
    "color": "purple",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0.8
};

const styleWalkingArea = {
    "color": "red",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0
};

const styleCyclingArea = {
    "color": "red",
    "weight": 5,
    "opacity": 1.0,
    "fillOpacity": 0
};

let addBufferPolygon = (envelope) => {
    let tmp = L.geoJSON(envelope, {style: styleBuffer});
    buffer.addLayer(tmp);
};

let addCenter = (lat, lon) => {
    let tmp = L.circle([lat, lon], {
        color: "red",
        fillOpacity: 0.0,
        radius: 50
    });
    center.addLayer(tmp);
};

let getWorshipFromLGD = () => {
    // load place of worships via linkedgeodata.org
    $.ajax({
        type: "GET",
        url: "http://linkedgeodata.org/sparql?default-graph-uri=http%3A%2F%2Flinkedgeodata.org&query=Prefix+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0APrefix+ogc%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgeosparql%23%3E%0D%0APrefix+geom%3A+%3Chttp%3A%2F%2Fgeovocab.org%2Fgeometry%23%3E%0D%0APrefix+lgdo%3A+%3Chttp%3A%2F%2Flinkedgeodata.org%2Fontology%2F%3E%0D%0A%0D%0ASelect+%3Fitem+%3Flabel+%3Fgeo%0D%0AFrom+%3Chttp%3A%2F%2Flinkedgeodata.org%3E+%7B%0D%0A++%3Fitem%0D%0A++++a+lgdo%3A"+lgdtype+"+%3B%0D%0A++++rdfs%3Alabel+%3Flabel+%3B%0D%0A++++geom%3Ageometry+%5B%0D%0A++++++ogc%3AasWKT+%3Fgeo%0D%0A++++%5D+.%0D%0A+++%0D%0A++Filter+%28%0D%0A++++bif%3Ast_intersects+%28%3Fgeo%2C+bif%3Ast_point+%28"+lon_mz+"%2C+"+lat_mz+"%29%2C+"+calculated_buffer_length+"%29%0D%0A++%29+.%0D%0A%7D&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on",
        async: false,
        error: function (jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        },
        success: function (data) {
            let bindings = data.results.bindings;
            for (let item in bindings) {
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
                if (isInside(geojson,area)) {
                    let marker = L.geoJson(geojson, {style: stylePlaceOfWorship});
                    marker.properties = {};
                    marker.properties.item = bindings[item].item.value;
                    marker.properties.label = bindings[item].label.value;
                    marker.bindPopup("<i class='fa fa-bell' aria-hidden='true'></i><br><br>"+marker.properties.label);
                    PlaceOfWorship.addLayer(marker);
                }
            }
        }
    });
};

let getRestaurantFromLGD = () => {
    // load restaurants via linkedgeodata.org
    $.ajax({
        type: "GET",
        url: "http://linkedgeodata.org/sparql?default-graph-uri=http%3A%2F%2Flinkedgeodata.org&query=Prefix+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0APrefix+ogc%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgeosparql%23%3E%0D%0APrefix+geom%3A+%3Chttp%3A%2F%2Fgeovocab.org%2Fgeometry%23%3E%0D%0APrefix+lgdo%3A+%3Chttp%3A%2F%2Flinkedgeodata.org%2Fontology%2F%3E%0D%0A%0D%0ASelect+%3Fitem+%3Flabel+%3Fgeo%0D%0AFrom+%3Chttp%3A%2F%2Flinkedgeodata.org%3E+%7B%0D%0A++%3Fitem%0D%0A++++a+lgdo%3A"+lgdtype2+"+%3B%0D%0A++++rdfs%3Alabel+%3Flabel+%3B%0D%0A++++geom%3Ageometry+%5B%0D%0A++++++ogc%3AasWKT+%3Fgeo%0D%0A++++%5D+.%0D%0A+++%0D%0A++Filter+%28%0D%0A++++bif%3Ast_intersects+%28%3Fgeo%2C+bif%3Ast_point+%28"+lon_mz+"%2C+"+lat_mz+"%29%2C+"+calculated_buffer_length+"%29%0D%0A++%29+.%0D%0A%7D&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on",
        async: false,
        error: function (jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        },
        success: function (data) {
            let bindings = data.results.bindings;
            for (let item in bindings) {
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
                if (isInside(geojson,area)) {
                    let marker = L.geoJson(geojson, {style: styleRestaurant});
                    marker.properties = {};
                    marker.properties.item = bindings[item].item.value;
                    marker.properties.label = bindings[item].label.value;
                    marker.bindPopup("<i class='fa fa-glass' aria-hidden='true'></i><br><br>"+marker.properties.label);
                    Restaurant.addLayer(marker);
                }
            }
        }
    });
};

let getBusFromLGD = () => {
    // load busstations via linkedgeodata.org
    $.ajax({
        type: "GET",
        url: "http://linkedgeodata.org/sparql?default-graph-uri=http%3A%2F%2Flinkedgeodata.org&query=Prefix+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0D%0APrefix+ogc%3A+%3Chttp%3A%2F%2Fwww.opengis.net%2Font%2Fgeosparql%23%3E%0D%0APrefix+geom%3A+%3Chttp%3A%2F%2Fgeovocab.org%2Fgeometry%23%3E%0D%0APrefix+lgdo%3A+%3Chttp%3A%2F%2Flinkedgeodata.org%2Fontology%2F%3E%0D%0A%0D%0ASelect+%3Fitem+%3Flabel+%3Fgeo%0D%0AFrom+%3Chttp%3A%2F%2Flinkedgeodata.org%3E+%7B%0D%0A++%3Fitem%0D%0A++++a+lgdo%3A"+lgdtype3+"+%3B%0D%0A++++rdfs%3Alabel+%3Flabel+%3B%0D%0A++++geom%3Ageometry+%5B%0D%0A++++++ogc%3AasWKT+%3Fgeo%0D%0A++++%5D+.%0D%0A+++%0D%0A++Filter+%28%0D%0A++++bif%3Ast_intersects+%28%3Fgeo%2C+bif%3Ast_point+%28"+lon_mz+"%2C+"+lat_mz+"%29%2C+"+calculated_buffer_length+"%29%0D%0A++%29+.%0D%0A%7D&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on",
        async: false,
        error: function (jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        },
        success: function (data) {
            let bindings = data.results.bindings;
            for (let item in bindings) {
                // WKT TO GEOJSON via
                try {
                    let geojson = wellknown.parse(bindings[item].geo.value);
                    if (bindings[item].geo.value.includes("LINESTRING")) { // LINESTRING TO POLYGON VIA turf
                        let coord = turf.getCoords(geojson);
                        let line = turf.lineString(coord);
                        let polygon = turf.lineStringToPolygon(line);
                        geojson = polygon;
                    } else if (bindings[item].geo.value.includes("POINT")) { //POINT TO ENVELOPE VIA turf
                        let coord = turf.getCoords(geojson);
                        let point = turf.point(coord);
                        let buffer = turf.buffer(point, 10, "meters");
                        let envelope = turf.envelope(buffer);
                        geojson = envelope;
                    } else {
                        //console.log(bindings[item]);
                    }
                    if (isInside(geojson,area)) {
                        let marker = L.geoJson(geojson, {style: styleBus});
                        marker.properties = {};
                        marker.properties.item = bindings[item].item.value;
                        marker.properties.label = bindings[item].label.value;
                        marker.bindPopup("<i class='fa fa-bus' aria-hidden='true'></i><br><br>"+marker.properties.label);
                        BusStation.addLayer(marker);
                    }
                } catch (e) {
                    //console.log(e);
                }
            }
        }
    });
};

let getWalkingAreaFromORS = () => {
    // load walking area via openrouteservice.org
    $.ajax({
        type: "GET",
        url: "https://api.openrouteservice.org/isochrones?locations="+lon_mz+"%2C"+lat_mz+"&profile=foot-walking&range_type=time&range="+time+"&location_type=start&api_key="+ors_key,
        async: false,
        error: function (jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        },
        success: function (data) {
            let marker = L.geoJson(data, {style: styleWalkingArea});
            let polygon = turf.polygon(data.features[0].geometry.coordinates);
            area = polygon;
            let envelope = turf.envelope(polygon);
            let coords = turf.getCoords(envelope);
            let p1 = turf.point(coords[0][0]);
            let p2 = turf.point(coords[0][2]);
            let p3 = turf.point(coords[0][3]);
            let dist1 = Number(turf.distance(p1, p2, "meters"));
            let dist2 = Number(turf.distance(p2, p3, "meters"));
            if (dist1 > dist2) {
                calculated_buffer_length = dist1/2;
            } else {
                calculated_buffer_length = dist2/2;
            }
            addBufferPolygon(envelope);
            calculated_buffer_length = calculated_buffer_length/1000;
            marker.bindPopup("walking "+(time/60)+" minutes");
            walkingArea.addLayer(marker);
        }
    });
};

let getCyclingAreaFromORS = () => {
    // load cycling area via openrouteservice.org
    $.ajax({
        type: "GET",
        url: "https://api.openrouteservice.org/isochrones?locations="+lon_mz+"%2C"+lat_mz+"&profile=cycling-regular&range_type=time&range="+time+"&location_type=start&api_key="+ors_key,
        async: false,
        error: function (jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        },
        success: function (data) {
            let marker = L.geoJson(data, {style: styleCyclingArea});
            let polygon = turf.polygon(data.features[0].geometry.coordinates);
            area = polygon;
            let envelope = turf.envelope(polygon);
            let coords = turf.getCoords(envelope);
            let p1 = turf.point(coords[0][0]);
            let p2 = turf.point(coords[0][2]);
            let p3 = turf.point(coords[0][3]);
            let dist1 = Number(turf.distance(p1, p2, "meters"));
            let dist2 = Number(turf.distance(p2, p3, "meters"));
            if (dist1 > dist2) {
                calculated_buffer_length = dist1/2;
            } else {
                calculated_buffer_length = dist2/2;
            }
            addBufferPolygon(envelope);
            calculated_buffer_length = calculated_buffer_length/1000;
            marker.bindPopup("cycling "+(time/60)+" minutes");
            cyclingArea.addLayer(marker);
        }
    });
};

let getWikipedia = () => {
    // read valencia data from wikipedia api
    $.ajax({
        type: "GET",
        url: "https://en.wikipedia.org/w/api.php?action=query&gsmaxdim=10000&list=geosearch&gslimit=1000&gsradius="+(calculated_buffer_length*1000)+"&gscoord="+lat_mz+"|"+lon_mz+"&continue&format=json&origin=*",
        async: false,
        error: function (jqXHR, textStatus, errorThrown) {
            alert(errorThrown);
        },
        success: function (data) {
            let geosearch = data.query.geosearch;
            for (let item in geosearch) {
                let point = turf.point([geosearch[item].lon, geosearch[item].lat]);
                if (isInsideWiki(point,area)) {
                    let buffer = turf.buffer(point, 20, "meters");
                    let envelope = turf.envelope(buffer);
                    let marker = L.geoJson(envelope, {style: styleValencia});
                    marker.properties = {};
                    marker.properties.wiki = geosearch[item];
                    wikipedia.addLayer(marker);
                }
            }
        }
    });
    // set wikipedia popups asynch
    wikipedia.eachLayer(function(layer){
        let wikiproperties = layer.properties.wiki;
        layer.bindPopup("<a href='https://en.wikipedia.org/wiki/"+wikiproperties.title+"' target='_blank'>"+wikiproperties.title+"</a>"+getThumbnailFromWikipedia(wikiproperties));
    });
};

$("a[href='#search']").click(function(){
    // set values
    lat_mz = Number($("#lat").val());
    lon_mz = Number($("#lon").val());
    type = $("#type option:selected").val();
    time = Number($("#time option:selected").val()*60);
    // reset layers
    buffer.clearLayers();
    PlaceOfWorship.clearLayers();
    Restaurant.clearLayers();
    BusStation.clearLayers();
    walkingArea.clearLayers();
    cyclingArea.clearLayers();
    wikipedia.clearLayers();
    center.clearLayers();
    // load layers
    if (lat_mz !== "" && lon_mz !== "" && type !== "" && time > 0) {
        if (type==="walking") {
            getWalkingAreaFromORS();
        } else if (type==="cycling") {
            getCyclingAreaFromORS();
        }
        if ($("#worship").is(":checked")) {
            getWorshipFromLGD();
        }
        if ($("#restaurant").is(":checked")) {
            getRestaurantFromLGD();
        }
        if ($("#bus").is(":checked")) {
            getBusFromLGD();
        }
        if ($("#wikipedia").is(":checked")) {
            getWikipedia();
        }
        mymap.setView([lat_mz, lon_mz], 13);
    } else {
        alert("no input value");
    }

});
