angular.module('photo', []).
    filter('markdownify', function() {
        return function(string) {
            if(!string) {
                return "";
            }
            return marked(string);
        };
    }).
    filter('taglinks', function() {
        return function(keywords) {
            var linked = _.map(keywords, function(k) {
                return '<a href="#!/tag/' + encodeURIComponent(k) + '">' +
                    k + '</a>';
            });
            return linked.join(', ');
        };
    }).
    filter('orient', function() {
        return function(photo) {
            return imgCss(photo.exif);
        };
    }).
    config(['$routeProvider', '$locationProvider',
            function($routeProvider, $locationProvider) {
                $routeProvider.
                    when('/index/', {templateUrl: 'static/partials/index.html',
                                     controller: 'IndexCtrl'}).
                    when("/unprocessed/", {templateUrl: 'static/partials/unprocessed.html',
                                      controller: 'UnprocessedCtrl'}).
                    when("/recent-taken/", {templateUrl: 'static/partials/list.html',
                                      controller: 'RecentTakenCtrl'}).
                    when("/recent-taken/:skip/",
                         {templateUrl: 'static/partials/list.html',
                          controller: 'RecentTakenCtrl'}).
                    when("/recent/", {templateUrl: 'static/partials/list.html',
                                      controller: 'RecentCtrl'}).
                    when("/recent/:skip/", {templateUrl: 'static/partials/list.html',
                                            controller: 'RecentCtrl'}).
                    when("/tag/:tag", {templateUrl: 'static/partials/list.html',
                                       controller: 'TagCtrl'}).
                    when("/tag/:tag/:skip/",
                         {templateUrl: 'static/partials/list.html',
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

    $http.get('_view/tag?key="uot"&include_docs=true&reduce=false').success(function(data) {
        $scope.uot = data.rows[_.random(data.rows.length)].doc;
        $scope.uot.largeSrc = getLargeSrc($scope.uot._id, $scope.uot.extension);
        $scope.uot.imageLink = getPhotoLink($scope.uot._id);
    });
}

function TagSearchCtrl($scope, $location) {
    $scope.search = function() {
        var l = decodeURIComponent($scope.query).replace(/\s+/g, '+');
        window.location.hash = "#!/tag/" + l;
    };
}

function RecentCtrl($scope, $http, $routeParams) {
    $scope.skip = typeof($routeParams.skip) == "undefined" ? 1 : +$routeParams.skip;
    $http.get("_view/recent-added?descending=true").success(function(data) {
        paginatedPhotos($scope, $http, _.pluck(data.rows, 'id'), 50,
                        function(i) {
                            return "#!/recent/" + i + "/";
                        });
    });
}

function RecentTakenCtrl($scope, $http, $routeParams) {
    $scope.skip = typeof($routeParams.skip) == "undefined" ? 1 : +$routeParams.skip;
    $http.get("_view/recent-taken?descending=true").success(function(data) {
        paginatedPhotos($scope, $http, _.pluck(data.rows, 'id'), 50,
                        function(i) {
                            return "#!/recent/" + i + "/";
                        });
    });
}

function UnprocessedCtrl($scope, $http, $routeParams) {
    $http.get('_view/tag?key="unprocessed"&include_docs=true&reduce=false&limit=50').success(function(data) {
        $scope.photos = _.pluck(data.rows, 'doc');
        _.each($scope.photos, function(x) { x.kwstring = x.keywords.join(" "); });
    });

    $scope.numChanges = 0;

    $scope.updateAll = function() {
        _.each($scope.photos, function(p) {
            if (p.changed) {
                $scope.update(p);
            }
        });
    };

    $scope.markChanged = function(photo) {
        if (!photo.changed) {
            photo.changed = true;
            $scope.numChanges++;
        }
    };

    $scope.update = function(photo) {
        $http.post("_update/photo/" + photo._id,
                   "cat=" + encodeURIComponent(photo.cat) +
                   "&descr=" + encodeURIComponent(photo.descr) +
                   "&taken=" + encodeURIComponent(photo.taken) +
                   "&keywords=" + encodeURIComponent(photo.kwstring),
                   {headers: {"Content-Type": "application/x-www-form-urlencoded"}}).
            success(function(e) {
                photo.changed = false;
                $scope.numChanges--;
            });
    };
}

function paginatedPhotos($scope, $http, found, pagesize, linkfun) {
    $scope.total = found.length;
    $scope.pages = [];
    for (var i = 1; i <= Math.ceil(found.length / pagesize); i++) {
        $scope.pages.push({'page': i,
                           'link': linkfun(i)});
    }
    var skip = ($scope.skip-1) * pagesize;
    var toget = _.first(_.tail(found, skip), pagesize);
    $http.post("../../_all_docs?include_docs=true",
               {"keys": toget}).success(function(data) {
                   $scope.photos = _.pluck(data.rows, 'doc');
                   $scope.pageNum = $scope.skip;
               });
}

function TagCtrl($scope, $http, $routeParams) {
    var tagNames = $routeParams.tag.split(/[+]/);
    $scope.skip = typeof($routeParams.skip) == "undefined" ? 1 : +$routeParams.skip;
    var pagesize = 50;
    var completed = 0;
    var found = [];
    var timestamps = {};
    var negatives = [];
    var foundOne = false;

    _.each(tagNames, function(tag) {
        var isNeg = false;
        if (tag[0] == '-') {
            isNeg = true;
            tag = tag.substr(1);
        }
        $http.get('_view/tag?reduce=false&key="' +
                  tag + '"').success(function(data) {
                      var ids = [];
                      _.each(data.rows, function(r) {
                          ids.push(r.id);
                          timestamps[r.id] = r.value;
                      });
                      if (isNeg) {
                          negatives = _.union(negatives, ids);
                      } else {
                          found = foundOne ? _.intersection(found, ids) : ids;
                          foundOne = true;
                      }
                      console.log("Found", ids.length, "for", tag,
                                  "now have", found.length);
                      completed++;
                      if (completed == tagNames.length) {
                          console.log("Excluding", negatives.length, "from", found.length);
                          found = _.difference(found, negatives);
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

function getLargeSrc(id, ext) {
    return "../../" + id + "/800x600." + ext;
}

function getPhotoLink(id) {
    return "#!/photo/" + id;
}

function imgCss(exif) {
    var rv = "";
    var rot = (exif && exif["Image Orientation"]) || "";
    if (rot.match(/90 CW/)) {
        rv = "rot90";
    }
    return rv;
}

function PhotoCtrl($scope, $http, $routeParams) {
    var id = $routeParams.id;
    console.log("Loading", id);
    $http.get("../../" + id).success(function(data) {
        $scope.photo = data;
        $scope.kwstring = data.keywords.join(" ");
        $scope.imageLink = getLargeSrc(id, data.extension);
        $scope.origLink = 'http://bleu.west.spy.net/s3sign/original/' +
            data._id.substr(0, 2) + '/' + data._id + '.' + data.extension;
    });

    $http.get('_view/comments?start_key=["' +
              id + '"]&end_key=["' + id + '",{}]').success(function(data) {
                  $scope.comments = _.pluck(data.rows, 'value');
              });

    $scope.update = function() {
        $http.post("_update/photo/" + id,
                   "cat=" + encodeURIComponent($scope.photo.cat) +
                   "&descr=" + encodeURIComponent($scope.photo.descr) +
                   "&taken=" + encodeURIComponent($scope.photo.taken) +
                   "&keywords=" + encodeURIComponent($scope.kwstring),
                   {headers: {"Content-Type": "application/x-www-form-urlencoded"}}).
            success(function(e) {
                $scope.photo.keywords = $scope.kwstring.split(/\s+/);
                $scope.editing = false;
            });

    };
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
