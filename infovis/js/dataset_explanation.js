let map_svg = d3.select("svg.map").attr("width", 900).attr("height", 1260);

let infobox_div = d3.select("div.infobox");

var borough_color_switcher = {
    "Manhattan" : d3.rgb(10, 112, 4, 0.69),
    "Brooklyn" : d3.rgb(239, 88, 118, 0.69),//d3.rgb(239, 171, 81, 1),
    "Bronx" : d3.rgb(188, 47, 0,  0.69),
    "Queens" : d3.rgb(248, 189, 11, 0.78),
    "Staten Island" : d3.rgb(22, 22, 212, 0.69),
    "EWR" : d3.rgb(155, 0, 198, 0.55),
};

Promise.all([d3.json("data/geodata/ny_zones.json")]).then(plot_map);

function plot_map(us) {
    us = us[0];

    let ny_zones = topojson.feature(us, {
        type: "GeometryCollection",
        geometries: us.objects["ny_zones"]["geometries"]
    });

    /* References:
    * - https://stackoverflow.com/questions/18920345/d3-js-mercator-projection-to-nyc-map
    * - http://mapshaper.org/
    * - https://github.com/topojson/topojson/wiki/Introduction
    * - https://github.com/d3/d3-geo
    * */
    let projections = d3.geoMercator().center([-73.94, 40.70]).scale(90000).translate([ (1050)/2, 450]);
    let path = d3.geoPath(projections);

    map_svg.append("g")
        .attr("class", "zones")
        .selectAll("path")
        .data(ny_zones.features)
        .enter()
        .append("path")
        .attr("class", "zone")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handledMouseOut)
        .attr("location_id", function (d) { return d.properties["LocationID"] })
        .attr("borough", function (d) { return d.properties["borough"] })
        .attr("zone", function (d) { let zn = d.properties["zone"]; return zn })
        .attr("fill", function(d) {
            return borough_color_switcher[d.properties["borough"]]
        })
        .attr("d", path);
}

function handleMouseOver() {  // Add interactivity
    let selected_element = d3.select(this);

    let location_id = selected_element.attr("location_id");
    let zone = selected_element.attr("zone");
    let borough = selected_element.attr("borough");
    let color = borough_color_switcher[borough];

    infobox_div.style("color", color).style("margin-top", "7em");
    infobox_div.select(".zone_location_id").append("text").text(location_id);
    infobox_div.select(".zone_name").append("text").text(zone);
    infobox_div.select(".zone_borough").append("text").text(borough.toUpperCase());
}

function handledMouseOut() {
    infobox_div.selectAll("br").remove();
    infobox_div.selectAll("text").remove();
}