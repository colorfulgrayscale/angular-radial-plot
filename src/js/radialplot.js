'use strict';

angular.module('ui.radialplot', [])
  .directive('radialPlot', function() {
    return {
      restrict: 'E',
      scope: {
        dsn: '=',
        compare: '=',
        play: '='
      },
      link: function(scope, element, attrs) {
        var radius = parseInt(attrs.plotRadius) || 43,
            inner = parseInt(attrs.innerRadius) || 3,
            padding = parseInt(attrs.padding) || 7,
            pointRadius = parseFloat(attrs.pointRadius) || 1,
            editable = (attrs.editable === 'true') ? true : false,
            labelled = (attrs.labelled === 'true') ? true : false,
            animate = (attrs.animate === 'false') ? false : true,
            delayDuration =  parseInt(attrs.delayDuration)|| 1000,
            animateDuration = parseInt(attrs.animateDuration)|| 400,
            radians = 2 * Math.PI,
            draws = 0, inDrag = false, points, area,
            tooltipBox, tooltipText, angle, svg, line, dimension, increments, lineTween, incrementArc,
            scaleType = attrs.scale || 'linear', scale, inverseScale, increment = 20, areaCanvas,
            check = function(sum) {
                if(attrs.free === 'true') {
                  return true;
                } else {
                  return (sum === 100);
                }
            },
            map = function(object, func) {
                var output = [];
                for(var x in object) {
                  output.push(func(object[x]));
                }
                return output;
            },
            convert = function(object) {
                if(object instanceof Array) {
                  return object;
                }
                var dataset = [];
                for(var l in object) {
                  dataset[object[l].id] = object[l];
                }
                return dataset;
            }

        var drag = d3.behavior.drag()
            .on("drag", function(d,i) {
              var realX = d3.event.x - (radius+padding),
                  realY = d3.event.y - (radius+padding),
                  r = Math.sqrt(Math.pow(realX,2) + Math.pow(realY,2)),// - inner;
                  val = Math.floor(scale.invert(r)),
                  ci = i, sum, values, dragged_name;
              
              for(var name in scope.dsn) {
                if (ci === scope.dsn[name].id) {
                  scope.dsn[name].value = (val >100) ? 100 : (val < 0) ? 0: val;
                  dragged_name = name;
                  break;
                }
              }
              
              scope.$apply(function() {
                 scope.dsn = scope.dsn;
              });
              sum = 0;
              values = map(scope.dsn, function(row) { sum += row.value; return row.value });
              var ext = check(sum) ? '' : '-invalid';
              d3.select(element[0]).selectAll('.area,.area-invalid').remove();
              areaCanvas.append("path").datum(values)
                .attr("class", 'area' + ext)
                .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")")
                .attr('d', line);
              d3.select(this)
                .attr('cx', function(d,i) {
                   var x = (d.value == 0) ? inner : scale(scope.dsn[dragged_name].value);
                   var cx = x * Math.sin(angle(scope.dsn[dragged_name].id));
                   return cx;
                })
               .attr('cy', function(d,i) {
                   var x = (d.value == 0) ? inner : scale(scope.dsn[dragged_name].value);
                   var cy = - x * Math.cos(angle(scope.dsn[dragged_name].id));
                   return cy;
               });
               d3.select(element[0]).selectAll('.point,.point-invalid').attr('class', 'point' + ext);
            });

            drag.on('dragstart', function() {
              inDrag = true;
            });
            drag.on('dragend', function() {
              inDrag = false;
            });




        scope.$watch('dsn', function(raw) {
          if (typeof raw == 'undefined' || inDrag) return;
          var dataset = convert(raw),
              compare = convert(scope.compare),

          origin = dataset.map(function(row) { return 0; });

          line = d3.svg.line.radial()
            .interpolate("cardinal-closed")
            .radius(function(d, i) { return (d === 0) ? inner : scale(d); })
            .angle(function(d, i) { return angle(i); });

          lineTween = function(start,end) {
            return function(d, i) {
              if (end === null || typeof end === 'undefined') end = d;
              var interpolate = d3.interpolateArray(start, end);
              return function(t) {
                  return line(interpolate(t),i);
              };
            };
          };

          if (scaleType == 'log') {
              scale = d3.scale.log()
              .domain([1, 100])
              .range([inner, inner+radius]);
          } else {
              scale = d3.scale.linear()
              .domain([1, 100])
              .range([inner, inner+radius]);
          }

          angle = d3.scale.linear()
              .domain([0, dataset.length])
              .range([0, radians]);

          dimension = (2 * radius) + (2 * padding),
            increments = d3.range(0,101,increment);

          incrementArc = d3.svg.arc()
            .innerRadius(function(d) {
              d = d - increment;
              return (d < 0) ? 0 : (d === 0) ? inner : scale(d);
            })
            .outerRadius(function(d) {
              return (d === 0) ? inner: scale(d);
            })
            .startAngle(0) //converting from degs to radians
            .endAngle(radians); //just radians

          d3.select(element[0]).attr("class", "plot-radial-plot");

          d3.select(element[0]).selectAll('*').remove();

          svg = d3.select(element[0]).append("svg")
              .attr("viewBox", "0 0 100 100")
              .append("g");

          svg.append("circle")
             .attr('r', inner+radius)
             .attr('class','increment-a-outer')
             .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")");

          svg.selectAll('.increment')
              .data(increments)
              .enter()
              .append('path')
              .attr('class',function(d,i) { 
                if (i%2==0) {
                    return 'increment-a';
                } else {
                    return 'increment-b';
                }
              })
              .attr('d', incrementArc)
              .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")");

          if (scaleType != 'log') {
            svg.selectAll('.increment-label')
               .data(increments)
               .enter()
               .append('text')
               .attr('class','increment-label')
               .attr('x', 5)
               .attr('y', function(d) { return - (scale(d) + (scale(20)/20)); })
            .text(function(d) {return d;})
               .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")");
          }
             
          svg.selectAll('.axis')
             .data(dataset)
             .enter()
             .append('line')
             .attr('class', 'axis')
             .attr('x1', 0)
             .attr('y1', 0)
             .attr('x2', function(d,i) {
                 return (inner+radius) * Math.sin(angle(i));
              })
             .attr('y2', function(d,i) {
                 return - (inner+radius) * Math.cos(angle(i));
              })
             .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")");

          if (typeof compare !== 'undefined') {
            var cvalues = map(compare, function(row) { sum += row.value; return row.value });
            svg.append("path").datum(cvalues)
              .attr('d', line)
              .attr("class", 'compare-area')
              .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")");
          }

          var sum = 0;
          var values = map(dataset, function(row) { sum += row.value; return row.value });
          areaCanvas = svg.append('g').
            attr('class', 'area-g');
          area = areaCanvas.append("path").datum(values)
              .attr("class", check(sum) ? 'area' : 'area-invalid')
              .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")");

          svg.append('circle')
             .attr('r', inner-1)
             .attr('class','centre')
             .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")");

          points = svg.selectAll('.point')
             .data(dataset)
             .enter()
             .append('circle')
             .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")")
             .on('mouseover', function (d) {
                 var cx =  parseFloat(d3.select(this).attr('cx')),
                     x =  cx - 15,
                     y =  parseFloat(d3.select(this).attr('cy')),
                     tooltipText = svg
                        .append('text')
                        .attr('class', 'tooltip-text')
                        .attr("transform", "translate(" + (radius + padding) + ", " + (radius + padding) + ")")
                        .attr('x', x + 2 ).attr('y', y - 4).text(d.name + ': ' + d.value + '%').style('opacity', 0);
                 tooltipText.transition(200).style('opacity', 1); 
             })
             .on('mouseout', function(){
                 svg.selectAll('.tooltip-box, .tooltip-text').remove();
             })
             .attr('class', check(sum) ? 'point' : 'point-invalid')
             .attr('r', 0)
             .attr('cx', function(d,i) {
                 var x = (d.value == 0) ? inner : scale(d.value);
                 return x * Math.sin(angle(i));
             })
             .attr('cy', function(d,i) {
                 var x = (d.value == 0) ? inner : scale(d.value);
                 return - x * Math.cos(angle(i));
             });

            if (labelled) {
              svg.selectAll('.label')
                .data(dataset)
                .enter()
                .append('text')
                .text(function(d,i){
                  return d.name;
                })
                .attr('class','label')
                .attr('transform', function(d,i) { 
                  var transform = radius + padding,
                      x = (inner+radius+2) * Math.sin(angle(i-.2)) + transform,
                      y = (-(inner+radius+2) * Math.cos(angle(i-.2))) + transform,
                      rotation = angle(i) * (180/Math.PI);
                  return "translate("+x+","+y+") rotate(" + rotation + ")"; 
                });
            }

            if (editable) {
              points.call(drag);
            }

            if (draws++ === 0 && animate) {
              var delay = 0,
                previous = origin;
              
              if(typeof scope.play !== 'undefined') {
                scope.play.forEach(function(scene) {
                  scene = map(scene, function(row) { sum += row.value; return row.value });
                  area.transition().ease("linear").delay(delay).duration(animateDuration).attrTween("d", lineTween(previous, scene));
                  previous = scene;
                  delay += animateDuration + delayDuration;
                });
              }
              area.transition().ease("linear").delay(delay).duration(animateDuration).attrTween("d", lineTween(previous));
              delay += animateDuration + delayDuration;

              points.transition()
               .delay(delay)
               .duration(50)
               .attr('r', pointRadius);
            } else {
                points.attr('r', pointRadius);
                area.attr('d', line);
            }  
        }, true); 
      }
    };
  });