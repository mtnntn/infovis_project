let svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

let borough_color_switcher = {
    "Manhattan" : d3.rgb(10, 112, 4, 0.69),
    "Brooklyn" : d3.rgb(239, 171, 81, 1),
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
    // Reference: http://mapshaper.org/, https://github.com/topojson/topojson/wiki/Introduction, https://github.com/d3/d3-geo
    let projections = d3.geoAlbers().fitExtent( [ [0,0], [1260,720] ], ny_zones);
    let path = d3.geoPath(projections);

    svg.append("g")
        .attr("class", "zones")
        .selectAll("path")
        .data(ny_zones.features)
        .enter()
        .append("path")
        .attr("class", "zone")
        .attr("location_id", function (d) { return d.properties["LocationID"] })
        .attr("borough", function (d) { return d.properties["borough"] })
        .attr("zone", function (d) { return d.properties["zone"] })
        .attr("fill", function(d) {
            return borough_color_switcher[d.properties["borough"]]
        })
        .attr("d", path)
        .append("title").text(function(d){ let zi = d.properties; console.log(zi); return zi["LocationID"]+ " - " +zi["borough"] + " - " + zi["zone"]; })
}