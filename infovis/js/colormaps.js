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

        plot_map(svg, map_data[0], function(){return "black";} );    // plot the map

        recolor_map(svg, dataset_data[0], excluded_zones);      // colorize the map
        svg.selectAll(".zone").on("click", function(n){ // Exclude zone on click
            console.log("Updating Excluded zones: ", excluded_zones);
            let zone_location_id = n.properties["LocationID"];
            exclude_zone(zone_location_id, excluded_zones);
            console.log("Excluded zones updating done: ", excluded_zones);
        });

        d3.select("#form_submit").on("click", function(){ // recolor map according to the submitted input.
            recolor_map(svg, dataset_data[0], excluded_zones);
        });

    });
});

function recolor_map(svg, dataset_data, excluded_zones){
    let month_v = month.node().value;
    let prop_v = prop.node().value;
    let dow_v = dow.node().value;
    let ts_v = ts.node().value;
    console.log("Submitted values:", month_v, dow_v, ts_v, prop_v, excluded_zones);
    colorize_map(svg, dataset_data, month_v, dow_v, ts_v, prop_v, excluded_zones);
    append_legend(legend_svg, prop_v);
    console.log("Done...");
};

function exclude_zone(zone_to_exclude, excluded_zones){
    let zone_to_exclude_index = excluded_zones.indexOf(zone_to_exclude);
    if(zone_to_exclude_index === -1){ //the zone should be added to the list
        //todo recolor
        excluded_zones.push(zone_to_exclude);
    }
    else{
        //todo fill black!
        excluded_zones.splice(zone_to_exclude_index, 1);
    }
}

function append_legend(svg, property){
    console.log("Apppending legend...");

    let c = (property === "pull")
        ? d3.scaleLinear().domain([1, 11]).range(d3.schemeRdYlGn[11])
        : d3.scaleLinear().domain([1, 11]).range(d3.schemeRdYlBu[11]);

    let text = (property === "pull")
        ? "Pull Location Frequency"
        : "Drop-off Location Frequency";

    svg.selectAll("g").remove();
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

    g.attr("transform", "translate(0,100)");

    console.log("Legend appended...");
}
