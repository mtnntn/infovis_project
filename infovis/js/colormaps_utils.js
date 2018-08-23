var borough_color_switcher = {
    "Manhattan" : d3.rgb(10, 112, 4, 0.69),
    "Brooklyn" : d3.rgb(239, 171, 81, 1),
    "Bronx" : d3.rgb(188, 47, 0,  0.69),
    "Queens" : d3.rgb(248, 189, 11, 0.78),
    "Staten Island" : d3.rgb(22, 22, 212, 0.69),
    "EWR" : d3.rgb(155, 0, 198, 0.55),
};

var BOROUGHS = ["Bronx", "Brooklyn", "EWR", "Manhattan", "Queens", "Staten Island"];

var EXCLUDED_ZONE_COLOR = "fuchsia";

var DOWS = [
    {value:"-1", label: "All" },
    {value: "0", label: "Sunday"},
    {value: "1", label: "Monday"},
    {value: "2", label: "Tuesday"},
    {value: "3", label: "Wednesday"},
    {value: "4", label: "Thursday"},
    {value: "5", label: "Friday"},
    {value: "6", label: "Saturday"}
];

var MONTHS = [
    {value:"-1", label:"All"},
    {value:"1" , label:"January"},
    {value:"2" , label:"February"},
    {value:"3" , label:"March"},
    {value:"4" , label:"April"},
    {value:"5" , label:"May "},
    {value:"6" , label:"June"},
    {value:"7" , label:"July"},
    {value:"8" , label:"August"},
    {value:"9" , label:"September"},
    {value:"10", label:"October"},
    {value:"11", label:"November"},
    {value:"12", label:"December"}
];

var PROPERTIES = [
     {value:"pull", label:"Pull Location"},
     {value:"drop", label:"Drop-off Location"}
]

var TS = [
    {value: "-1", label: "All"},
    {value:"TS1", label: "06.00 - 09.00"},
    {value:"TS2", label: "09.00 - 12.00"},
    {value:"TS3", label: "12.00 - 17.00"},
    {value:"TS4", label: "17.00 - 20.00"},
    {value:"TS5", label: "20.00 - 24.00"},
    {value:"TS6", label: "24.00 - 06.00"}
];

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

function compute_data(zones_info, data, month, dow, ts, prop, excluded=[]) {

    console.log("Submitted values:", month, dow, ts, prop, excluded);

    let result = {};
    let max = 0;

    Object.keys(zones_info).forEach(function (k) {
        let elem = {
            borough : zones_info[k]["borough"],
            location_id: zones_info[k]["location_id"],
            zone: zones_info[k]["zone"],
            frequency : 0,
            alpha: 0.0,
            color: get_interpolated_color(prop, 0.0)
        };
        result[zones_info[k]["location_id"]] = elem;
    });

    console.log("Computing data...");
    data.forEach(function(trip){

        let current_id = (prop === "pull") ? trip["PULocationID"] : trip["DOLocationID"] ;

        if (zones_info[current_id] !== undefined && excluded.indexOf(parseInt(current_id)) === -1){

            let break_by_month = month !== "-1" && month !== trip["Month"].toString();
            let break_by_dow   = dow   !== "-1" &&   dow !== trip["DayOfWeek"].toString();
            let break_by_ts    = ts    !== "-1" &&    ts !== trip["TimeSlot"].toString();

            if(! (break_by_month || break_by_dow || break_by_ts) ){

                result[current_id]["frequency"] += parseInt(trip["Frequency"]);

                if(result[current_id]["frequency"] > max)
                    max = parseInt(result[current_id]["frequency"]);
            }
        }
    });

    Object.keys(result).forEach(function(d){
        let loc_id = result[d]["location_id"];
        if(excluded_zones.indexOf(parseInt(loc_id)) !== -1) { // zone is excluded
            result[d]["frequency"] = -1;
            result[d]["alpha"] = -1;
            result[d]["color"] = EXCLUDED_ZONE_COLOR;
        }
        else{
            result[d]["alpha"] = get_alpha_value(result[d]["frequency"], max);
            result[d]["color"] = get_interpolated_color(prop, result[d]["alpha"]);
        }
    });

    console.log("Computing done...");

    return {frequencies: result, max_frequency: max};

};

function get_alpha_value(frequency, max){
    return (frequency/max).toFixed(3)
}

function get_interpolated_color(property_val, alpha){
    if(property_val==="pull")
        return d3.interpolateRdYlGn(alpha);
    return d3.interpolateRdYlBu(alpha);
}