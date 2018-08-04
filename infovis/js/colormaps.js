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
    // Month	DayOfWeek	TimeSlot	PULocationID	DOLocationID	Frequency

    Promise.all([d3.tsv("data/month_dow_ts_puloc_doloc.csv")]).then(function (data) {

        data = data[0];

        let result = [];
        let max = 0;

        console.log("Computing data...");
        data.forEach(function(trip){

            if(month === "-1")
                delete trip["Month"];
            else if (month !== trip["Month"].toString())
                return;
            if(dow === "-1")
                delete trip["DayOfWeek"];
            else if (dow !== trip["DayOfWeek"].toString())
                return;
            if(ts === "-1")
                delete trip["TimeSlot"];
            else if (ts !== trip["TimeSlot"].toString())
                return;

            let current_id = (prop === "pull") ? trip["DOLocationID"] : trip["PULocationID"] ;

            if (result[current_id] == null || result[current_id] === undefined)
                result[current_id] = 0;

            result[current_id] += parseInt(trip["Frequency"]);

            if(result[current_id] > max)
                max = parseInt(result[current_id]);
        });

        console.log("Recoloring...")
        svg.selectAll(".zone").attr("fill", function(node, index, nodes){
            let location_id = node["properties"]["LocationID"];
            return d3.interpolateViridis(result[location_id]/max);
        });
        console.log("Done.");
    });
});