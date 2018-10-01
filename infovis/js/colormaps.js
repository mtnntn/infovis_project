let svg = d3.select("svg.map_svg");
let width = +svg.attr("width");
let height = +svg.attr("height");

/* Form fields */
let month = d3.select("#month");
let prop = d3.select("#property");
let borough = d3.select("#borough");
let dow = d3.select("#dow");
let ts = d3.select("#ts");

/* Legend */
let legend_svg = d3.select("svg.legend_svg");

/* Zone exlcuded from the computation */
let excluded_zones = [];
let excluded_boroughs = [];

/* Default Sorting for the table*/
let sorting_asc = true;

form_reset();

Promise.all([d3.json("data/geodata/ny_zones.json"), d3.tsv("data/month_dow_ts_puloc_doloc.csv")]).then(function (data) {

    let map_data = data[0];
    let dataset_data = data[1];

    let zones_info = {};
    map_data["objects"]["ny_zones"]["geometries"].forEach(function(el){
        let zi = el["properties"];
        zones_info[zi["LocationID"].toString()] = {
            "location_id": zi["LocationID"].toString(),
            "zone": zi["zone"],
            "borough": zi["borough"]
        };
    });

    plot_map(svg, map_data, function(){return "black";});    // plot the map
    update_info(svg, zones_info, dataset_data, excluded_zones);      // colorize the map

    svg.selectAll(".zone").on("click", function(n){ // Exclude zone on click
        console.log("Updating Excluded zones: ", excluded_zones);
        let zone_location_id = n.properties["LocationID"];
        exclude_zone(legend_svg, d3.select(this), zone_location_id, excluded_zones);
        console.log("Excluded zones updating done: ", excluded_zones);
    });

    d3.select("#form_submit").on("click", function(){ // recolor map according to the submitted input.
        update_info(svg, zones_info, dataset_data, excluded_zones);
    });
});

let handle_line_mouseover = function(){
    let current_node_class = "";
    $.each(this.classList, function(k, v){ if(v.indexOf("path_to") !== -1) current_node_class=v; });
    d3.selectAll("."+current_node_class).classed("active_path", true);
    let circle_node = d3.select("circle."+current_node_class);
    show_tooltip(circle_node.node());
    circle_node.classed("active_path", true);
};

let handle_line_mouseleave = function(){
    let current_node_class = "";
    $.each(this.classList, function(k, v){ if(v.indexOf("path_to") !== -1) current_node_class=v; });
    d3.selectAll("."+current_node_class).classed("active_path", false);
    let circle_node = d3.select("circle."+current_node_class);
    hide_tooltip(circle_node.node());
    circle_node.classed("active_path", false);
};

function get_path_total_length(x1, y1, x2, y2){
    return Math.sqrt( Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2) )
}

