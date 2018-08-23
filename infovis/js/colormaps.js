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

Promise.all([d3.json("data/geodata/ny_zones.json")]).then(function (map_data) {

    Promise.all([d3.tsv("data/month_dow_ts_puloc_doloc.csv")]).then(function(dataset_data){

        let zones_info = {};
        map_data[0]["objects"]["ny_zones"]["geometries"].forEach(function(el){
            let zi = el["properties"];
            zones_info[zi["LocationID"].toString()] = {
                "location_id": zi["LocationID"].toString(),
                "zone": zi["zone"],
                "borough": zi["borough"]
            };
        });

        plot_map(svg, map_data[0], function(){return "black";});    // plot the map
        update_info(svg, zones_info, dataset_data[0], excluded_zones);      // colorize the map
        svg.selectAll(".zone").on("click", function(n){ // Exclude zone on click
            console.log("Updating Excluded zones: ", excluded_zones);
            let zone_location_id = n.properties["LocationID"];
            exclude_zone(legend_svg, d3.select(this), zone_location_id, excluded_zones);
            console.log("Excluded zones updating done: ", excluded_zones);
        });

        d3.select("#form_submit").on("click", function(){ // recolor map according to the submitted input.
            update_info(svg, zones_info, dataset_data[0], excluded_zones);
        });

    });
});

function update_info(svg, zones_info, dataset_data, excluded_zones){
    let month_v = month.node().value;
    let prop_v = prop.node().value;
    let dow_v = dow.node().value;
    let ts_v = ts.node().value;
    excluded_boroughs = get_selected_boroughs();

    let computed_data = compute_data(zones_info, dataset_data, month_v, dow_v, ts_v, prop_v, excluded_zones);

    console.log("Recoloring Map...");
    svg.selectAll(".zone").attr("fill", function(node){
        let location_id = node["properties"]["LocationID"];
        return computed_data["frequencies"][location_id]["color"];
    }).attr("frequency", function(node){
        let location_id = node["properties"]["LocationID"];
        return computed_data["frequencies"][location_id]["frequency"];
    }).attr("alpha", function(node){
        let location_id = node["properties"]["LocationID"];
        return computed_data["frequencies"][location_id]["alpha"];
    }).attr("prev_fill", null);
    console.log("Recoloring Map done...");

    update_table(d3.select("#table-container"), computed_data["frequencies"]);
    append_legend(legend_svg, prop_v);
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