angular.module('photo', []).
    filter('markdownify', function() {
        return function(string) {
            if(!string) {
                return "";
            }
            return marked(string);
        };
    }).
    config(['$routeProvider', '$locationProvider',
            function($routeProvider, $locationProvider) {
                $routeProvider.
                    when('/index/', {templateUrl: 'static/partials/index.html',
                                     controller: 'IndexCtrl'}).
                    when("/recent/", {templateUrl: 'static/partials/list.html',
                                      controller: 'RecentCtrl'}).
                    when("/recent/:skip/", {templateUrl: 'static/partials/list.html',
                                            controller: 'RecentCtrl'}).
                    when("/tag/:tag", {templateUrl: 'static/partials/list.html',
                                       controller: 'TagCtrl'}).
                    when("/tag/:tag/:skip/",
                         {templateUrl: 'static/partials/tag.html',
                          controller: 'TagCtrl'}).
                    when("/photo/:id", {templateUrl: 'static/partials/photo.html',
                                       controller: 'PhotoCtrl'}).
                    otherwise({redirectTo: '/index/'});
                $locationProvider.hashPrefix('!');
            }]);

function IndexCtrl($scope, $http) {
    $http.get("_view/tag?group_level=1").success(function(data) {
        var tags = _.map(data.rows, function(t) { return [t.key, t.value]; });
        $scope.cloud = photo_tag_cloud(tags);
    });
}

function TagSearchCtrl($scope, $location) {
    $scope.search = function() {
        var l = decodeURIComponent($scope.query).replace(' ', '+');
        window.location.hash = "#!/tag/" + l;
    };
}

function RecentCtrl($scope, $http, $routeParams) {
    $scope.skip = typeof($routeParams.skip) == "undefined" ? 0 : $routeParams.skip;
    $http.get("_view/recent-added?descending=true").success(function(data) {
        paginatedPhotos($scope, $http, _.pluck(data.rows, 'id'), 50,
                        function(i) {
                            return "#!/recent/" + i + "/";
                        });
    });
}

function paginatedPhotos($scope, $http, found, pagesize, linkfun) {
    $scope.total = found.length;
    $scope.pages = [];
    for (var i = 0; i < found.length / pagesize; i++) {
        $scope.pages.push({'page': i + 1,
                           'link': linkfun(i)});
    }
    var skip = $scope.skip * pagesize;
    var toget = _.first(_.tail(found, skip), pagesize);
    $http.post("../../_all_docs?include_docs=true",
               {"keys": toget}).success(function(data) {
                   $scope.photos = _.pluck(data.rows, 'doc');
               });
}

function TagCtrl($scope, $http, $routeParams) {
    var tagNames = $routeParams.tag.split(/[+-]/);
    $scope.skip = typeof($routeParams.skip) == "undefined" ? 0 : $routeParams.skip;
    var pagesize = 50;
    var completed = 0;
    var found = [];
    var timestamps = {};

    _.each(tagNames, function(tag) {
        $http.get('_view/tag?reduce=false&key="' +
                  tag + '"').success(function(data) {
                      var ids = [];
                      _.each(data.rows, function(r) {
                          ids.push(r.id);
                          timestamps[r.id] = r.value;
                      });
                      found = (completed>0) ? _.intersection(found, ids) : ids;
                      console.log("Found", ids.length, "for", tag,
                                  "now have", found.length);
                      completed++;
                      if (completed == tagNames.length) {
                          found.sort(function(a, b) {
                              return timestamps[a] > timestamps[b] ? -1 : 1;
                          });
                          paginatedPhotos($scope, $http, found, pagesize,
                                         function(i) {
                                             return '#!/tag/' +
                                                 $routeParams.tag + '/' + i + '/';
                                         });
                      }
                  });
    });
}

function PhotoCtrl($scope, $http, $routeParams) {
    var id = $routeParams.id;
    console.log("Loading", id);
    $http.get("../../" + id).success(function(data) {
        $scope.photo = data;
        $scope.imageLink = "../../" + id + "/800x600.jpg";
    });

    $http.get('_view/comments?start_key=["' +
              id + '"]&end_key=["' + id + '",{}]').success(function(data) {
                  $scope.comments = _.pluck(data.rows, 'value');
              });
}