function update_info(svg, zones_info, dataset_data, excluded_zones){
    let month_v = month.node().value;
    let prop_v = prop.node().value;
    let dow_v = dow.node().value;
    let ts_v = ts.node().value;
    excluded_boroughs = get_selected_boroughs();

    let computed_data = compute_data(zones_info, dataset_data, month_v, dow_v, ts_v, prop_v, excluded_zones);

    console.log("Recoloring Map...");

    svg.selectAll(".zone").attr("prev_fill", null).attr("fill", function(node){
        let location_id = node["properties"]["LocationID"];
        return computed_data["frequencies"][location_id]["color"];
    }).attr("frequency", function(node){
        let location_id = node["properties"]["LocationID"];
        return computed_data["frequencies"][location_id]["frequency"];
    }).attr("self_trips", function(node){
        let location_id = node["properties"]["LocationID"];
        return computed_data["frequencies"][location_id]["self_trips"];
    }).attr("alpha", function(node){
        let location_id = node["properties"]["LocationID"];
        return computed_data["frequencies"][location_id]["alpha"];
    }).on("contextmenu", function(node){

        let node_properties = node["properties"];
        // let node_coordinates = node["geometry"]["coordinates"][0];
        let node_location_id = node_properties["LocationID"];
        let result_data = computed_data["frequencies"][node_location_id];

        let node_center = get_center(this);
        let cx = node_center[0];
        let cy = node_center[1];

        d3.select("#zone_trips").remove();
        let svg_path_group = svg.append("g").attr("id", "zone_trips");
        svg_path_group.classed("zone_arrivals", true);

        let max_freq = d3.max(get_dict_values(result_data["to"]));
        let min_freq =d3.min(get_dict_values(result_data["to"]));
        let total_trips = d3.sum(get_dict_values(result_data["to"]));

        let destinations_data = Object.keys(result_data["to"]).map(function(to_zone_id){
            let cx2_cy2 = get_center(d3.select("path.zone[location_id='"+to_zone_id+"']").node());
            let cx2 = cx2_cy2[0];
            let cy2 = cx2_cy2[1];

            let denom = (max_freq - min_freq);
            denom = (denom === 0)?1:denom;
            let normalized_result = (result_data["to"][to_zone_id] - min_freq ) / denom;
            normalized_result = (normalized_result <= 0.15) ? 0.15 : normalized_result;
            return {
                location_id: to_zone_id,
                frequency: result_data["to"][to_zone_id],
                center_cx: cx2,
                center_cy: cy2,
                center_radius: normalized_result * 10,
                arrow_vel: normalized_result*100 / Math.abs(cx - cx2)
            };
        });

        // Create center circle foreach destination
        svg_path_group.selectAll("circle").data(destinations_data).enter().append("circle")
            .attr("cx", function(d){return d.center_cx;})
            .attr("cy", function(d){return d.center_cy;})
            .attr("r", function(d){
                return d.center_radius;
            })
            .attr("data-toggle", "tooltip")
            .attr("data-placement", "top")
            .attr("title", function(d){return [result_data["to"][d.location_id], "/", total_trips].join(" ");})
            .on("mouseover", handle_line_mouseover)
            .on("mouseleave", handle_line_mouseleave)
            .attr("id", function(d){return ["center_", d.location_id].join("");})
            .attr("class", function(d){ return "path_to_"+d.location_id ; })
            .classed("zone_center_to", true);

        // Create line from the center of the selected zone to the center of each destination.
        svg_path_group.selectAll("line")
            .data(destinations_data)
            .enter()
            .append("line")
            .attr("x1", cx)
            .attr("y1", cy)
            .attr("x2", function (d) { return d.center_cx;})
            .attr("y2", function (d) { return d.center_cy;})
            .attr("id", function(d){return ["path_to_zone_", d.location_id].join("");})
            .attr("class", function(d){ return "path_to_"+d.location_id ; })
            .classed("zone_edge_to", true)
            .on("mouseover", handle_line_mouseover)
            .on("mouseleave", handle_line_mouseleave)
            .attr("stroke-dasharray", function(d){
                let l = get_path_total_length(cx, cy, d.center_cx, d.center_cy);
                return l+" "+l;
            })
            .attr("stroke-dashoffset", function(d){ return get_path_total_length(cx, cy, d.center_cx, d.center_cy)})
            .transition()
            .duration(2000)
            .attr("stroke-dashoffset", 0);

    });
    console.log("Recoloring Map done...");

    update_table(d3.select("#table-container"), computed_data["frequencies"]);
    append_legend(legend_svg, prop_v);
}


function get_center(element) {
    let node_bbox = element.getBBox();
    let n_w = node_bbox["width"];
    let n_h = node_bbox["height"];
    let cx = node_bbox["x"] + n_w / 2;
    let cy = node_bbox["y"] + n_h / 2;
    return [cx, cy];
}

