// import d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import {get_data} from "./csv_data.js";

async function powerChart(container_id, { width, height, dataset }) {

    const exp = 1;
    const yValueSmooth = d => d.smooth_power**exp;
    const xValue = d => d.elapsed_time/60;

    let dimensions = {
        width: width,
        height: height,
        margin: {
            top: 15,
            right: 15,
            bottom: 40,
            left: 60,
        },
    }

    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    const svg = d3.select(container_id)
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
    const line_gradient = bounds
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

    const lineSmooth = bounds.append("path")
        .datum(dataset)
        .attr("d", lineGeneratorSmooth(dataset))
        .attr("fill", "none")
        .attr("stroke", "url(#line-gradient)" )
        .attr("stroke-width", 1.5)


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





    // Create the tooltip container.
    // const tooltip = bounds.append("g")
    //     .attr("class", "y-tooltip")
    //     .style("transform",
    //            `translate(${dimensions.margin.left}px, ${dimensions.height/2}px)`)
    const y_tooltip = svg.append("text")
        .attr("id", "y-tooltip")
        .attr("x", dimensions.margin.left/2) // Set the x position
        .attr("y", dimensions.height/2 - dimensions.margin.top) // Set the y position
        .attr("font-size", "10px") // Optional: set font size
        .attr("fill", "teal") // Optional: set text color
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "right") // For horizontal centering
            .text(""); // Set the text content


    const verticalLine = svg.append("line")
        .attr("class", "mouse-line")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("opacity", 0); // Hidden by default

    const horizontalLine = svg.append("line")
        .attr("class", "mouse-line")
        .style("stroke", "black")
        .style("stroke-width", "1px")
        .style("opacity", 0); // Hidden by default

    svg.on("mousemove", function(event) {
        const [xMouse, yMouse] = d3.pointer(event); // Get mouse X position
        if (
            xMouse >= dimensions.margin.left && xMouse <= dimensions.width - dimensions.margin.right
            && yMouse <= dimensions.height - dimensions.margin.bottom && yMouse >= dimensions.margin.top
        ) {
            const i = bisect(dataset, xScale.invert(xMouse - dimensions.margin.left));
            const yMousePower = yScale(dataset[i].smooth_power)
            verticalLine
                .attr("x1", xMouse)
                .attr("y1", dimensions.margin.top)
                .attr("x2", xMouse)
                .attr("y2", dimensions.height - dimensions.margin.bottom)
                .style("opacity", axisOpacity); // Show line
            horizontalLine
                .attr("y1", yMousePower)
                .attr("x1", dimensions.margin.left)
                .attr("y2", yMousePower)
                .attr("x2", dimensions.width - dimensions.margin.right)
                .style("opacity", axisOpacity); // Show line

            y_tooltip.text(dataset[i].smooth_power.toFixed(0))
            // console.log(dataset[i].smooth_power)
            // console.log( xScale.invert(xMouse - dimensions.margin.left))

            tooltip
                .style("display", "inline")

        } else {
            verticalLine.style("opacity", 0)
            horizontalLine.style("opacity", 0)
        }
    });

     // Add the event listeners that show or hide the tooltip.
      const bisect = d3.bisector(d => xValue(d)).center;
      function pointermoved(event) {
        const i = bisect(dataset, xScale.invert(d3.pointer(event)[0]));
        // console.log(xScale(dataset[i].elapsed_time))
        tooltip.style("display", "block");
        // tooltip.attr("transform", `translate(${xScale(dataset[i].elapsed_time)},${yScale(dataset[i].smooth_power)})`);

        const path = tooltip.selectAll("path")
          .data([,])
          .join("path")
            .attr("fill", "white")
            .attr("stroke", "black");

        const text = tooltip.selectAll("text")
          .data([,])
          .join("text")
          .call(text => text
            .selectAll("tspan")
            .data([dataset[i].elapsed_time, dataset[i].smooth_power])
            .join("tspan")
              .attr("x", 100)
              .attr("y", 100)
              .attr("font-weight", "bold")
              .text(d => d));

        // size(text, path);
      }

      function pointerleft() {
        tooltip.style("display", "none");
      }

      // Wraps the text with a callout path of the correct size, as measured in the page.
      // function size(text, path) {
      //   const {x, y, width: w, height: h} = text.node().getBBox();
      //   console.log(text.node().getBBox())
      //   text.attr("transform", `translate(${-w / 2},${15 - y})`);
      //   path.attr("d", `M${-w / 2 - 10},5H-5l5,-5l5,5H${w / 2 + 10}v${h + 20}h-${w + 20}z`);
      // }
}
const data_js = get_data();
powerChart("#wrapper", {width: 1000, height: 150, dataset: data_js})

