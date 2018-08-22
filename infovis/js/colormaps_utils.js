var borough_color_switcher = {
    "Manhattan" : d3.rgb(10, 112, 4, 0.69),
    "Brooklyn" : d3.rgb(239, 171, 81, 1),
    "Bronx" : d3.rgb(188, 47, 0,  0.69),
    "Queens" : d3.rgb(248, 189, 11, 0.78),
    "Staten Island" : d3.rgb(22, 22, 212, 0.69),
    "EWR" : d3.rgb(155, 0, 198, 0.55),
};

var EXCLUDED_ZONE_COLOR = "fuchsia";

function default_coloring(zone_data){
    return borough_color_switcher[zone_data.properties["borough"]]
}

function plot_map(svg, data, recoloring_function=default_coloring, on_mouse_over=handleMouseOver, on_mouse_out=handledMouseOut) {
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
        .on("mouseover", on_mouse_over)
        .on("mouseout", on_mouse_out)
        .attr("location_id", function (d) { return d.properties["LocationID"] })
        .attr("borough", function (d) { return d.properties["borough"] })
        .attr("zone", function (d) { return d.properties["zone"] })
        .attr("fill", recoloring_function)
        .attr("d", path);
    console.log("Done plotting...");
}

function handleMouseOver() {  // Add interactivity
    let infobox_div = d3.select(".infobox");
    let selected_element = d3.select(this);

    let location_id = selected_element.attr("location_id");
    let zone = selected_element.attr("zone");
    let borough = selected_element.attr("borough");
    let frequency = selected_element.attr("frequency");
    let alpha = selected_element.attr("alpha");

    infobox_div.select("#zone_location_id").append("text").text(location_id);
    infobox_div.select("#zone_name").append("text").text(zone);
    infobox_div.select("#zone_borough").append("text").text(borough);
    infobox_div.select("#frequency").append("text").text(frequency);
    infobox_div.select("#alpha").append("text").text(alpha);

    infobox_div.classed("hidden_el", false);

}

function handledMouseOut() {
    let infobox_div = d3.select(".infobox");
    infobox_div.classed("hidden_el", true);
    infobox_div.selectAll("text").remove();
}

let compute_data = function (zones_info, data, month, dow, ts, prop, excluded=[]) {

    console.log("Submitted values:", month, dow, ts, prop, excluded);

    let result = zones_info;
    let max = 0;

    console.log("Computing data...");

    data.forEach(function(trip){

        let current_id = (prop === "pull") ? trip["PULocationID"] : trip["DOLocationID"] ;

        if (zones_info[current_id] !== undefined && excluded.indexOf(parseInt(current_id)) === -1){
            if(month !== "-1" && month !== trip["Month"].toString())
                return;
            if(dow !== "-1" && dow !== trip["DayOfWeek"].toString())
                return;
            if(ts !== "-1" && ts !== trip["TimeSlot"].toString())
                return;
            //if(borough !== "-1" && borough !== result[current_id]["borough"])
            //    return;

            if (result[current_id]["frequency"] === null || result[current_id]["frequency"] === undefined) {
                result[current_id]["frequency"] = 0;
            }

            result[current_id]["frequency"] += parseInt(trip["Frequency"]);

            if(result[current_id]["frequency"] > max)
                max = parseInt(result[current_id]["frequency"]);
        }
    });

    Object.keys(result).forEach(function(d){
        let loc_id = result[d]["location_id"];
        //let borough_cond = borough !== -1 && result[d]["borough"] !== borough;
        if(excluded_zones.indexOf(parseInt(loc_id)) !== -1) { // zone is excluded
            result[d]["frequency"] = -1;
            result[d]["alpha"] = -1;
        }
        else{
            result[d]["alpha"] = get_alpha_value(result[d]["frequency"], max);
        }
    });


    console.log("Computing done...");

    return {frequencies: result, max_frequency: max};

};

function get_alpha_value(frequency, max){
    return (frequency/max).toFixed(3)
}