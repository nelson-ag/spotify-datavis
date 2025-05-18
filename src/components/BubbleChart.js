import { CATEGORIES } from '../config/constants.js';

export class BubbleChart {
    constructor(containerId, onDataUpdate) {
        this.container = document.getElementById(containerId);
        this.onDataUpdate = onDataUpdate;
        this.locked = false;
    }

    render(data) {
        const bounds = this.container.getBoundingClientRect();
        const width = bounds.width;
        const height = bounds.height;

        const svg = d3.select("#bubble-chart");
        svg.selectAll("*").remove();
        svg
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        const root = d3.hierarchy({ children: data }).sum(d => d.totalStreams);
        const pack = d3.pack().size([width, height]).padding(10);
        const nodes = pack(root).leaves();

        // Create patterns
        const defs = svg.append("defs");
        nodes.forEach((d, i) => {
            defs.append("pattern")
                .attr("id", `img-${i}`)
                .attr("patternUnits", "userSpaceOnUse")
                .attr("width", d.r * 2)
                .attr("height", d.r * 2)
                .attr("x", d.x - d.r)
                .attr("y", d.y - d.r)
                .append("image")
                .attr("href", d.data.imageUrl)
                .attr("width", d.r * 2)
                .attr("height", d.r * 2)
                .attr("preserveAspectRatio", "xMidYMid slice");
        });

        // Create circles
        const circles = svg.selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => d.r)
            .attr("fill", (d, i) => `url(#img-${i})`)
            .style("opacity", 1);

        // Create overlays
        const overlays = svg.selectAll("circle-overlay")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("r", d => d.r)
            .attr("fill", "none")
            .attr("stroke", "#0ebf24")
            .attr("stroke-width", 8)
            .style("opacity", 0)
            .style("pointer-events", "none");

        // Set up event listeners
        circles
            .on("mouseover", (e, d) => {
                if (!this.locked) {
                    d3.select(overlays.nodes()[nodes.indexOf(d)])
                        .transition()
                        .duration(300)
                        .style("opacity", 0.6);
                    this.onDataUpdate(d);
                }
            })
            .on("mouseout", (e, d) => {
                if (!this.locked) {
                    d3.select(overlays.nodes()[nodes.indexOf(d)])
                        .transition()
                        .duration(200)
                        .style("opacity", 0);
                }
            })
            .on("click", (e, d) => {
                e.stopPropagation();
                console.log("clicked on " + d.data.name);
                this.locked = !this.locked;
                console.log("locked: " + this.locked);
                d3.select(overlays.nodes()[nodes.indexOf(d)])
                    .transition()
                    .duration(300)
                    .style("opacity", 0.6);
                this.onDataUpdate(d);
            });

        d3.select(this.container)
            .on("mouseenter", () => {
                this.locked = false;
                circles
                    .transition()
                    .duration(200)
                    .style("opacity", 1);
                overlays
                    .transition()
                    .duration(200)
                    .style("opacity", 0);
            });

        // Update initial data
        this.onDataUpdate({ data: data[0], index: 0 });
    }
} 