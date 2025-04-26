// Load csv
d3.csv("scripts/data/video-games-sales.csv").then(data => {
  // Parse numeric fields
  data.forEach(d => {
    d.NA_Sales = +d.NA_Sales || 0;
    d.EU_Sales = +d.EU_Sales || 0;
    d.JP_Sales = +d.JP_Sales || 0;
    d.Other_Sales = +d.Other_Sales || 0;
    d.Global_Sales = +d.Global_Sales || 0;
  });

  const validData = data.filter(d => d.Year !== 'N/A');

  // Don't include the more obscure platforms 
  const validPlatforms = [
    "2600", "3DS", "DC", "DS", "GB", "GBA", "GEN", "N64", "NES", "PC",
    "PS", "PS2", "PS3", "PS5", "PSP", "PSV", "SAT", "SNES", "Wii", "WiiU",
    "X360", "XB", "XOne"
  ];
  
  // Rename for ease of use
  const platformNames = {
    "2600": "Atari 2600",
    "3DS": "Nintendo 3DS",
    "DC": "Sega Dreamcast",
    "DS": "Nintendo DS",
    "GB": "Game Boy",
    "GBA": "Game Boy Advance",
    "GEN": "Sega Genesis",
    "N64": "Nintendo 64",
    "NES": "NES",
    "PC": "PC",
    "PS": "PlayStation",
    "PS2": "PlayStation 2",
    "PS3": "PlayStation 3",
    "PS5": "PlayStation 5",
    "PSP": "PlayStation Portable",
    "PSV": "PlayStation Vita",
    "SAT": "Sega Saturn",
    "SNES": "Super Nintendo",
    "Wii": "Nintendo Wii",
    "WiiU": "Nintendo Wii U",
    "X360": "Xbox 360",
    "XB": "Xbox",
    "XOne": "Xbox One"
  };
  
  const platforms = ["All", ...Array.from(new Set(validData.map(d => d.Platform)))
    .filter(platform => validPlatforms.includes(platform))
    .sort()
    .map(platform => ({ value: platform, text: platformNames[platform] }))];
  const genres = ["All", ...Array.from(new Set(validData.map(d => d.Genre))).sort()];
  const regionOptions = [
    { value: "Global_Sales", text: "Global" },
    { value: "NA_Sales", text: "North America" },
    { value: "EU_Sales", text: "Europe" },
    { value: "JP_Sales", text: "Japan" },
    { value: "Other_Sales", text: "Other" }
  ];

  const platformContainer = d3.select("#platform-options");
  const genreContainer = d3.select("#genre-options");
  const regionContainer = d3.select("#region-options");

  function createRadioButtons(container, options, groupName) {
    options.forEach(option => {
      const label = container.append("label");
      label.append("input")
        .attr("type", "radio")
        .attr("name", groupName)
        .attr("value", option.value || option)
        .property("checked", option === "All" || option.value === "Global_Sales");
      label.append("span").text(option.text || option);
      label.append("br");
    });
  }

  // radio selects
  createRadioButtons(platformContainer, platforms, "platform");
  createRadioButtons(genreContainer, genres, "genre");
  createRadioButtons(regionContainer, regionOptions, "region");

  // filter based on selections
  function filterData() {
    const selectedPlatform = d3.select('input[name="platform"]:checked').property("value");
    const selectedGenre = d3.select('input[name="genre"]:checked').property("value");
    const selectedRegion = d3.select('input[name="region"]:checked').property("value");

    let filtered = validData;

    if (selectedPlatform !== "All") {
      filtered = filtered.filter(d => d.Platform === selectedPlatform);
    }
    if (selectedGenre !== "All") {
      filtered = filtered.filter(d => d.Genre === selectedGenre);
    }

    topGames(filtered, selectedRegion);
    perYear(filtered, selectedRegion);
    mapBubbles(filtered);
  }

  d3.selectAll('input[name="platform"], input[name="genre"], input[name="region"]').on("change", filterData);

  filterData();

  // TOP GAMES BAR CHART
  function topGames(filteredData, selectedRegion) {
    const svg = d3.select("#bar");
    svg.selectAll("*").remove();
  
    const margin = { top: 50, right: 30, bottom: 30, left: 150 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
  
    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const yScale = d3.scaleBand().range([0, height]).padding(0.2);
    const xScale = d3.scaleLinear().range([0, width]);
  
    const yAxis = chart.append("g").attr("class", "y-axis");
    const xAxis = chart.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`);
  
    chart.append("text")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 20)
      .attr("transform", "rotate(-90)")
      .style("text-anchor", "middle")
      .text("Game Titles");
  
    svg.append("text")
      .attr("x", (width + margin.left + margin.right) / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text(`Top 20 Games`);
  
    const top20 = filteredData
      .filter(d => d[selectedRegion] > 0)
      .sort((a, b) => b[selectedRegion] - a[selectedRegion])
      .slice(0, 25);
  
    yScale.domain(top20.map(d => d.Name));
    xScale.domain([0, d3.max(top20, d => d[selectedRegion]) || 1]);
  
    const bars = chart.selectAll(".bar")
      .data(top20, d => d.Name);
  
    bars.enter()
      .append("rect")
      .attr("class", "bar")
      .attr("fill", "steelblue")
      .merge(bars)
      .attr("y", d => yScale(d.Name))
      .attr("height", yScale.bandwidth())
      .attr("x", 0)
      .attr("width", d => xScale(d[selectedRegion]));
  
    bars.exit().remove();
  
    yAxis.call(d3.axisLeft(yScale).tickFormat(d => d.length > 15 ? d.slice(0, 15) + "..." : d));
    xAxis.call(d3.axisBottom(xScale).ticks(10, ".1f"));
  }

  // SALES PER YEAR LINE CHART
  function perYear(filteredData, selectedRegion) {
    const svg = d3.select("#line");
    // Reset on update
    svg.selectAll("*").remove();

    // margins
    const margin = { top: 40, right: 30, bottom: 80, left: 60 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // scales
    const xScale = d3.scalePoint().range([0, width]).padding(0.5); 
    const yScale = d3.scaleLinear().range([height, 0]); 

    // axis containers
    const xAxis = chart.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`); 

    const yAxis = chart.append("g")
      .attr("class", "y-axis"); 

    // y label
    chart.append("text")
      .attr("transform", "rotate(-90)") 
      .attr("y", 0 - margin.left + 15) 
      .attr("x", 0 - (height / 2)) 
      .style("text-anchor", "middle")
      .text("Total Sales (millions)");

    // title
    svg.append("text")
        .attr("x", (width + margin.left + margin.right) / 2)
        .attr("y", margin.top / 2) 
        .attr("text-anchor", "middle")
        .style("font-weight", "bold")
        .text(`Total Sales Per Year`);

    // region filter
    const salesPerYear = d3.rollups(
      filteredData.filter(d => d.Year && d[selectedRegion] > 0),
      v => d3.sum(v, d => d[selectedRegion]),
      d => d.Year 
    )

    // format
    .map(([year, totalSales]) => ({ year: +year, sales: totalSales }))
    .sort((a, b) => a.year - b.year); // Sort chronologically by year

    // scales
    xScale.domain(salesPerYear.map(d => d.year)); 
    const maxSales = d3.max(salesPerYear, d => d.sales);
    yScale.domain([0, maxSales > 0 ? maxSales : 1]); 

    // make line
    const line = d3.line()
      .x(d => xScale(d.year)) 
      .y(d => yScale(d.sales)) 
      .curve(d3.curveMonotoneX); 

    // Data binding 
    const path = chart.selectAll(".line")
      .data([salesPerYear]); 

    // Draw the line
    path.enter()
      .append("path")
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .merge(path) 
      .attr("d", line);

    path.exit().remove();

    // Data binding 
    const points = chart.selectAll(".dot")
        .data(salesPerYear, d => d.year);

    // Draw points 
    points.enter()
        .append("circle")
        .attr("class", "dot")
        .attr("fill", "steelblue")
        .merge(points) 
        .attr("cx", d => xScale(d.year)) 
        .attr("cy", d => yScale(d.sales)) 
        .attr("r", 4); 

    points.exit().remove();


    const yearValues = xScale.domain();
    const tickInterval = Math.max(1, Math.ceil(yearValues.length / (width / 50)));
    const tickValues = yearValues.filter((d, i) => i % tickInterval === 0);

    // x labels (years)
    xAxis
      .call(d3.axisBottom(xScale)
          .tickValues(tickValues) 
          .tickFormat(d3.format("d"))) 
      .selectAll("text")
      .attr("transform", "rotate(-45)") 
      .style("text-anchor", "end");

    // y labels (sales)
    yAxis
      .call(d3.axisLeft(yScale).ticks(10, ".1f")); 
  }

  // WORLD MAP BUBBLES
  function mapBubbles(filteredData) {
    const svg = d3.select("#bubble");
    // reset on update
    svg.selectAll("*").remove();

    // margins
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    // chart container
    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // legend container
    const legendContainer = d3.select("#legend-container");
    legendContainer.html(""); // Clear previous legend content

    // load map
    d3.json("scripts/data/countries.json").then(world => {
      const countries = topojson.feature(world, world.objects.countries);

      // define projection
      const projection = d3.geoMercator()
        .scale(130) 
        .translate([width / 2, height / 1.5]); 

      // path generator
      const path = d3.geoPath().projection(projection);

      // draw paths
      chart.selectAll("path")
        .data(countries.features)
        .enter()
        .append("path")
        .attr("d", path) 
        .attr("fill", "#e0e0e0") 
        .attr("stroke", "#999"); 

      // Define regions and locations
      const regionSales = [
        { region: "North America", key: "NA_Sales", coords: [-100, 40] },
        { region: "Europe", key: "EU_Sales", coords: [10, 50] },
        { region: "Japan", key: "JP_Sales", coords: [138, 36] },
        { region: "Other", key: "Other_Sales", coords: [80, -25] }, 
      ];

      // region sales
      const bubbleData = regionSales.map(region => {
        const totalSales = d3.sum(filteredData, d => d[region.key]);
        return { ...region, totalSales }; 
      }).filter(d => d.totalSales > 0); 

      // scales
      const radiusScale = d3.scaleSqrt() 
        .domain([0, d3.max(bubbleData, d => d.totalSales)])
        .range([0, 50]);

      // data binding
      const bubbles = chart.selectAll(".bubble")
        .data(bubbleData, d => d.region); 

      // draw bubbles
      bubbles.enter()
        .append("circle")
        .attr("class", "bubble")
        .attr("cx", d => projection(d.coords)[0])
        .attr("cy", d => projection(d.coords)[1])
        .attr("r", d => radiusScale(d.totalSales)) 
        .attr("fill", "steelblue")
        .attr("opacity", 0.5)
        .attr("stroke", "#333")
        .attr("stroke-width", 1);

      // append legend
      const legend = legendContainer.append("ul")
        .style("list-style", "none")
        .style("padding", "0")
        .style("text-align", "left");

      // add each region to legend
      bubbleData
        .sort((a, b) => b.totalSales - a.totalSales) 
        .forEach(d => {
          legend.append("li")
            .style("margin-bottom", "10px")
            .html(`<strong>${d.region}:</strong> ${d.totalSales.toFixed(1)}M`);
      });
    });
  }
});