function field_blur_behavior(field, def) {
    var f=$(field);
    var defaultClass='defaultfield';
    function blurBehavior() {
        console.log("Doing blur behavior.");
        if(!f.val() || f.val() === '') {
            console.log("Value is empty, setting to ``" + def + "''");
            f.val(def);
        } else {
            console.log("Value is currently ``" + f.value + "''");
        }
    }
    function focusBehavior() {
        console.log("Doing focus behavior.");
        if(f.val() === def) {
            f.val('');
        }
    }
    blurBehavior();
    $(f).bind('focus', focusBehavior);
    $(f).bind('blur', blurBehavior);
    $(window).bind('unload', focusBehavior);
}

function photo_search(app, input) {
    var path = app.require("vendor/couchapp/lib/path").init(app.req);

        // console.log("Searching for " + input.val());
    // $('#items').html("<h1>Search Results for \"" + input.val() + "\"</h1>");
    // $('#items').append("<div id='search_results'>");

    window.location = path.list('tag', 'tag', {key: input.val(),
                                               include_docs: true,
                                               reduce: false,
                                               limit: 50});
}

function photo_bulk_edit(app, form) {
    console.log("Enabled bulk editor for app");
    console.log(app);

    for (var i = 0; i < docs.length; ++i) {
        $("#" + docs[i]._id + "-cat").val(docs[i].cat);
    }

    $(form).submit(function() {
        console.log("Updating a bunch of docs.");

        for (var i = 0; i < docs.length; ++i) {
            docs[i].keywords = $("#" + docs[i]._id + "-tags").val().split(" ");
            docs[i].descr = $("#" + docs[i]._id + "-descr").val();
            docs[i].cat = $("#" + docs[i]._id + "-cat").val();
        }

        app.db.bulkSave({docs: docs}, {
            success: function() {
                var path = app.require("vendor/couchapp/lib/path").init(app.req);
                window.location = path.asset('index.html');
            },
            error: function(req, status, err) {
                console.log(err);
                alert(err);
            }
        });


        return false;
    });
}

function photo_recent_feed(app, target) {
    var path = app.require("vendor/couchapp/lib/path").init(app.req);
        var Mustache = app.require("vendor/couchapp/lib/mustache");

        var tmpl = '<a href="{{show}}"><img src="{{thumb}}" alt="full image"' +
        ' title="Added {{ts}}, taken {{taken}}"/></a>';

    var changeFeed = app.db.changes(false, {"include_docs": true});
        changeFeed.onChange(function(data) {

            for (var i = 0; i < data.results.length; ++i) {
                var row = data.results[0];
                var thumbname = 'thumb.' + row.doc.extension;
                if (row.doc['_attachments'] && row.doc._attachments[thumbname]) {
                    var tdata = {
                        show: path.show('item', row.id),
                        thumb: path.attachment(row.id, thumbname),
                        ts: row.doc.ts,
                        taken: row.doc.taken
                    };

                    target.prepend(Mustache.to_html(tmpl, tdata));
                }
            }
        });
}

function photo_maybe_enable_admin_functions(app) {
    $.couch.session({
        success : function(r) {
                var userCtx = r.userCtx;
            if (userCtx.roles.indexOf("_admin") != -1) {
                $(".admin").show();
            }
        }
    });
}

function photo_tag_cloud(tags) {
    tags.sort(function(a, b) { return b[1] - a[1]; });
    var numToKeep = 75;
    if (tags.length > numToKeep) {
        tags.splice(numToKeep, tags.length - numToKeep);
    }

    function sumOf(a) {
        var sum = 0;
        for (var i = 0; i < a.length; ++i) {
            sum += a[i][1];
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
        if (sumOf(clumps[current]) + tags[i][1] > each) {
            ++current;
        }
        if (current >= clumps.length) {
            current = clumps.length - 1;
        }
        clumps[current].push(tags[i]);
    }

    tags = [];

    for (var i = 0; i < clumps.length; ++i) {
        for (var j = 0; j < clumps[i].length; ++j) {
            tags.push({key: clumps[i][j][0],
                       count: clumps[i][j][1],
                       weight: i});
        }
    }

    tags.sort(function(a, b) { return (a.key > b.key) ? 1 : -1 ; });

    return tags;
}
