function(data) {
    var tags = data.rows;
    tags.sort(function(a, b) { return b.value - a.value; });
    var numToKeep = 75;
    if (tags.length > numToKeep) {
        tags.splice(numToKeep, tags.length - numToKeep);
    }

    function sumOf(a) {
        var sum = 0;
        for (var i = 0; i < a.length; ++i) {
            sum += a[i].value;
        }
        return sum;
    }

    var sum = sumOf(tags);
    var each = sum / tags.length;

    var clumps = [];
    for(var i = 0; i < 5; ++i) {
        clumps[i] = [];
    }

    var current = 0;
    for (var i = 0; i < tags.length; ++i) {
        if (sumOf(clumps[current]) + tags[i].value > each) {
            ++current;
        }
        if (current >= clumps.length) {
            current = clumps.length - 1;
        }
        clumps[current].push(tags[i]);
    }

    tags = [];

    /* Argh.  need to figure out how to get this from the app */
    function listPath(l, v, args) {
        return '/photo/_design/photo-couch/_list/' + l + '/' +
            v + '?key=%22' + args.key + '%22';
    }

    for (var i = 0; i < clumps.length; ++i) {
        for (var j = 0; j < clumps[i].length; ++j) {
            tags.push({key: clumps[i][j].key,
                       count: clumps[i][j].value,
                       weight: i,
                       link: listPath('tag', 'tag', {key: clumps[i][j].key})});
        }
    }

    tags.sort(function(a, b) { return (a.key > b.key) ? 1 : -1 ; });

    return {
        tags: tags
    };
}