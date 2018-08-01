let svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

Promise.all([d3.json("data/geodata/ny_zones.json")]).then(function (data) {
    plot_map(svg, data);
});

d3.select("#form_submit").on("click", function(){
    let month = d3.select("#month").node().value;
    let prop = d3.select("#property").node().value;
    let dow = d3.select("#dow").node().value;
    let ts = d3.select("#ts").node().value;

    console.log("Submitted values:", month, dow, ts, prop);
    Promise.all([d3.tsv("data/month_dow_ts_puloc_doloc.csv")]).then(function (data) {
        data = data[0];
        console.log("Data loaded");
    });
});