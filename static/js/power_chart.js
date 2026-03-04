export function power_chart(container_id, {width, dataset}) {

    let dimensions = {
        width: width,
        height: 150,
        margin: {
            top: 5,
            right: 20,
            bottom: 40,
            left: 45,
        },
    }

    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    const container = d3.select(container_id)
    container.selectAll("svg").remove()

    const svg = container.append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    const bounds = svg.append("g")
        .style("transform",
            `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

    const exp = 1;
    const yValue = d => d.smooth_power ** exp;
    const xValue = d => d.elapsed_time / 60;

    const yScale = d3.scaleLinear()
        .domain([0, d3.extent(dataset, yValue)[1]])
        .range([dimensions.boundedHeight, 0])
    // .nice()

    const xScale = d3.scaleLinear()
        .domain(d3.extent(dataset, xValue))
        .range([0, dimensions.boundedWidth])

    // Add axes
    const axisOpacity = 0.5;
    const yAxisGenerator = d3.axisLeft()
        .scale(yScale)
        .tickValues(yScale.domain());
    bounds.append("g")
        .call(yAxisGenerator)
        .attr("opacity", axisOpacity);
    // y-axis label
    svg.append("text")
        .attr("y", 0)
        .attr("x", -dimensions.boundedHeight / 2)
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("opacity", axisOpacity)
        .attr("dominant-baseline", "hanging")
        .attr("text-anchor", "center")
        .attr("dx", "-35px")
        .attr("transform", "rotate(-90)")
        .text("30s Power");

    const xAxisGenerator = d3.axisBottom()
        .scale(xScale)
        .ticks(width > 700 ? 12 : 5)
        .tickFormat(d => d3.timeFormat("%M:%S")(new Date(d * 60 * 1000)))
    bounds.append("g")
        .call(xAxisGenerator)
        .style(
            "transform", `translateY(${dimensions.boundedHeight}px)`
        ).attr("opacity", axisOpacity);

    const thresholdWatts = 244 ** exp;
    const zoneBoundaries = [
        0, 0.55 * thresholdWatts, 0.75 * thresholdWatts, 0.90 * thresholdWatts,
        1.05 * thresholdWatts, 1.20 * thresholdWatts, 1.50 * thresholdWatts,
        yScale.domain()[1]];
    const zoneColors = [
        "#009e80", "#52c704", "#ffcb0e", "#ff7f0e",
        "#dd0447", "#6633cc", "#504861"];

    const zonesGradient = []
    for (let i = 0; i < zoneBoundaries.length - 1; i++) {
        // Add the "lower" boundary for the zone
        zonesGradient.push({
            'offset': `${
                100 - 100 * (yScale(zoneBoundaries[i]) / yScale.range()[0])
            }%`,
            'color': zoneColors[i]
        });
        // Add the "upper" boundary for the zone
        zonesGradient.push({
            'offset': `${
                100 - 100 * (yScale(zoneBoundaries[i + 1]) / yScale.range()[0])
            }%`,
            'color': zoneColors[i]
        });
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
        .attr("offset", (d) => d.offset)
        .attr("stop-color", (d) => d.color);

    const alpha = 0.3
    const areaOutline = d3.area()
        .x(d => xScale(xValue(d)))
        .y0(d => yScale(yScale.domain()[0]))
        .y1(d => yScale(yValue(d)));

    bounds.append("path")
        .attr("d", areaOutline(dataset))
        .attr("fill", "url(#line-gradient)")
        .attr("opacity", alpha);

    const lineGeneratorSmooth = d3.line()
        .x(d => xScale(xValue(d)))
        .y(d => yScale(yValue(d)))

    bounds.append("path")
        .data(dataset)
        .attr("d", lineGeneratorSmooth(dataset))
        .attr("fill", "none")
        .attr("stroke", "url(#line-gradient)")
        .attr("stroke-width", 1.5)


    //  Add interactivity
    const x_tooltip = svg.append("text")
        .attr("x", 0)
        .attr("y", dimensions.boundedHeight + dimensions.margin.top)
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("dominant-baseline", "hanging")
        .attr("text-anchor", "middle")
        .attr("dy", "25px")
        .text("");

    const y_tooltip = svg.append("text")
        .attr("x", dimensions.margin.left)
        .attr("y", dimensions.boundedHeight / 2)
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("dominant-baseline", "hanging")
        .attr("text-anchor", "end")
        .attr("dx", "-10px")
        .text("");

    const verticalLine = bounds.append("line")
        .attr("y1", dimensions.boundedHeight)
        .style("stroke", "black")
        .style("opacity", 0); // Hidden at the start

    const horizontalLine = bounds.append("line")
        .attr("x1", 0)
        .style("stroke", "black")
        .style("opacity", 0); // Hidden at the start

    const bisect = d3.bisector(d => xValue(d)).center;

    function hover(event) {
        const [xMouse, yMouse] = d3.pointer(event); // Get mouse position
        if (
            xMouse >= dimensions.margin.left && xMouse <= dimensions.width - dimensions.margin.right
            && yMouse <= dimensions.height - dimensions.margin.bottom && yMouse >= dimensions.margin.top
        ) {
            const xMouseTime = xScale.invert(xMouse - dimensions.margin.left);
            const i = bisect(dataset, xMouseTime);

            verticalLine
                .transition()
                .duration(20)
                .attr("x1", xScale(xMouseTime))
                .attr("x2", xScale(xMouseTime))
                .attr("y2", yScale(dataset[i].smooth_power))
                .style("opacity", axisOpacity);

            horizontalLine
                .transition()
                .duration(20)
                .attr("x2", xScale(xMouseTime))
                .attr("y1", yScale(dataset[i].smooth_power))
                .attr("y2", yScale(dataset[i].smooth_power))
                .style("opacity", axisOpacity);

            y_tooltip
                .transition()
                .duration(20)
                // .attr("y", yScale(dataset[i].smooth_power))
                .text(dataset[i].smooth_power.toFixed(0))
            x_tooltip
                .transition()
                .duration(20)
                .attr("x", dimensions.margin.left + xScale(xMouseTime))
                .text(d3.timeFormat("%M:%S")(new Date(dataset[i].elapsed_time * 1000)))

        } else {
            verticalLine.style("opacity", 0);
            horizontalLine.style("opacity", 0);
            x_tooltip.style("opacity", 0);
            y_tooltip.style("opacity", 0);
        }
    }

    svg.on("mousemove", hover);
    svg.on("touchmove", hover);
}


export function power_chart_axis(container_id, {width, dataset}) {

    let dimensions = {
        width: width,
        height: 150,
        margin: {
            top: 5,
            right: 0,
            bottom: 40,
            left: 45,
        },
    }

    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    const container = d3.select(container_id)
    container.selectAll("svg").remove()

    const svg = container.append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    const bounds = svg.append("g")
        .style("transform",
            `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

    const exp = 1;
    const yValue = d => d.smooth_power ** exp;
    const xValue = d => d.elapsed_time / 60;

    const yScale = d3.scaleLinear()
        .domain([0, d3.extent(dataset, yValue)[1]])
        .range([dimensions.boundedHeight, 0])
    // .nice()

    const xScale = d3.scaleLinear()
        .domain(d3.extent(dataset, xValue))
        .range([0, dimensions.boundedWidth])

    // Add axes
    const axisOpacity = 0.5;
    const yAxisGenerator = d3.axisLeft()
        .scale(yScale)
        .tickValues(yScale.domain());
    bounds.append("g")
        .call(yAxisGenerator)
        .attr("opacity", axisOpacity);

    // y-axis label
    svg.append("text")
        .attr("y", 0)
        .attr("x", -dimensions.boundedHeight / 2)
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("opacity", axisOpacity)
        .attr("dominant-baseline", "hanging")
        .attr("text-anchor", "center")
        .attr("dx", "-35px")
        .attr("transform", "rotate(-90)")
        .text("30s Power");

    const xAxisGenerator = d3.axisBottom()
        .scale(xScale)
        .ticks(width > 700 ? 12 : 5)
        .tickFormat(d => d3.timeFormat("%M:%S")(new Date(d * 60 * 1000)))
    bounds.append("g")
        .call(xAxisGenerator)
        .style(
            "transform", `translateY(${dimensions.boundedHeight}px)`
        ).attr("opacity", axisOpacity);
}


export function power_chart_area(container_id, {width, dataset}) {

    let dimensions = {
        width: width,
        height: 150,
        margin: {
            top: 5,
            right: 0,
            bottom: 40,
            left: 45,
        },
    }

    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    const container = d3.select(container_id)
    container.selectAll("svg").remove()

    const svg = container.append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    const bounds = svg.append("g")
        .style("transform",
            `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

    const exp = 1;
    const yValue = d => d.smooth_power ** exp;
    const xValue = d => d.elapsed_time / 60;

    const yScale = d3.scaleLinear()
        .domain([0, d3.extent(dataset, yValue)[1]])
        .range([dimensions.boundedHeight, 0])
    // .nice()

    const xScale = d3.scaleLinear()
        .domain(d3.extent(dataset, xValue))
        .range([0, dimensions.boundedWidth])

    // Add axes
    const axisOpacity = 0.5;
    const yAxisGenerator = d3.axisLeft()
        .scale(yScale)
        .tickValues(yScale.domain());
    bounds.append("g")
        .call(yAxisGenerator)
        .attr("opacity", axisOpacity);

    // y-axis label
    svg.append("text")
        .attr("y", 0)
        .attr("x", -dimensions.boundedHeight / 2)
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("opacity", axisOpacity)
        .attr("dominant-baseline", "hanging")
        .attr("text-anchor", "center")
        .attr("dx", "-35px")
        .attr("transform", "rotate(-90)")
        .text("30s Power");

    const xAxisGenerator = d3.axisBottom()
        .scale(xScale)
        .ticks(width > 700 ? 12 : 5)
        .tickFormat(d => d3.timeFormat("%M:%S")(new Date(d * 60 * 1000)))
    bounds.append("g")
        .call(xAxisGenerator)
        .style(
            "transform", `translateY(${dimensions.boundedHeight}px)`
        ).attr("opacity", axisOpacity);


    const thresholdWatts = 244 ** exp;
    const zoneBoundaries = [
        0, 0.55 * thresholdWatts, 0.75 * thresholdWatts, 0.90 * thresholdWatts,
        1.05 * thresholdWatts, 1.20 * thresholdWatts, 1.50 * thresholdWatts,
        yScale.domain()[1]];
    const zoneColors = [
        "#009e80", "#52c704", "#ffcb0e", "#ff7f0e",
        "#dd0447", "#6633cc", "#504861"];

    const zonesGradient = []
    for (let i = 0; i < zoneBoundaries.length - 1; i++) {
        // Add the "lower" boundary for the zone
        zonesGradient.push({
            'offset': `${
                100 - 100 * (yScale(zoneBoundaries[i]) / yScale.range()[0])
            }%`,
            'color': zoneColors[i]
        });
        // Add the "upper" boundary for the zone
        zonesGradient.push({
            'offset': `${
                100 - 100 * (yScale(zoneBoundaries[i + 1]) / yScale.range()[0])
            }%`,
            'color': zoneColors[i]
        });
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
        .attr("offset", (d) => d.offset)
        .attr("stop-color", (d) => d.color);

    const alpha = 0.3
    const areaOutline = d3.area()
        .x(d => xScale(xValue(d)))
        .y0(d => yScale(yScale.domain()[0]))
        .y1(d => yScale(yValue(d)));

    bounds.append("path")
        .attr("d", areaOutline(dataset))
        .attr("fill", "url(#line-gradient)")
        .attr("opacity", alpha);
}

export function power_chart_line(container_id, {width, dataset}) {

    let dimensions = {
        width: width,
        height: 150,
        margin: {
            top: 5,
            right: 0,
            bottom: 40,
            left: 45,
        },
    }

    dimensions.boundedWidth = dimensions.width - dimensions.margin.left - dimensions.margin.right;
    dimensions.boundedHeight = dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

    const container = d3.select(container_id)
    container.selectAll("svg").remove()

    const svg = container.append("svg")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height)

    const bounds = svg.append("g")
        .style("transform",
            `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`)

    const exp = 1;
    const yValue = d => d.smooth_power ** exp;
    const xValue = d => d.elapsed_time / 60;

    const yScale = d3.scaleLinear()
        .domain([0, d3.extent(dataset, yValue)[1]])
        .range([dimensions.boundedHeight, 0])
    // .nice()

    const xScale = d3.scaleLinear()
        .domain(d3.extent(dataset, xValue))
        .range([0, dimensions.boundedWidth])

    // Add axes
    const axisOpacity = 0.5;
    const yAxisGenerator = d3.axisLeft()
        .scale(yScale)
        .tickValues(yScale.domain());
    bounds.append("g")
        .call(yAxisGenerator)
        .attr("opacity", axisOpacity);

    // y-axis label
    svg.append("text")
        .attr("y", 0)
        .attr("x", -dimensions.boundedHeight / 2)
        .attr("font-size", "10px")
        .attr("fill", "black")
        .attr("opacity", axisOpacity)
        .attr("dominant-baseline", "hanging")
        .attr("text-anchor", "center")
        .attr("dx", "-35px")
        .attr("transform", "rotate(-90)")
        .text("30s Power");

    const xAxisGenerator = d3.axisBottom()
        .scale(xScale)
        .ticks(width > 700 ? 12 : 5)
        .tickFormat(d => d3.timeFormat("%M:%S")(new Date(d * 60 * 1000)))
    bounds.append("g")
        .call(xAxisGenerator)
        .style(
            "transform", `translateY(${dimensions.boundedHeight}px)`
        ).attr("opacity", axisOpacity);


    const thresholdWatts = 244 ** exp;
    const zoneBoundaries = [
        0, 0.55 * thresholdWatts, 0.75 * thresholdWatts, 0.90 * thresholdWatts,
        1.05 * thresholdWatts, 1.20 * thresholdWatts, 1.50 * thresholdWatts,
        yScale.domain()[1]];
    const zoneColors = [
        "#009e80", "#52c704", "#ffcb0e", "#ff7f0e",
        "#dd0447", "#6633cc", "#504861"];

    const zonesGradient = []
    for (let i = 0; i < zoneBoundaries.length - 1; i++) {
        // Add the "lower" boundary for the zone
        zonesGradient.push({
            'offset': `${
                100 - 100 * (yScale(zoneBoundaries[i]) / yScale.range()[0])
            }%`,
            'color': zoneColors[i]
        });
        // Add the "upper" boundary for the zone
        zonesGradient.push({
            'offset': `${
                100 - 100 * (yScale(zoneBoundaries[i + 1]) / yScale.range()[0])
            }%`,
            'color': zoneColors[i]
        });
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
        .attr("offset", (d) => d.offset)
        .attr("stop-color", (d) => d.color);

    const alpha = 0.3
    const areaOutline = d3.area()
        .x(d => xScale(xValue(d)))
        .y0(d => yScale(yScale.domain()[0]))
        .y1(d => yScale(yValue(d)));

    bounds.append("path")
        .attr("d", areaOutline(dataset))
        .attr("fill", "url(#line-gradient)")
        .attr("opacity", alpha);

    const lineGeneratorSmooth = d3.line()
        .x(d => xScale(xValue(d)))
        .y(d => yScale(yValue(d)))

    bounds.append("path")
        .data(dataset)
        .attr("d", lineGeneratorSmooth(dataset))
        .attr("fill", "none")
        .attr("stroke", "url(#line-gradient)")
        .attr("stroke-width", 1.5)
}