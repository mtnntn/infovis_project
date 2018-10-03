var borough_color_switcher = {
    "Manhattan" : d3.rgb(10, 112, 4, 0.69),
    "Brooklyn" : d3.rgb(239, 88, 118, 0.69),//d3.rgb(239, 171, 81, 1),
    "Bronx" : d3.rgb(188, 47, 0,  0.69),
    "Queens" : d3.rgb(248, 189, 11, 0.78),
    "Staten Island" : d3.rgb(22, 22, 212, 0.69),
    "EWR" : d3.rgb(155, 0, 198, 0.55),
};

var BOROUGHS = ["Bronx", "Brooklyn", "EWR", "Manhattan", "Queens", "Staten Island"];

var COLOR_EXCLUDED_ZONE = "fuchsia";

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
];

var TS = [
    {value: "-1", label: "All"},
    {value:"TS1", label: "06.00 - 09.00"},
    {value:"TS2", label: "09.00 - 12.00"},
    {value:"TS3", label: "12.00 - 17.00"},
    {value:"TS4", label: "17.00 - 20.00"},
    {value:"TS5", label: "20.00 - 24.00"},
    {value:"TS6", label: "24.00 - 06.00"}
];

var COLOR_ZERO_FREQUENCY = "rgb(221, 217, 217)";

function default_coloring(zone_data){
    return borough_color_switcher[zone_data.properties["borough"]]
}

function plot_map(svg, data, recoloring_function=default_coloring, on_mouse_over=handleMouseOver, on_mouse_out=handledMouseOut) {
    console.log("Plotting data...");
    let ny_zones = topojson.feature(data, {
        type: "GeometryCollection",
        geometries: data.objects["ny_zones"]["geometries"]
    });
    let projections = d3.geoMercator().center([-73.94, 40.70]).scale(90000).translate([(1260)/2, 900/2]);
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
    let self_trips = selected_element.attr("self_trips");
    let alpha = selected_element.attr("alpha");

    infobox_div.select("#zone_location_id").append("text").text(location_id);
    infobox_div.select("#zone_name").append("text").text(zone);
    infobox_div.select("#zone_borough").append("text").text(borough);
    infobox_div.select("#frequency").append("text").text(frequency);
    infobox_div.select("#self_trips").append("text").text(self_trips);
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
        result[zones_info[k]["location_id"]] = {
            borough : zones_info[k]["borough"],
            location_id: zones_info[k]["location_id"],
            zone: zones_info[k]["zone"],
            frequency : 0,
            alpha: 0.0,
            color: get_interpolated_color(prop, 0.0),
            self_trips: 0,
            to:{}, // {zone_id, frequency of trips from elem.location_id and the location that has this key as id }
            from:{} // {zone_id, frequency of trips from the location that has this key as id and elem.location_id }
        };
    });

    console.log("Computing data...");
    data.forEach(function(trip){

        let trip_pull_location = trip["PULocationID"];
        let trip_drop_location = trip["DOLocationID"];

        let current_id = (prop === "pull") ? trip_pull_location : trip_drop_location ;

        let go_on_condition = zones_info[trip_pull_location] !== undefined
            && zones_info[trip_drop_location] !== undefined
            && excluded.indexOf(parseInt(trip_pull_location)) === -1
            && excluded.indexOf(parseInt(trip_drop_location)) === -1;

        if (go_on_condition){

            let break_by_month = month !== "-1" && month !== trip["Month"].toString();
            let break_by_dow   = dow   !== "-1" &&   dow !== trip["DayOfWeek"].toString();
            let break_by_ts    = ts    !== "-1" &&    ts !== trip["TimeSlot"].toString();

            if(! (break_by_month || break_by_dow || break_by_ts) ){

                let trip_frequency = parseInt(trip["Frequency"]);

                result[current_id]["frequency"] += trip_frequency;

                if(result[current_id]["frequency"] > max){
                    max = parseInt(result[current_id]["frequency"]);
                }

                // UPDATE STATS For the zone.
                if(trip_pull_location === trip_drop_location){
                    result[trip_pull_location]["self_trips"] += trip_frequency;
                }
                else{
                    //to => ids of the drop_location foreach trip
                    if(!(trip_drop_location in result[trip_pull_location]["to"]) ){
                        result[trip_pull_location]["to"][trip_drop_location] = 0;
                    }
                    result[trip_pull_location]["to"][trip_drop_location] += trip_frequency;

                    //from => id
                    if(!(trip_pull_location in result[trip_drop_location]["from"])){
                        result[trip_drop_location]["from"][trip_pull_location] = 0;
                    }
                    result[trip_drop_location]["from"][trip_pull_location] += trip_frequency;
                }
            }
        }
    });

    Object.keys(result).forEach(function(d){
        let loc_id = result[d]["location_id"];
        if(excluded_zones.indexOf(parseInt(loc_id)) !== -1) { // zone is excluded
            result[d]["frequency"] = -1;
            result[d]["alpha"] = -1;
            result[d]["color"] = COLOR_EXCLUDED_ZONE;
        }
        else{
            result[d]["alpha"] = get_alpha_value(result[d]["frequency"], max);
            result[d]["color"] = (result[d]["frequency"]===0) ? COLOR_ZERO_FREQUENCY : result[d]["color"] = get_interpolated_color(prop, result[d]["alpha"]) ;
        }
    });

    console.log("Computing done...");

    return {frequencies: result, max_frequency: max};

}

function get_trip_matrix(computed_data, zones_info){
    let matrix = [];
    let computed_frequencies = computed_data["frequencies"];

    Object.keys(zones_info).forEach(function (current_zone_id) {
        let zero_filled_array = Array.apply(null, Array(263)).map(Number.prototype.valueOf, 0);
        Object.keys(computed_frequencies[current_zone_id]["to"]).forEach(function (destination_id) {
            zero_filled_array[destination_id] += computed_frequencies[current_zone_id]["to"][destination_id];
        });
        zero_filled_array[current_zone_id] += computed_frequencies[current_zone_id]["self_trips"];
        matrix.push(zero_filled_array);
    });
    return matrix;
}

function get_borough_matrix(computed_data, zones_info){
    let matrix = [
        [0,0,0,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,0,0,0],
        [0,0,0,0,0,0]
    ];
    let frequencies = computed_data["frequencies"];

    Object.keys(frequencies).forEach(function(location_id){
        let current_departures = frequencies[location_id]["to"];
        let current_zone_borough = zones_info[location_id]["borough"];
        matrix[BOROUGHS.indexOf(current_zone_borough)][BOROUGHS.indexOf(current_zone_borough)] += frequencies[location_id]["self_trips"];
        Object.keys(current_departures).forEach(function(departure_to){
            let current_departure_borough = zones_info[departure_to]["borough"];
            matrix[BOROUGHS.indexOf(current_zone_borough)][BOROUGHS.indexOf(current_departure_borough)] += current_departures[departure_to];
        });
    });
    return matrix;
}

function get_alpha_value(frequency, max){
    return (frequency/max).toFixed(3)
}

function get_interpolated_color(property_val, alpha){
    if(property_val==="pull")
        return d3.interpolateRdYlGn(alpha);
    return d3.interpolateRdYlBu(alpha);
}

function show_tooltip(element_node){
    $(element_node).tooltip("show");
}

function hide_tooltip(element_node){
    $(element_node).tooltip("hide");
}