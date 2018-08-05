var borough_color_switcher = {
    "Manhattan" : d3.rgb(10, 112, 4, 0.69),
    "Brooklyn" : d3.rgb(239, 171, 81, 1),
    "Bronx" : d3.rgb(188, 47, 0,  0.69),
    "Queens" : d3.rgb(248, 189, 11, 0.78),
    "Staten Island" : d3.rgb(22, 22, 212, 0.69),
    "EWR" : d3.rgb(155, 0, 198, 0.55),
};

function default_coloring(zone_data){
    return borough_color_switcher[zone_data.properties["borough"]]
}

function plot_map(svg, data, recoloring_function=default_coloring) {
    console.log("Plotting data...");
    let ny_zones = topojson.feature(data, {
        type: "GeometryCollection",
        geometries: data.objects["ny_zones"]["geometries"]
    });
    let projections = d3.geoMercator().center([-73.94, 40.70]).scale(90000).translate([ (1260)/2, 900/2]);
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
        .attr("fill", recoloring_function)
        .attr("d", path);
    console.log("Done plotting...");
}

function handleMouseOver() {  // Add interactivity
    let infobox_div = d3.select("div.infobox");
    let selected_element = d3.select(this);

    let location_id = selected_element.attr("location_id");
    let zone = selected_element.attr("zone");
    let borough = selected_element.attr("borough");
    let color = borough_color_switcher[borough];

    infobox_div.style("color", color);
    infobox_div.select(".zone_location_id").append("text").text(location_id);
    infobox_div.select(".zone_name").append("text").text(zone);
    infobox_div.select(".zone_borough").append("text").text(borough.toUpperCase());
}

function handledMouseOut() {
    let infobox_div = d3.select("div.infobox");
    infobox_div.selectAll("br").remove();
    infobox_div.selectAll("text").remove();
}

let colorize_map = function (svg, data, month, dow, ts, prop, excluded=[]) {

    let result = [];
    let max = 0;

    console.log("Computing data...");
    data.forEach(function(trip){

        let current_id = (prop === "pull") ? trip["PULocationID"] : trip["DOLocationID"] ;

        if (excluded.indexOf(current_id) === -1) { //zone not excluded

            if(month !== "-1" && month !== trip["Month"].toString())
                return;
            if(dow !== "-1" && dow !== trip["DayOfWeek"].toString())
                return;
            if(ts !== "-1" && ts !== trip["TimeSlot"].toString())
                return;

            if (result[current_id] == null || result[current_id] === undefined)
                result[current_id] = 0;

            result[current_id] += parseInt(trip["Frequency"]);

            if(result[current_id] > max)
                max = parseInt(result[current_id]);
        }
    });

    console.log("Recoloring...");

    svg.selectAll(".zone").attr("fill", function(node){
        let location_id = node["properties"]["LocationID"];
        if(excluded.indexOf(location_id) === -1){ // zone not excluded
            let value_to_iterpolate = result[location_id]/max;
            if(prop==="pull")
                return d3.interpolateRdYlGn(value_to_iterpolate);
                // return d3.interpolateOranges(value_to_iterpolate);
            return d3.interpolateRdYlBu(value_to_iterpolate);
            // return d3.interpolatePurples(value_to_iterpolate);
        }
        else{
            return "black";
        }
    });

    console.log("Recoloring done...");

};