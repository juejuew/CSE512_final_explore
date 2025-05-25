const verticalProfileSvg = d3.select("#vertical-profile");
const timeSeriesSvg = d3.select("#time-series");
const heatmapSvg = d3.select("#heatmap");

const width = 450, height = 300;
const margin = {top: 30, right: 30, bottom: 50, left: 60};
const sciFormat = d3.format("~e");

let minDepth = 0;
let maxDepth = Infinity;
let depthValues = []; // Will store all depth values

let currentTracer = "Bering";
let currentTime = 0;

let verticalProfileData = null;
let timeSeriesData = null;
let heatmapData = null;

const colorbarWidth = 20;
const colorbarHeight = height - margin.top - margin.bottom;
const colorbarX = width - margin.right + 10;
const colorbarY = margin.top;
const linearGradientId = "linear-gradient";

// Tooltip functions
function showTooltip(event, content) {
  const tooltip = d3.select("#tooltip");
  tooltip
    .html(content)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY + 10) + "px")
    .style("opacity", 1);
}

function hideTooltip() {
  d3.select("#tooltip").style("opacity", 0);
}

// In the drawColorbar function:
function drawColorbar(colorScale) {
  heatmapSvg.select("defs").remove();
  const defs = heatmapSvg.append("defs");
  heatmapSvg.selectAll(".colorbar-rect, .colorbar-axis, .colorbar-label").remove();

  // Get the domain
  const [min, max] = colorScale.domain();

  // Create gradient with proper coordinates
  const linearGradient = defs.append("linearGradient")
    .attr("id", linearGradientId)
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", colorbarX)
    .attr("y1", colorbarY + colorbarHeight)
    .attr("x2", colorbarX)
    .attr("y2", colorbarY);

  const nStops = 20;
  for (let i = 0; i <= nStops; i++) {
    const t = i / nStops;
    const value = min + t * (max - min);
    linearGradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(value));
  }

  // Add axis
  const colorbarScale = d3.scaleLinear()
    .domain([max, min])  // Reversed for proper orientation
    .range([colorbarY, colorbarY + colorbarHeight]);

  heatmapSvg.append("g")
    .attr("class", "colorbar-axis")
    .attr("transform", `translate(${colorbarX + colorbarWidth}, 0)`)
    .call(d3.axisRight(colorbarScale).ticks(5).tickFormat(sciFormat));

  heatmapSvg.append("rect")
    .attr("class", "colorbar-rect")
    .attr("x", colorbarX)
    .attr("y", colorbarY)
    .attr("width", colorbarWidth)
    .attr("height", colorbarHeight)
    .style("fill", `url(#${linearGradientId})`)
    .attr("stroke", "#000")
    .attr("stroke-width", 1);

heatmapSvg.append("text")
    .attr("class", "colorbar-label")
    .attr("transform", `translate(${colorbarX + colorbarWidth + 60}, ${colorbarY + colorbarHeight/2}) rotate(-90)`)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "black")
    .text("Tracer Fraction");
}

function loadData(tracer) {
  Promise.all([
    d3.json(`/d3_data/${tracer}_vertical_profile.json`),
    d3.json(`/d3_data/${tracer}_time_series.json`),
    d3.json(`/d3_data/${tracer}_heatmap.json`)
  ]).then(([profile, timeseries, heatmap]) => {
    depthValues = profile[0].depth;
     d3.select("#max-depth")
      .attr("max", d3.max(depthValues))
      .attr("value", d3.max(depthValues));
    maxDepth = d3.max(depthValues);

    console.log("Profile data sample:", profile?.[0]);
    console.log("Time series data sample:", timeseries?.[0]);
    console.log("Heatmap data sample:", heatmap?.[0]?.slice(0,5)); // first 5 cols of first row

    verticalProfileData = profile;
    timeSeriesData = timeseries;
    heatmapData = heatmap;

    updatePlots();
  }).catch(e => console.error("Error loading data:", e));
}

