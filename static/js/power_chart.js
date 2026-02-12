// import d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import {get_data} from "./csv_data.js";

async function powerChart(df) {

    const exp = 2
    const yValue = d => d.power
    const yValueSmooth = d => d.smooth_power**exp
    const xValue = d => d.elapsed_time/60

    let dimensions = {
        width: Math.min(window.innerWidth * 0.9, 1000),
        height: Math.min(window.innerWidth * 0.5, 200),
        margin: {
            top: 15,
            right: 15,
            bottom: 40,
            left: 60,
        },
    }

    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom

    const svg = d3.select("#wrapper")
        .append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    const bounds = svg.append("g")
        .style("transform",
               `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

    const yScale = d3.scaleLinear()
        // .clamp(true)
        .domain(d3.extent(df, yValueSmooth))
        .range([dimensions.boundedHeight, 0])
        // .base(3)
        // .nice()

    const xScale = d3.scaleLinear()
        .domain(d3.extent(df, xValue))
        .range([0, dimensions.boundedWidth])
       // .nice()


    const thresholdWatts=244**exp
    const alpha = 0.5
    const zoneBoundaries = [0, 0.55*thresholdWatts, 0.75*thresholdWatts, 0.90*thresholdWatts, 1.05*thresholdWatts, 1.20*thresholdWatts, 1.50*thresholdWatts, yScale.domain()[1]]
    const zoneColors = ["#3db39f", "#3db33f", "#fcd549", "#fc9c49", "#e34074", "#8963d8", "#797388"]

    const zones = []
    const zonesGradient = []
    for (let i=0; i<zoneBoundaries.length-1; i++){
//        check that data boundary even contains that zone
        if (zoneBoundaries[i] <= yScale.domain()[1]){
            zones.push({
                "y": yScale(zoneBoundaries[i+1]),
                "height": yScale(zoneBoundaries[i])-yScale(zoneBoundaries[i+1]),
                "width": dimensions.boundedWidth,
                "fill": zoneColors[i]
            });
            zonesGradient.push({
                'offset': `${100-100*(yScale(zoneBoundaries[i+1])/yScale(yScale.domain()[0]))}%`,
                'color': zoneColors[i]
            });
        }
    }
    console.log(yScale(256))

    const zonesR = bounds.append('g')
        .attr('mask', 'url(#mask-power)')
        .selectAll('rect')
        .data(zones)
        .join('rect')
            .attr('y', (d) => d.y)
            .attr('height', (d) => d.height)
            .attr('width', (d) => d.width)
            .attr('fill', (d) => d.fill)
            .attr("fill-opacity", alpha)
    const mask = bounds.append('mask')
        .attr('id', 'mask-power')

    mask
      .append('rect')
      .attr('width', dimensions.boundedWidth)
      .attr('height', dimensions.boundedHeight)
      .attr('fill', 'black');


    const areaOutline = d3.area()
        .x(d => xScale(xValue(d)))
        .y0(d => yScale(yScale.domain()[0]))
        .y1(d => yScale(yValueSmooth(d)))

    mask.append("path")
        .attr("d", areaOutline(df))
        .attr('fill', 'white');

    function zoneColor(power){
        for (let i=0; i < zoneBoundaries.length-1; i++){
            if (power > zoneBoundaries[i] && power <= zoneBoundaries[i+1]){
                return zoneColors[i];
            };
        };
    };

    const lineGenerator = d3.line()
        .x(d => xScale(xValue(d)))
        .y(d => yScale(yValue(d)))

    const lineGeneratorSmooth = d3.line()
        .x(d => xScale(xValue(d)))
        .y(d => yScale(yValueSmooth(d)))

   // const line = bounds.append("path")
   //     .attr("d", lineGenerator(df))
   //     .attr("fill", "none")
   //     .attr("stroke", "#c8cbcf")
   //     .attr("stroke-opacity", 0.5)
   //     .attr("stroke-width", 1)

// Set the gradient
    const line_gradient =
   bounds
       .append("linearGradient")
     .attr("id", "line-gradient")
     .attr("gradientUnits", "userSpaceOnUse")
     .attr("x1", 0)
     .attr("y1", yScale(yScale.domain()[0]))
     .attr("x2", 0)
     .attr("y2", yScale(yScale.domain()[1]))
     .selectAll("stop")
       .data(zonesGradient)
     .enter()
       .append("stop")
       .attr("offset", function(d) { return d.offset; })
       .attr("stop-color", function(d) { return d.color; });

    console.log(line_gradient)

    const lineSmooth = bounds.append("path")
        .datum(df)
        .attr("d", lineGeneratorSmooth(df))
        .attr("fill", "none")
        // .attr("stroke",  )
       .attr("stroke", "url(#line-gradient)" )
        .attr("stroke-width", 1)


    const yAxisGenerator = d3.axisLeft()
        .scale(yScale).ticks(10)
    const yAxis = bounds.append("g")
        .call(yAxisGenerator)
        .attr("opacity", 0.5)

    const xAxisGenerator = d3.axisBottom()
        .scale(xScale)

    const xAxis = bounds.append("g")
        .call(xAxisGenerator)
        .style("transform", `translateY(${
            dimensions.boundedHeight
        }px)`).attr("opacity", 0.5)
}
const data_js = get_data();
powerChart(data_js)

