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
        .on("mouseover", handleMouseOver)
        .on("mouseout", handledMouseOut)
        .attr("location_id", function (d) { return d.properties["LocationID"] })
        .attr("borough", function (d) { return d.properties["borough"] })
        .attr("zone", function (d) { return d.properties["zone"] })
        .attr("fill", function(d) {
            return borough_color_switcher[d.properties["borough"]]
        })
        .attr("d", path)
}

function handleMouseOver(d, i) {  // Add interactivity
    let location_id = d3.select(this).attr("location_id");
    let zone = d3.select(this).attr("zone");
    let borough = d3.select(this).attr("borough");

    let infobox = svg.append("g").attr("transform", "translate(200,200)").classed("infobox", true);

    infobox.append("circle")
        .attr("r", 160)
        .attr("fill", borough_color_switcher[borough]);

    infobox.append("text").attr("text-anchor", "middle")
        .text(location_id)
        .attr("dy", -20)
        .attr("fill", "white")
        .attr("font-size", "1.5em");

    infobox.append("text").attr("text-anchor", "middle")
        .text(zone)
        .attr("dy", 10)
        .attr("fill", "white")
        .attr("font-size", "1.2em");

    infobox.append("text").attr("text-anchor", "middle")
        .text(borough)
        .attr("dy", 40)
        .attr("fill", "white")
        .attr("font-size", "1.2em");
}

function handledMouseOut(d, i) {
    svg.selectAll("g.infobox").remove();
}