function updatePlots() {
  if (!verticalProfileData || !timeSeriesData || !heatmapData) return;

  // Vertical Profile for currentTime
  const profile = verticalProfileData.find(d => d.time_idx === currentTime);
  if (!profile) return;

  depthValues = verticalProfileData?.[0]?.depth; // assume depth is constant across time
if (!depthValues || depthValues.length !== heatmapData.length) {
  console.warn("Depth info unavailable or mismatched with heatmap data");
  return;
}

  verticalProfileSvg.selectAll("*").remove();

  const xScaleProf = d3.scaleLinear()
  .domain(d3.extent(profile.tracerFrac.filter(d => d !== null)))
  .range([margin.left, width - margin.right]);

  const yScaleProf = d3.scaleLinear()
  .domain([minDepth, maxDepth])
  .range([margin.top, height - margin.bottom]);

  // Y axis reversed (depth increasing downward)
  verticalProfileSvg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScaleProf).ticks(6));

  verticalProfileSvg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScaleProf).tickFormat(sciFormat));

  verticalProfileSvg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .text(`Vertical Profile at Time Index ${currentTime}`);

  // Line generator
  const line = d3.line()
  .x((d, i) => profile.tracerFrac[i] === null ? 0 : xScaleProf(profile.tracerFrac[i]))
  .y((d, i) => profile.depth[i] === null ? 0 : yScaleProf(profile.depth[i]))
  .defined((d, i) => profile.tracerFrac[i] !== null && profile.depth[i] !== null &&
    profile.depth[i] >= minDepth &&
    profile.depth[i] <= maxDepth);

  verticalProfileSvg.append("path")
    .datum(profile.tracerFrac)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

    verticalProfileSvg.selectAll("circle")
  .data(profile.tracerFrac.map((frac, i) => ({
    tracer: frac,
    depth: profile.depth[i]
  })).filter(d =>
    d.tracer !== null &&
    d.depth !== null &&
    d.depth >= minDepth &&
    d.depth <= maxDepth))
  .enter()
  .append("circle")
  .attr("cx", d => xScaleProf(d.tracer))
  .attr("cy", d => yScaleProf(d.depth))
  .attr("r", 2)
  .attr("fill", "steelblue")
  .on("mouseover", function(event, d) {
    showTooltip(event,
      `Depth: ${d.depth.toFixed(2)} m<br>
      Tracer Fraction: ${d.tracer.toExponential(2)}`
    );
  })
  .on("mouseout", hideTooltip);

  timeSeriesSvg.selectAll("*").remove();

const filteredTimeSeries = timeSeriesData.map((d, i) => {
  let sum = 0;
  let count = 0;

  verticalProfileData.forEach(profile => {
    const depth = profile.depth[i];
    if (depth >= minDepth && depth <= maxDepth) {
      sum += profile.tracerFrac[i] || 0;
      count++;
    }
  });

  return {
    time: d.time,
    tracerSum: count > 0 ? sum : 0
  };
});

const xScaleTS = d3.scaleLinear()
  .domain(d3.extent(filteredTimeSeries, d => d.time))
  .range([margin.left, width - margin.right]);

const yScaleTS = d3.scaleLinear()
  .domain([0, d3.max(filteredTimeSeries, d => d.tracerSum)])
  .range([height - margin.bottom, margin.top]);

// Line for time series
  const lineTS = d3.line()
    .x(d => xScaleTS(d.time))
    .y(d => yScaleTS(d.tracerSum));

timeSeriesSvg.append("path")
  .datum(filteredTimeSeries)
  .attr("fill", "none")
  .attr("stroke", "tomato")
  .attr("stroke-width", 2)
  .attr("d", lineTS);

 timeSeriesSvg.append("rect")
  .attr("class", "hover-rect")
  .attr("x", margin.left)
  .attr("y", margin.top)
  .attr("width", width - margin.left - margin.right)
  .attr("height", height - margin.top - margin.bottom)
  .style("fill", "none")
  .style("pointer-events", "all")
  .on("mousemove", function(event) {
    const [x] = d3.pointer(event);
    const xValue = xScaleTS.invert(x);
    const bisect = d3.bisector(d => d.time).left;
    const i = bisect(filteredTimeSeries, xValue);

    if (i >= 0 && i < filteredTimeSeries.length) {
      showTooltip(event,
        `Time: ${filteredTimeSeries[i].time.toFixed(2)}<br>
        Tracer Sum: ${filteredTimeSeries[i].tracerSum.toExponential(2)}`
      );
    }
  })
  .on("mouseout", hideTooltip);

const marker = timeSeriesSvg.append("circle")
  .attr("r", 2)
  .attr("fill", "blue")
  .style("opacity", 0);

timeSeriesSvg.select(".hover-rect")
  .on("mousemove", function(event) {
    const [x] = d3.pointer(event);
    const xValue = xScaleTS.invert(x);
    const bisect = d3.bisector(d => d.time).left;
    const i = bisect(filteredTimeSeries, xValue);
    const d = filteredTimeSeries[i];

    marker
      .attr("cx", xScaleTS(d.time))
      .attr("cy", yScaleTS(d.tracerSum))
      .style("opacity", 1);

    showTooltip(event,
      `Time: ${d.time.toFixed(2)}<br>
      Tracer Sum: ${d.tracerSum.toExponential(2)}`
    );
  })
  .on("mouseout", function() {
    hideTooltip();
    marker.style("opacity", 0);
  });


  timeSeriesSvg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScaleTS));

  timeSeriesSvg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScaleTS).tickFormat(sciFormat));

  timeSeriesSvg.append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .text("Depth-Integrated Tracer Time Series");

