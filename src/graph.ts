import * as cola from "webcola";
import * as d3 from "d3";
import "./graph.css";

window.d3 = d3;

var NODE_RADIUS = 7;
var GATE_RADIUS = 2;
var REPEL_FORCE = 0;
var LINK_DISTANCE = 100;

var WIDTH = 1000;
var HEIGHT = 500;

export function drawGraph(graph: any, panel: any) {
  var d3cola = cola.d3adaptor().avoidOverlaps(true).size([WIDTH, HEIGHT]);

  var svg = d3.select(panel);

  d3.selectAll(panel + "> *").remove();

  // define arrow markers for graph links
  svg
    .append("svg:defs")
    .append("svg:marker")
    .attr("id", "end-arrow")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 6)
    .attr("markerWidth", 4)
    .attr("markerHeight", 4)
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

  graph.nodes.forEach((v: { height: number; width: number; name: string }) => {
    v.height = v.width = 2 * (v.name === "GATE" ? GATE_RADIUS : NODE_RADIUS);
  });

  d3cola
    .nodes(graph.nodes)
    .links(graph.links)
    .constraints(graph.constraints)
    .symmetricDiffLinkLengths(REPEL_FORCE)
    .linkDistance(LINK_DISTANCE)
    .start(10, 15, 20);

  var path = svg
    .selectAll(".link")
    .data(graph.links)
    .enter()
    .append("svg:path")
    .attr("class", "link");

  path.append("title").text((d: any) => {
    var text = "";
    text += "Weight: " + Math.round(d.weight * 1000) / 1000 + "\n";
    text += "Source: " + d.source.id + "\n";
    text += "Target: " + d.target.id;
    return text;
  });

  var node = svg
    .selectAll(".node")
    .data(graph.nodes)
    .enter()
    .append("circle")
    .attr("class", (d: any) => "node " + d.name)
    .attr("r", (d: any) => (d.name === "GATE" ? GATE_RADIUS : NODE_RADIUS))
    .call(d3cola.drag);

  node.append("title").text((d: any) => {
    var text = "";
    text += "Activation: " + Math.round(d.activation * 1000) / 1000 + "\n";
    text += "Bias: " + Math.round(d.bias * 1000) / 1000 + "\n";
    text += "Position: " + d.id;
    return text;
  });

  var label = svg
    .selectAll(".label")
    .data(graph.nodes)
    .enter()
    .append("text")
    .attr("class", "label")
    .text((d: any) => "(" + d.index + ") " + d.name)
    .call(d3cola.drag);

  d3cola.on("tick", () => {
    // draw directed edges with proper padding from node centers
    path.attr("d", (d: any) => {
      var deltaX = d.target.x - d.source.x;
      var deltaY = d.target.y - d.source.y;
      var dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      var normX = deltaX / dist;
      var normY = deltaY / dist;

      if (isNaN(normX)) normX = 0;
      if (isNaN(normY)) normY = 0;

      var sourcePadding = d.source.width / 2;
      var targetPadding = d.target.width / 2 + 2;
      var sourceX = d.source.x + sourcePadding * normX;
      var sourceY = d.source.y + sourcePadding * normY;
      var targetX = d.target.x - targetPadding * normX;
      var targetY = d.target.y - targetPadding * normY;

      // Defaults for normal edge.
      var drx = 0;
      var dry = 0;
      var xRotation = 0; // degrees
      var largeArc = 0; // 1 or 0
      var sweep = 1; // 1 or 0

      // Self edge.
      if (d.source.x === d.target.x && d.source.y === d.target.y) {
        xRotation = -45;
        largeArc = 1;
        drx = 20;
        dry = 20;
        targetX = targetX + 1;
        targetY = targetY + 1;
      }
      return (
        "M" +
        sourceX +
        "," +
        sourceY +
        "A" +
        drx +
        "," +
        dry +
        " " +
        xRotation +
        "," +
        largeArc +
        "," +
        sweep +
        " " +
        targetX +
        "," +
        targetY
      );
    });

    node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    label.attr("x", (d: any) => d.x + 10).attr("y", (d: any) => d.y - 10);
  });
}