function update_table(table_container, data){
    console.log("Creating table...");

    table_container.select("table").remove();
    let table = table_container.append("table").classed("table", true);
    let t_head = table.append("thead");
    let t_body = table.append("tbody");

    let columns = [
        {label:"LocationID", value:"location_id"},
        {label:"Borough", value:"borough"},
        {label:"Zone", value:"zone"},
        {label:"Frequency", value:"frequency"},
        {label:"Alpha", value:"alpha"},
        {label:"", value:"color"}
    ];

    t_head.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
        .on("click", function(col, index){
            reorder_table(table, col.value);
        })
        .text(function(c){
            return c.label;
        });

    let entries = d3.entries(data).filter(function (d) {
        return excluded_zones.indexOf(parseInt(d.key)) === -1;
    });

    let rows = t_body.selectAll("tr").data(entries).enter().append("tr");

    let cells = rows.selectAll("td").data(function(r){
        return columns.map(function(column){
            return {column: column.value, value: r["value"][column.value]};
        });})
        .enter()
        .append("td").text(function(d){
            return (d.column !== "color") ? d.value: null;
        })
        .style("background-color", function(d){
            return(d.column === "color")? d.value : null;
        });

    console.log("Table creation done...");
    return t_body;
}

function reorder_table(table, property){
    console.log("Sorting data by: ", property);
    let table_body = table.select("tbody");

    let selection_array = table_body.selectAll("tr");
    sorting_asc = !sorting_asc;
    selection_array.sort(function(a, b) {
        let e1 = a["value"][property];
        let e2 = b["value"][property];
        if (!sorting_asc) {
            e2 = a["value"][property];
            e1 = b["value"][property];
        }
        if (property === "location_id" || property === "frequency" || property === "alpha")
            return parseFloat(e1) - parseFloat(e2);
        else
            return e1.localeCompare(e2);
    });

    console.log("Done sorting...");
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

function append_legend(svg, property) {
    console.log("Apppending legend...");

    svg.selectAll("g").remove();

    let c = (property === "pull")
        ? d3.scaleLinear().domain([1, 11]).range(d3.schemeRdYlGn[11])
        : d3.scaleLinear().domain([1, 11]).range(d3.schemeRdYlBu[11]);

    let text = (property === "pull") ? "Pull Location Frequency" : "Drop-off Location Frequency";

    let g = svg.append("g");

    d3.select("#legend_text").text(text);

    g.selectAll("rect")
        .data(c.range())
        .enter()
        .append("rect")
        .attr("fill", function (d) {
            return d;
        })
        .attr("width", "1.5em")
        .attr("height", "1.5em")
        .attr("x", function (d) {
            return ((c.range().indexOf(d)) * 1.5).toString() + "em";
        });

    g.attr("transform", "translate(0,20)");

    console.log("Legend appended...");
}

function form_reset(){
    console.log("Form Resetting...");
    excluded_boroughs = [];
    month.selectAll("option").data(MONTHS).enter().append("option").attr("value", function(d){return d.value;}).text(function(d){return d.label;});
    dow.selectAll("option").data(DOWS).enter().append("option").attr("value", function(d){return d.value;}).text(function(d){return d.label;});
    ts.selectAll("option").data(TS).enter().append("option").attr("value", function(d){return d.value;}).text(function(d){return d.label;});
    prop.selectAll("option").data(PROPERTIES).enter().append("option").attr("value", function(d){return d.value;}).text(function(d){return d.label;});
    borough.selectAll("option").data(BOROUGHS).enter().append("option").attr("value", function(d){return d;}).text(function(d){return d;});

    borough.on("change", function (d) {
        excluded_boroughs = get_selected_boroughs();

        svg.selectAll(".zone").each(function (d) {
            let zone_borough = d.properties.borough;
            let zone_id = d.properties["LocationID"];

            let zone_excluded = excluded_zones.indexOf(zone_id) !== -1;
            let borough_excluded = excluded_boroughs.indexOf(zone_borough) !== -1;

            // se il borough è escluso e la zona non è esclusa > escludi la zona || (!borough_excluded && zone_excluded)
            if( (borough_excluded && !zone_excluded) || (!borough_excluded && zone_excluded) ){
                exclude_zone(legend_svg, d3.select(this), zone_id, excluded_zones);
            }
        });
    });
    console.log("Form Resetting done...");
}

function get_selected_boroughs() {
    return Array.from(borough.node().selectedOptions).map(function(d){return d.value;});
}

function get_dict_values(dictionary){
    return Object.keys(dictionary).map(function(key){ return dictionary[key]; });
}