# Information Visualization - Final Project

Final project for [Information Visualization](http://www.dia.uniroma3.it/~infovis/) course held at the "Roma Tre" University of Rome by professor [Maurizio Patrignani](http://www.dia.uniroma3.it/~compunet/www/view/person.php?id=titto).

## Authors

- Andrea De Angelis - [and.deangelis@hotmail.com](mailto:and.deangelis@hotmail.com),
- Antonio Matinata - [a.matinata@gmail.com](mailto:a.matinata@gmail.com), [ant.matinata@stud.uniroma3.it](ant.matinata@stud.uniroma3.it)
- Maurizio Mazzei - [mau.mazzei@stud.uniroma3.it](mailto:mau.mazzei@st ud.uniroma3.it) 

## Goal of The Project
 
The goal of the project was the exploration and visualization of the taxi trips in the state of New York.

## Repository Organization

```/bin/bash
├── infovis   # project main directory
│   │  
│   ├── about_us.html 
│   ├── colormaps.html
│   ├── index.html 
│   ├── dataset_explanation.html
│   │ 
│   ├── css # all custom css are in this folder.
│   │
│   ├── data  # all data used for the project is in this folder
│   │   ├── geodata  # geographical information of the ny zones
│   │   │   └── ny_zones.json
│   │   │ 
│   │   └── month_dow_ts_puloc_doloc.csv  # Trip's data
│   │ 
│   ├── img # this folders contains all the images used for the views.
│   │ 
│   ├── js # Javascript files used in the views
│   │   ├── colormaps.js
│   │   ├── colormaps_utils.js
│   │   └── dataset_explanation.js
│   │ 
│   └── vendor # additional libraries used for the project
│       ├── bmd  
│       ├── d3 
│       ├── jquery
│       ├── popperjs
│       └── raleway
│ 
└── readme.md
```

### Dependencies

Under the folder `infovis/vendor` are stored all the libraries used for the project:

- [Bootstrap Material Design - v4](https://fezvrasta.github.io/bootstrap-material-design/): this framework was used for styling the pages (`infovis/vendor/bmd`).
- [D3js - v4](https://d3js.org/) : the core library of the project (`infovis/vendor/d3`).
- [Jquery - v3.3.1](https://jquery.com/) : the core library of the project (`infovis/vendor/jquery`).
- [popperjs - v1.12.6](https://popper.js.org/) : support library for Bootstrap Material Design (`infovis/vendor/popperjs`).
- [Raleway Fonts](https://fonts.google.com/specimen/Raleway) : the font used (`infovis/vendor/raleway`).

## Dataset

The original dataset was provided by NYC TLC and is available for download at the following url: [http://www.nyc.gov/html/tlc/html/about/trip_record_data.shtml](http://www.nyc.gov/html/tlc/html/about/trip_record_data.shtml).

The data is organized on a monthly baseline, and, for our pourpose, only the following fields were relevant:

- `tpep_pickup_datetime`: The date and time when the meter was engaged. From this date we have extracted the Time slot for the ride but also the day of the week of the ride.
- `PULocationID`: TLC Taxi Zone in which the taximeter was engaged.
- `DOLocationID`: TLC Taxi Zone in which the taximeter was disengaged.

The data from 2016/06 until 2017/12 was used as input to a spark job in order to produce a concise report for each PULocationID - DOLocationID couple.
The output is the file `month_dow_ts_puloc_doloc.csv` that is structured as follow:

- `Month` (int): the month when the meter was engaged (range 1-12)	
- `DayOfWeek` (int): the day of week when the meter was engaged (range 0-6, were 0 is Monday) 
- `TimeSlot` (string): the timeslot when the meter was engaged.
	- `TS1`: 06.00 - 09.00 
	- `TS2`: 09.00 - 12.00
	- `TS3`: 12.00 - 17.00
	- `TS4`: 17.00 - 20.00
	- `TS5`: 20.00 - 24.00
	- `TS6`: 24.00 - 06.00
- `PULocationID` (int): TLC Taxi Zone in which the taximeter was engaged.
- `DOLocationID` (int): TLC Taxi Zone in which the taximeter was dismissed.
- `Frequency` (int) : the frequency of the combination `Month - DayOfWeek - TimeSlot - PULocationID - DOLocationID`

The information linked to the PULocationID/DOLocationID, in other words the zones of the map, are available the following address [http://www.nyc.gov/html/exit-page.html?url=https://s3.amazonaws.com/nyc-tlc/misc/taxi_zones.zip](http://www.nyc.gov/html/exit-page.html?url=https://s3.amazonaws.com/nyc-tlc/misc/taxi_zones.zip).
The files in the folder were converted with [qGis](https://www.qgis.org/it/site/) in a single `json` file (`infovis/data/geodata/geony_zones.json`) with a format understandable by the library d3js.

From this file the following information were available:

- `LocationID`: the ID of the zone (the same id that appear as PULocationID/DOLocationID. 
- `Borough` : the name of the zone's borough (ERW, Manhattan, Bronx, Queens, Staten Island, Brooklyn).
- `Zone`: zone name.
- `objects/ny_zones/geometries`: points used in order to plot the zone.  

# Pages

This web application has 3 main views: `projects`, `visualizations` and `about us`.
 
## Project

The "project" page is used as landing page and displays the map of New York: each borough is identified by an unique color.

Hovering a zone will display the following information: 

- LocationID
- Zone name
- Borough
 
## Visualizations

The main page of the web application is `visualizations`.

Querying the available data is possible through a form whose submission allows to reorganize the graphs.

### Color Map

The first part of the page shows a map of New York with all the zones.

The color map allows to understand, based on the selected filters, the areas where there are more departures or arrivals of taxis.

On the map are available also the following actions:

- Hover a zone: hovering a zone with the mouse will display on the left side of the page the following additional informations: 
	- location id
	- zone name
	- zone borough
	- frequency: the frequency of trips that start or end in that zone 
	- in-zone trips: the number of trips that start and end in the selected zone
	- alpha: the percentage of trips that start or end in that zone

- Left-Click on a zone: by clicking on a zone it is possible to exclude it from the next computation. It's possible to exclude multiple zones at the same time but if you want to exclude entire boroughs it is recommended to use the multi-select in the form. It's necessary a form re-submission in order to update the visualizations.

- Right-Click on a zone: the trips that start from that zone will be displayed. This actions will show on the map different edges from the selected zone to the center of each destination. At the middle of each zone is displayed a circle with a size proportional to the number of trips that ends in it. A left-click on the yellow circle of the selected zone will make the edges disappear. In order to show the trips that ends in the selected zone change the value of the select from "Pull location" to "Drop-off location", and perform a right-click on the zone of interest (it's not necessary to re-submit the form).

### Results table

It's also possible to see all the information of the computation in a result table.
Clicking on the panel "Results table" will show a table with the following information: location id, borough zone, frequency, alpha. 

Clicking on a column header will reorder the data according to the selected property.

### Chord Graph

In order to understand the flows between the different boroughs it is possible to visualize a Chord graph clicking on the panel "Chord Graph".

Hovering an arc will show the amount of trips (and percentage) between the 2 boroughs.

Initially the graph is loaded without the information regarding the trips that starts and ends in the same borough.
In order to display a chord graph that takes in account also this kind of trips click on the button "Toggle in-zone trips".
 
## About Us

The `about us` page shows information about the member of the team. 
