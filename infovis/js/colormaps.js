let svg = d3.select("svg");
let width = +svg.attr("width");
let height = +svg.attr("height");

/* Form fields */
let month = d3.select("#month");
let prop = d3.select("#property");
let dow = d3.select("#dow");
let ts = d3.select("#ts");

Promise.all([d3.json("data/geodata/ny_zones.json")]).then(function (map_data) {

    let excluded_zones = [];

    d3.select("#month").attr("value", "-1");
    d3.select("#dow").attr("value", "-1");
    d3.select("#ts").attr("value", "-1");
    d3.select("#property").attr("value", "pull");

    Promise.all([d3.tsv("data/month_dow_ts_puloc_doloc.csv")]).then(function(dataset_data){

        plot_map(svg, map_data[0], function(){return "black";} );

        recolor_map(svg, dataset_data[0], excluded_zones);

        svg.selectAll(".zone").on("click", function(n){
            console.log("Updating Excluded zones: ", excluded_zones);
            let zone_location_id = n.properties["LocationID"];
            excluded_zones = exclude_zone(zone_location_id, excluded_zones);
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
    console.log("Done...");
};

function exclude_zone(zone_to_exclude, excluded_zones){
    let zone_to_exclude_index = excluded_zones.indexOf(zone_to_exclude);
    if(zone_to_exclude_index === -1){ //the zone should be added to the list

        excluded_zones.push(zone_to_exclude);
    }
    else{
        excluded_zones.splice(zone_to_exclude_index, 1);
    }
    return excluded_zones;
}
