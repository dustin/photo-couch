var camerasViewURL = '_view/cameras?group_level=2';

var w = window.innerWidth,
    h = window.innerHeight,
    x = d3.scale.linear().range([0, w]),
    y = d3.scale.linear().range([0, h]),
    color = d3.scale.category20c(),
    root,
    node;

var treemap = d3.layout.treemap()
    .round(false)
    .size([w, h])
    .sticky(true)
    .value(function(d) { return d.size; });

var svg = d3.select("body").append("div")
    .attr("class", "chart")
    .style("width", w + "px")
    .style("height", h + "px")
    .append("svg:svg")
    .attr("width", w)
    .attr("height", h)
    .append("svg:g")
    .attr("transform", "translate(.5,.5)");

d3.json(camerasViewURL, function(data) {
    var cameras = [ ];

    var ob = {
        "name": toTitleCase(data.rows[0].key[0]),
        "children": []
    };
    cameras.push(ob);
    for (var i = 0; i < data.rows.length; i++) {
        var r = data.rows[i];
        if (r.key[0] != ob.name) {
            ob = {
                "name": toTitleCase(r.key[0]),
                "children": []
            };
            cameras.push(ob);
        }
        ob.children.push({"name": toTitleCase(r.key[1]), "size": r.value.count});
    };

    root = {
        "name": "cameras",
        "children": cameras
    };

    node = root;

    var nodes = treemap.nodes(root)
        .filter(function(d) { return !d.children; });

    var cell = svg.selectAll("g")
      .data(nodes)
        .enter().append("svg:g")
        .attr("class", "cell")
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .on("click", function(d) {
            return zoom(node == d.parent ? root : d.parent);
        });

    cell.append("svg:rect")
        .attr("width", function(d) { return d.dx - 1; })
        .attr("height", function(d) { return d.dy - 1; })
        .style("fill", function(d) { return color(d.parent.name); });

    cell.append("svg:text")
        .attr("x", function(d) { return d.dx / 2; })
        .attr("y", function(d) { return d.dy / 2; })
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.name; })
        .style("opacity", function(d) {
            d.w = this.getComputedTextLength();
            return d.dx > d.w ? 1 : 0;
        });

    d3.select(window).on("click", function() { zoom(root); });

    d3.select("select").on("change", function() {
        treemap.value(this.value == "size" ? size : count).nodes(root);
        zoom(node);
    });
});

function size(d) {
    return d.size;
}

function count(d) {
    return 1;
}

function zoom(d) {
    var kx = w / d.dx, ky = h / d.dy;
    x.domain([d.x, d.x + d.dx]);
    y.domain([d.y, d.y + d.dy]);

    var t = svg.selectAll("g.cell").transition()
        .duration(d3.event.altKey ? 7500 : 750)
        .attr("transform", function(d) {
            return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    t.select("rect")
        .attr("width", function(d) { return kx * d.dx - 1; })
        .attr("height", function(d) { return ky * d.dy - 1; });

    t.select("text")
        .attr("x", function(d) { return kx * d.dx / 2; })
        .attr("y", function(d) { return ky * d.dy / 2; })
        .style("opacity", function(d) { return kx * d.dx > d.w ? 1 : 0; });

    node = d;
    d3.event.stopPropagation();
}

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}