verticalProfileSvg.append("text")
  .attr("x", width / 2)
  .attr("y", height - 10)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text("Tracer Fraction");

verticalProfileSvg.append("text")
  .attr("transform", `translate(15, ${height / 2}) rotate(-90)`)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text("Depth");

timeSeriesSvg.append("text")
  .attr("x", width / 2)
  .attr("y", height - 10)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text("Time");

timeSeriesSvg.append("text")
  .attr("transform", `translate(15, ${height / 2}) rotate(-90)`)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text("Tracer Sum");

  heatmapSvg.selectAll("*").remove();

  const nDepth = heatmapData.length;
  const nTime = heatmapData[0].length;

  const xScaleHeat = d3.scaleLinear()
    .domain([0, nTime - 1])
    .range([margin.left, width - margin.right]);

 const yScaleHeat = d3.scaleLinear()
  .domain([minDepth, maxDepth])
  .range([margin.top, height - margin.bottom]);

    heatmapSvg.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(xScaleHeat).ticks(5));

heatmapSvg.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(d3.axisLeft(yScaleHeat).ticks(5));

  const flatValues = heatmapData.flat().filter(d => d !== null && !isNaN(d));

const colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain(flatValues.length > 0 ? d3.extent(flatValues) : [0, 1]);

const cellWidth = (width - margin.left - margin.right) / nTime;
const cellHeight = (height - margin.top - margin.bottom) / nDepth;
heatmapSvg.selectAll("rect")
  .data(
    heatmapData.flatMap((row, i) =>
      row.map((v, j) => ({ value: v, row: i, col: j, depth: depthValues[i] }))
         .filter(d => d.value > 0) // <-- Only keep positive values
         .filter(d => d.depth >= minDepth && d.depth <= maxDepth)
    )
  )
  .join("rect")
  .attr("x", d => xScaleHeat(d.col))
  .attr("y", d => yScaleHeat(d.depth))
  .attr("width", cellWidth)
  .attr("height", cellHeight)
  .attr("fill", d => colorScale(d.value))
  .attr("stroke", "#fff")
  .attr("stroke-width", 0.05)
  .on("mouseover", function(event, d) {
    showTooltip(event,
      `Time Index: ${d.col}<br>
      Depth: ${d.depth.toFixed(2)} m<br>
      Value: ${d.value.toExponential(2)}`
    );

    // Highlight the cell
    d3.select(this)
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5);
  }).on("mouseout", function() {
    hideTooltip();
    d3.select(this)
      .attr("stroke", "#fff")
      .attr("stroke-width", 0.05);
  });


heatmapSvg.append("text")
  .attr("x", width - margin.right)
  .attr("y", margin.top - 10)
  .attr("text-anchor", "end")
  .text(`Tracer Fraction Heatmap (Depth: ${minDepth.toFixed(0)} - ${maxDepth.toFixed(0)}m)`);

// Draw or update the colorbar with the current colorScale domain
drawColorbar(colorScale);

// console.log("Colorbar domain:", colorScale.domain());
console.log("Heatmap value stats:", {
  min: d3.min(flatValues),
  max: d3.max(flatValues),
  mean: d3.mean(flatValues),
  median: d3.median(flatValues)
});

heatmapSvg.append("text")
  .attr("x", width / 2)
  .attr("y", height - 10)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text("Time Index");

heatmapSvg.append("text")
  .attr("transform", `translate(15, ${height / 2}) rotate(-90)`)
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text("Depth Index");}

verticalProfileSvg
  .attr("width", width + margin.left)
  .attr("height", height + margin.top);

 timeSeriesSvg
  .attr("width", width + margin.left)
  .attr("height", height + margin.top);

 heatmapSvg
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top);

d3.select("#tracer-select").on("change", function() {
  currentTracer = this.value;
  loadData(currentTracer);
});

d3.select("#time-slider").on("input", function() {
  currentTime = +this.value;
  updatePlots();
});

d3.select("#min-depth").on("input", function() {
  minDepth = +this.value;
  updatePlots();
});

d3.select("#max-depth").on("input", function() {
  maxDepth = +this.value;
  updatePlots();
});

loadData(currentTracer);