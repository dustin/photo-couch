var camerasViewURL = '_view/cameras?group_level=2';

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function computeNodesLinks(rows) {
    var rv = {nodes: [], links: []};
    var sizes = {};

    for (var i = 0; i < rows.length; i++) {
        var k = toTitleCase(rows[i].key[0]);
        sizes[k] = (sizes[k] || 0) + rows[i].value.count;
    }

    var seen = {};

    var prevmodel = "";
    var prevsection = "";
    var j = 1;
    var base = 0;

    rv.nodes.push({name: 'Cameras', size: 10, type: "root"});

    for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var model = toTitleCase(r.key[0]);

        if (model != prevmodel) {
            prevmodel = model;

            rv.nodes.push({name: model, size: sizes[model], type: "make"});
            rv.links.push({source: j, target: base, value: 1});
            seen[model] = j;
            j++;
        }

        var name = toTitleCase(r.key[1]);

        rv.nodes.push({name: name, size: r.value.count, type: "model"});
        var s = seen[model], d = j;
        rv.links.push({source: s, target: d, value: 1});
        j++;
    }

    return rv;
}

function initVis() {
    var width = window.innerWidth,
        height = window.innerHeight;

    var color = d3.scale.category20();

    var svg = d3.select("#chart").append("svg")
        .attr("width", width)
        .attr("height", height);

    function update() {
        d3.json(camerasViewURL, function(json) {
            var nodes = computeNodesLinks(json.rows);

            var allSizes = [];
            for (var i = 0; i < nodes.nodes.length; i++) {
                allSizes.push(nodes.nodes[i].size);
            }

            var sizeScale = d3.scale.linear()
                .domain([d3.min(allSizes), d3.max(allSizes)])
                .range([5, 40]);

            var force = d3.layout.force()
                .charge(-400)
                .linkDistance(80)
                .size([width, height]);

            force
                .nodes(nodes.nodes)
                .links(nodes.links)
                .start();

            var link = svg.selectAll("line.link")
                .data(nodes.links)
                .enter().append("line")
                .attr("class", "link")
                .style("stroke-width", function(d) { return Math.sqrt(d.value); });

            svg.selectAll("line.link")
                .data(nodes.links)
                .exit().remove();

            var node = svg.selectAll("circle.node")
                .data(nodes.nodes)
                .enter().append("circle")
                .attr("class", function(d) { return "node " + d.type;})
                .attr("r", function(d) { return sizeScale(d.size); })
                .style("fill", function(d) {
                    return d.type == "model" ? color(d.name) : null;
                })
                .call(force.drag);

            node.append("title")
                .text(function(d) { return d.name + (d.type == 'root' ? '' : " (" + d.size + ")"); });

            svg.selectAll("circle.node")
                .data(nodes.nodes)
                .attr("class", function(d) { return "node " + d.type;})
                .attr("r", function(d) { return sizeScale(d.size); })
                .style("fill", function(d) {
                    return d.type == "model" ? color(d.name) : null;
                })
                .exit().remove();

            force.on("tick", function() {
                link.attr("x1", function(d) { return d.source.x; })
                    .attr("y1", function(d) { return d.source.y; })
                    .attr("x2", function(d) { return d.target.x; })
                    .attr("y2", function(d) { return d.target.y; });

                node.attr("cx", function(d) { return d.x; })
                    .attr("cy", function(d) { return d.y; });
            });
        });;
    }

    update();
}