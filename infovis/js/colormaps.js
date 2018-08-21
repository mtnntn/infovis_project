let svg = d3.select("svg.map_svg");
let width = +svg.attr("width");
let height = +svg.attr("height");

/* Form fields */
let month = d3.select("#month");
let prop = d3.select("#property");
let dow = d3.select("#dow");
let ts = d3.select("#ts");

/* Legend */
let legend_svg = d3.select("svg.legend_svg");

/* Zone exlcuded from the computation */
let excluded_zones = [];

Promise.all([d3.json("data/geodata/ny_zones.json")]).then(function (map_data) {

    d3.select("#month").attr("value", "-1");
    d3.select("#dow").attr("value", "-1");
    d3.select("#ts").attr("value", "-1");
    d3.select("#property").attr("value", "pull");

    Promise.all([d3.tsv("data/month_dow_ts_puloc_doloc.csv")]).then(function(dataset_data){

        plot_map(svg, map_data[0], function(){return "black";});    // plot the map

        update_info(svg, dataset_data[0], excluded_zones);      // colorize the map
        svg.selectAll(".zone").on("click", function(n){ // Exclude zone on click
            console.log("Updating Excluded zones: ", excluded_zones);
            let zone_location_id = n.properties["LocationID"];
            exclude_zone(legend_svg, d3.select(this), zone_location_id, excluded_zones);
            console.log("Excluded zones updating done: ", excluded_zones);
        });

        d3.select("#form_submit").on("click", function(){ // recolor map according to the submitted input.
            update_info(svg, dataset_data[0], excluded_zones);
        });

    });
});

function update_info(svg, dataset_data, excluded_zones){
    let month_v = month.node().value;
    let prop_v = prop.node().value;
    let dow_v = dow.node().value;
    let ts_v = ts.node().value;

    let computed_data = compute_data(svg, dataset_data, month_v, dow_v, ts_v, prop_v, excluded_zones);

    let table_container = d3.select("#table-container");
    initialize_table(table_container);

    console.log("Recoloring Map and Updating Table...");
    svg.selectAll(".zone").attr("fill", function(node){
        let location_id = node["properties"]["LocationID"];
        let zone = node["properties"]["zone"];
        let borough = node["properties"]["borough"];

        if(excluded_zones.indexOf(location_id) === -1){ // zone not excluded
            let current_location_frequency = computed_data["frequencies"][location_id];
            let alpha = get_alpha_value(current_location_frequency, computed_data["max_frequency"]);
            append_tr_to_table(table_container, prop_v, location_id, borough, zone, current_location_frequency, alpha);
            return get_interpolated_color(prop_v, alpha);
        }
        else{
            // append_tr_to_table(table_container, location_id, borough, zone, -1);
            return EXCLUDED_ZONE_COLOR;
        }
    }).attr("frequency", function(node){
        let location_id = node["properties"]["LocationID"];
        if(excluded_zones.indexOf(location_id)!==-1) // zone is excluded because in the array of the excluded zones
            return -1;
        return computed_data["frequencies"][location_id];
    }).attr("alpha", function(node){
        let location_id = node["properties"]["LocationID"];
        if(excluded_zones.indexOf(location_id)!==-1) // zone is excluded because in the array of the excluded zones
            return -1;
        return get_alpha_value(computed_data["frequencies"][location_id], computed_data["max_frequency"]);
    }).attr("prev_fill", null);
    console.log("Recoloring Map and Updating Table done...");

    append_legend(legend_svg, prop_v);
}

function initialize_table(table_container){
    console.log("Creating table...");

    table_container.select("table").remove();
    let table = table_container.append("table").classed("table", true);
    let table_head = table.append("thead");
    let table_head_tr = table_head.append("tr");
    table_head_tr.append("th").attr("scope", "col").text("LocationID");
    table_head_tr.append("th").attr("scope", "col").text("Borough");
    table_head_tr.append("th").attr("scope", "col").text("Zone");
    table_head_tr.append("th").attr("scope", "col").text("Frequency");
    table_head_tr.append("th").attr("scope", "col").text("Alpha");
    table_head_tr.append("th").attr("scope", "col").attr("width", "2em");
    // table_head_tr.append("th").attr("scope", "col").text("Actions");
    table.append("tbody");

    console.log("Table creation done...");
}

function append_tr_to_table(table_container, prop_v, location_id, borough, zone, frequency, alpha){
    let table_body = table_container.select("tbody");
    let current_tr = table_body.append("tr");
    current_tr.append("td").text(location_id);
    current_tr.append("td").text(borough);
    current_tr.append("td").text(zone);
    current_tr.append("td").text(frequency);
    current_tr.append("td").text(alpha);
    current_tr.append("td").style("background-color", get_interpolated_color(prop_v, alpha));
    // let actions = current_tr.append("td").append("div").classed("btn-group-sm", true).attr("role", "group");
    // actions.append("button").classed("btn btn-warning", true).text("Exclude");
    // actions.append("button").classed("btn btn-info", true).text("Show");
}

function exclude_zone(svg, d3_obj, zone_to_exclude, excluded_zones){
    let excluded_zones_div = d3.select("div.excluded_zones_div");
    let excluded_zones_list = excluded_zones_div.select("#excluded_zones_list");
    let zone_to_exclude_index = excluded_zones.indexOf(zone_to_exclude);

    if(zone_to_exclude_index === -1){ //the zone should be added to the list
        d3_obj.attr("prev_fill", d3_obj.attr("fill"));
        d3_obj.attr("fill", EXCLUDED_ZONE_COLOR);
        d3_obj.append("title").text("Excluded zone");
        let li_text = [d3_obj.attr("location_id"), d3_obj.attr("borough"), d3_obj.attr("zone")].join(" - ");
        excluded_zones_list.append("tr").attr("location_id", d3_obj.attr("location_id")).append("td").text(li_text);
        excluded_zones.push(zone_to_exclude);
    }
    else{
        d3_obj.attr("fill", d3_obj.attr("prev_fill"));
        d3_obj.attr("prev_fill", null);
        d3_obj.selectAll("title").remove();
        excluded_zones_list.select("tr[location_id='"+d3_obj.attr("location_id")+"']").remove();
        excluded_zones.splice(zone_to_exclude_index, 1);
    }

    if(excluded_zones.length === 0){
        excluded_zones_div.classed("hidden_el", true);
    }
    else{
        excluded_zones_div.classed("hidden_el", false);
    }
}

function append_legend(svg, property){
    console.log("Apppending legend...");

    svg.selectAll("g").remove();

    let c = (property === "pull")
        ? d3.scaleLinear().domain([1, 11]).range(d3.schemeRdYlGn[11])
        : d3.scaleLinear().domain([1, 11]).range(d3.schemeRdYlBu[11]);

    let text = (property === "pull") ? "Pull Location Frequency" : "Drop-off Location Frequency";

    let g = svg.append("g");

    g.append("text").attr("y", "-2em").text(text);

    g.selectAll("rect")
        .data(c.range())
        .enter()
        .append("rect")
        .attr("fill", function(d){return d;})
        .attr("width", "1.5em")
        .attr("height", "1.5em")
        .attr("x", function (d){
            return ((c.range().indexOf(d))*1.5).toString()+"em";
        });

    g.attr("transform", "translate(0,80)");

    console.log("Legend appended...");
}

function get_alpha_value(frequency, max){
    return (frequency/max).toFixed(3)
}

function get_interpolated_color(property_val, alpha){
    if(property_val==="pull")
        return d3.interpolateRdYlGn(alpha);
    return d3.interpolateRdYlBu(alpha);
}