// import d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import {get_data} from "./csv_data.js";

async function powerChart(container_id, {width, dataset} ) {

    const exp = 1;
    const yValueSmooth = d => d.smooth_power**exp;
    const xValue = d => d.elapsed_time/60;

    let dimensions = {
        width: width,
        height: 150,
        margin: {
            top: 5,
            right: 0,
            bottom: 40,
            left: 40,
        },
    }

    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    const container = d3.select(container_id)
    container.selectAll("svg").remove()

    const svg = container
        .append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    const bounds = svg.append("g")
        .style("transform",
               `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

    const yScale = d3.scaleLinear()
        .domain([0, d3.extent(dataset, yValueSmooth)[1]])
        .range([dimensions.boundedHeight, 0])
        // .nice()

    const xScale = d3.scaleLinear()
        .domain(d3.extent(dataset, xValue))
        .range([0, dimensions.boundedWidth])


    const thresholdWatts=244**exp
    const alpha = 0.3
    const zoneBoundaries = [0, 0.55*thresholdWatts, 0.75*thresholdWatts, 0.90*thresholdWatts, 1.05*thresholdWatts, 1.20*thresholdWatts, 1.50*thresholdWatts, yScale.domain()[1]]
    const zoneBoundaries2 = [
        0,
        0.55*thresholdWatts,
        0.55*thresholdWatts,
        0.75*thresholdWatts,
        0.75*thresholdWatts,
        0.90*thresholdWatts,
        0.90*thresholdWatts,
        1.05*thresholdWatts,
        1.05*thresholdWatts,
        1.20*thresholdWatts,
        1.20*thresholdWatts,
        1.50*thresholdWatts,
        1.50*thresholdWatts,
        1.70*thresholdWatts,
        yScale.domain()[1]
    ]

    const zoneColors = ["#3db39f", "#3db33f", "#fcd549", "#fc9c49", "#e34074", "#8963d8", "#797388"]
    const zoneColors2 = [
        "#3db39f",
        "#3db39f",
        "#3db33f",
        "#3db33f",
        "#fcd549",
        "#fcd549",
        "#fc9c49",
        "#fc9c49",
        "#e34074",
        "#e34074",
        "#8963d8",
        "#8963d8",
        "#797388",
        "#797388"]

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
        }
    }
        for (let i=0; i<zoneBoundaries2.length; i++){
//        check that data boundary even contains that zone
        if (zoneBoundaries2[i] <= yScale.domain()[1]){
            zonesGradient.push({
                'offset': `${100-100*(yScale(zoneBoundaries2[i])/yScale(yScale.domain()[0]))}%`,
                'color': zoneColors2[i]
            });
        }
    }

    // Set the gradient
    bounds.append("linearGradient")
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

    const areaOutline = d3.area()
        .x(d => xScale(xValue(d)))
        .y0(d => yScale(yScale.domain()[0]))
        .y1(d => yScale(yValueSmooth(d)));

    bounds.append("path")
        .attr("d", areaOutline(dataset))
        .attr("fill", "url(#line-gradient)")
        .attr("opacity", alpha);

    const lineGeneratorSmooth = d3.line()
        .x(d => xScale(xValue(d)))
        .y(d => yScale(yValueSmooth(d)))

    bounds.append("path")
        .data(dataset)
        .attr("d", lineGeneratorSmooth(dataset))
        .attr("fill", "none")
        .attr("stroke", "url(#line-gradient)" )
        .attr("stroke-width", 1.5)

    // Add axes
    const axisOpacity = 0.5;
    const yAxisGenerator = d3.axisLeft()
        .scale(yScale)
        .tickValues(yScale.domain());

    bounds.append("g")
        .call(yAxisGenerator)
        .attr("opacity", axisOpacity);

    const xAxisGenerator = d3.axisBottom()
        .scale(xScale);
    bounds.append("g")
        .call(xAxisGenerator)
        .style("transform", `translateY(${
            dimensions.boundedHeight
        }px)`).attr("opacity", axisOpacity);


    //  Add interactivity
    const y_tooltip = svg.append("text")
        .attr("id", "y-tooltip")
        .attr("x", dimensions.margin.left/2)
        .attr("y", dimensions.height/2 - dimensions.margin.top)
        .attr("font-size", "10px")
        .attr("fill", "teal")
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "right")
        .text("");

    const verticalLine = bounds.append("line")
        .attr("class", "mouse-line")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("opacity", 0); // Hidden at the start

    const horizontalLine = bounds.append("line")
        .attr("class", "mouse-line")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("opacity", 0); // Hidden at the start

    const bisect = d3.bisector(d => xValue(d)).center;

    svg.on("mousemove", function(event) {
        const [xMouse, yMouse] = d3.pointer(event); // Get mouse position
        if (
            xMouse >= dimensions.margin.left && xMouse <= dimensions.width - dimensions.margin.right
            && yMouse <= dimensions.height - dimensions.margin.bottom && yMouse >= dimensions.margin.top
        ) {
            const xMouseTime = xScale.invert(xMouse - dimensions.margin.left);
            const i = bisect(dataset, xMouseTime);

            verticalLine
                .transition()
                .duration(60)
                .attr("x1", xScale(xMouseTime))
                .attr("y1", dimensions.height - dimensions.margin.bottom)
                .attr("x2", xScale(xMouseTime))
                .attr("y2", dimensions.margin.top)
                .style("opacity", axisOpacity);

            horizontalLine
                .transition()
                .duration(60)
                .attr("y1", yScale(dataset[i].smooth_power))
                .attr("x1", 0)
                .attr("y2", yScale(dataset[i].smooth_power))
                .attr("x2", dimensions.width)
                .style("opacity", axisOpacity);

            y_tooltip.text(dataset[i].smooth_power.toFixed(0))

        } else {
            verticalLine.style("opacity", 0)
            horizontalLine.style("opacity", 0)
        }
    });


}

async function chartResize(){

    const data_js = get_data();
    var chartDiv = document.getElementById("wrapper");
    var width = chartDiv.clientWidth;
    console.log(width)
    await powerChart("#wrapper",  {"width": width, dataset: data_js})
}

await chartResize();

window.addEventListener('resize', chartResize );

