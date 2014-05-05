'use strict';
/* global d3 */

var ui = ui || { d3: {} };

/**
 * @constructor
 * @param scope
 * @param element
 * @param attrs
 */
ui.d3.RadialPlot = function(scope, element, attrs) {
  this.radius = parseInt(attrs.plotRadius) || 43;
  this.inner = parseInt(attrs.innerRadius) || 3;
  this.padding = parseInt(attrs.padding) || 7;
  this.pointRadius = parseFloat(attrs.pointRadius) || 1;
  this.editable = (attrs.editable === 'true') ? true : false;
  this.labelled = (attrs.labelled === 'true') ? true : false;
  this.animate = (attrs.animate === 'false') ? false : true;
  this.delayDuration =  parseInt(attrs.delayDuration)|| 1000;
  this.animateDuration = parseInt(attrs.animateDuration)|| 400;
  this.radians = 2 * Math.PI;
  this.draws = 0; 
  this.inDrag = false; 
  this.scaleType = attrs.scale || 'linear'; 
  this.increment = 20; 
  this.freeDraw = (attrs.free === 'true') || true;
  this.element = element[0];
};

ui.d3.RadialPlot.prototype.onDataLoaded_ = function(dsn, compare, scenes, scope) {
  if (typeof dsn === 'undefined' || this.inDrag) {
    return;
  }
  var dataset = this.convert(dsn),
      compare = this.convert(compare);

  this.origin = dataset.map(function(row) { return 0; });

  this.setScale(this.scaleType);
  this.setAngle(dataset.length);
  this.setLine();
  this.setIncrements();

  this.setElementClass('plot-radial-plot');
  this.clearElementContents();

  this.drawPlot();
  if (this.scaleType !== 'log') {
    this.addIncrementLabels();
  }
  this.drawAxes(dataset);

  if (typeof compare !== 'undefined') {
    var cvalues = this.map(compare, function(row) { return row.value; });
    this.drawArea(this.svg, cvalues, 'compare-area');
  }

  var sum = 0,
      values = this.map(dataset, function(row) { sum += row.value; return row.value; });
  this.areaCanvas = this.svg.append('g')
    .attr('class', 'area-g');
  this.area = this.drawArea(this.areaCanvas, values, this.check(sum) ? 'area' : 'area-invalid');

  this.drawInnerCircle();

  this.points = this.drawPoints(dataset, sum);

  if (this.labelled) {
    this.addLabels(dataset);
  }

  if (this.editable) {
    this.points.call(this.getDragBehaviour(scope));
  }

  if (this.draws++ === 0 && this.animate) {
    this.addSceneTransitions(scenes, this.area, this.points);
  } else {
    this.points.attr('r', this.pointRadius);
    this.area.attr('d', this.line);
  }  
};

ui.d3.RadialPlot.prototype.setElementClass = function(className) {
  d3.select(this.element[0]).attr('class', className);
};

ui.d3.RadialPlot.prototype.clearElementContents = function(className) {
  d3.select(this.element[0]).selectAll('*').remove();
}

ui.d3.RadialPlot.prototype.setScale = function(scale) {
  if (scale === 'log') {
      this.scale = d3.scale.log()
      .domain([1, 100])
      .range([this.inner, this.inner + this.radius]);
  } else {
      this.scale = d3.scale.linear()
      .domain([1, 100])
      .range([this.inner, this.inner + this.radius]);
  }
};

ui.d3.RadialPlot.prototype.setAngle = function(size) {
  this.angle = d3.scale.linear()
    .domain([0, size])
    .range([0, this.radians]);
};

ui.d3.RadialPlot.prototype.setLine = function() {
  this.line = d3.svg.line.radial()
    .interpolate('cardinal-closed')
    .radius(function(d) { return (d === 0) ? this.inner : this.scale(d); }.bind(this))
    .angle(function(d, i) { return this.angle(i); }.bind(this));
};

ui.d3.RadialPlot.prototype.setIncrements = function() {
  this.increments = d3.range(0, 101, this.increment);

  this.incrementArc = d3.svg.arc()
    .innerRadius(function(d) {
      d = d - this.increment;
      return (d < 0) ? 0 : (d === 0) ? this.inner : this.scale(d);
    }.bind(this))
    .outerRadius(function(d) {
      return (d === 0) ? this.inner: this.scale(d);
    }.bind(this))
    .startAngle(0) //converting from degs to radians
    .endAngle(this.radians); //just radians
}

ui.d3.RadialPlot.prototype.lineTween = function(start, end) {
  return function(d, i) {
    if (end === null || typeof end === 'undefined') {
      end = d;
    }
    var interpolate = d3.interpolateArray(start, end);
    return function(t) {
        return this.line(interpolate(t),i);
    }.bind(this);
  }.bind(this);
};

ui.d3.RadialPlot.prototype.drawAxes = function(dataset) {
  this.svg.selectAll('.axis')
    .data(dataset)
    .enter()
    .append('line')
    .attr('class', 'axis')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', function(d,i) {
       return (this.inner+this.radius) * Math.sin(this.angle(i));
    }.bind(this))
    .attr('y2', function(d,i) {
       return - (this.inner+this.radius) * Math.cos(this.angle(i));
    }.bind(this))
    .attr('transform', 'translate(' + (this.radius + this.padding) + ', ' + (this.radius + this.padding) + ')');
};

ui.d3.RadialPlot.prototype.drawPlot = function() {
  this.svg = d3.select(this.element).append('svg')
      .attr('viewBox', '0 0 100 100')
      .append('g');

  this.svg.append('circle')
    .attr('r', this.inner + this.radius)
    .attr('class','increment-a-outer')
    .attr('transform', 'translate(' + (this.radius + this.padding) + ', ' + (this.radius + this.padding) + ')');

  this.svg.selectAll('.increment')
    .data(this.increments)
    .enter()
    .append('path')
    .attr('class',function(d,i) { 
      if (i%2 === 0) {
          return 'increment-a';
      } else {
          return 'increment-b';
      }
    })
    .attr('d', this.incrementArc)
    .attr('transform', 'translate(' + (this.radius + this.padding) + ', ' + (this.radius + this.padding) + ')');
};

ui.d3.RadialPlot.prototype.addIncrementLabels = function() {
  if (this.scaleType !== 'log') {
    this.svg.selectAll('.increment-label')
      .data(this.increments)
      .enter()
      .append('text')
      .attr('class','increment-label')
      .attr('x', 5)
      .attr('y', function(d) { return - (this.scale(d) + (this.scale(20)/20)); }.bind(this))
      .text(function(d) {return d;})
      .attr('transform', 'translate(' + (this.radius + this.padding) + ', ' + (this.radius + this.padding) + ')');
  }
};

ui.d3.RadialPlot.prototype.drawInnerCircle = function() {
  this.svg.append('circle')
    .attr('r', this.inner-1)
    .attr('class','centre')
    .attr('transform', 'translate(' + (this.radius + this.padding) + ', ' + (this.radius + this.padding) + ')');
};

ui.d3.RadialPlot.prototype.drawArea = function(canvas, data, className) {
  return canvas.append('path').datum(data)
    .attr('d', this.line)
    .attr('class', className)
    .attr('transform', 'translate(' + (this.radius + this.padding) + ', ' + (this.radius + this.padding) + ')');
}

ui.d3.RadialPlot.prototype.drawPoints = function(dataset, sum) {
  var radius = this.radius,
      padding = this.padding,
      tooltipText = this.tooltipText,
      svg = this.svg,
      points = this.svg.selectAll('.point')
        .data(dataset)
        .enter()
        .append('circle')
        .attr('transform', 'translate(' + (this.radius + this.padding) + ', ' + (this.radius + this.padding) + ')')
        .on('mouseover', function (d) {
           var cx =  parseFloat(d3.select(this).attr('cx')),
               x =  cx - 15,
               y =  parseFloat(d3.select(this).attr('cy')),
               tooltipText = svg
                  .append('text')
                  .attr('class', 'tooltip-text')
                  .attr('transform', 'translate(' + (radius + padding) + ', ' + (radius + padding) + ')')
                  .attr('x', x + 2 ).attr('y', y - 4).text(d.name + ': ' + d.value + '%').style('opacity', 0);
           tooltipText.transition(200).style('opacity', 1); 
        })
        .on('mouseout', function(){
           svg.selectAll('.tooltip-box, .tooltip-text').remove();
        })
        .attr('class', this.check(sum) ? 'point' : 'point-invalid')
        .attr('r', 0)
        .attr('cx', function(d,i) {
           var x = (d.value === 0) ? this.inner : this.scale(d.value);
           return x * Math.sin(this.angle(i));
        }.bind(this))
        .attr('cy', function(d,i) {
           var x = (d.value === 0) ? this.inner : this.scale(d.value);
           return - x * Math.cos(this.angle(i));
        }.bind(this));
  return points;
};

ui.d3.RadialPlot.prototype.addLabels = function(dataset) {
  this.svg.selectAll('.label')
    .data(dataset)
    .enter()
    .append('text')
    .text(function(d,i){
      return d.name;
    })
    .attr('class','label')
    .attr('transform', function(d,i) { 
      var transform = this.radius + this.padding,
          x = (this.inner + this.radius+2) * Math.sin(this.angle(i-0.2)) + transform,
          y = (-(this.inner + this.radius+2) * Math.cos(this.angle(i-0.2))) + transform,
          rotation = this.angle(i) * (180/Math.PI);
      return 'translate('+x+','+y+') rotate(' + rotation + ')'; 
    }.bind(this));
}

ui.d3.RadialPlot.prototype.check = function(sum) {
  if(this.freeDraw) {
    return true;
  } else {
    return (sum === 100);
  }
};

ui.d3.RadialPlot.prototype.map = function(object, func) {
  var output = [];
  for(var x in object) {
    output.push(func(object[x]));
  }
  return output;
};

ui.d3.RadialPlot.prototype.convert = function(object) {
  if(object instanceof Array) {
    return object;
  }
  var dataset = [];
  for(var l in object) {
    dataset[object[l].id] = object[l];
  }
  return dataset;
};

ui.d3.RadialPlot.prototype.getDragBehaviour = function(scope) {
  var drag = d3.behavior.drag()
    .on('drag', function(d,i) {
      var realX = d3.event.x - (this.radius + this.padding),
          realY = d3.event.y - (this.radius + this.padding),
          r = Math.sqrt(Math.pow(realX,2) + Math.pow(realY,2)),// - inner;
          val = Math.floor(this.scale.invert(r)),
          ci = i, sum, values, draggedName, ext;
      
      for(var name in scope.dsn) {
        if (ci === scope.dsn[name].id) {
          scope.dsn[name].value = (val >100) ? 100 : (val < 0) ? 0: val;
          draggedName = name;
          break;
        }
      }
      
      scope.$apply(function() {
         scope.dsn = scope.dsn;
      });

      sum = 0;
      values = this.map(scope.dsn, function(row) { sum += row.value; return row.value; });
      ext = this.check(sum) ? '' : '-invalid';

      d3.select(this.element).selectAll('.area,.area-invalid').remove();
      this.areaCanvas.append('path').datum(values)
        .attr('class', 'area' + ext)
        .attr('transform', 'translate(' + (this.radius + this.padding) + ', ' + (this.radius + this.padding) + ')')
        .attr('d', this.line);
      d3.select(this)
        .attr('cx', function(d,i) {
          console.log(scope.dsn);
          console.log(draggedName);
          console.log(scope.dsn[draggedName]);
           var x = (d.value === 0) ? this.inner : this.scale(scope.dsn[draggedName].value);
           var cx = x * Math.sin(this.angle(scope.dsn[draggedName].id));
           return cx;
        }.bind(this))
        .attr('cy', function(d,i) {
           var x = (d.value === 0) ? this.inner : this.scale(scope.dsn[draggedName].value);
           var cy = - x * Math.cos(this.angle(scope.dsn[draggedName].id));
           return cy;
        }.bind(this));

      d3.select(this.element).selectAll('.point,.point-invalid').attr('class', 'point' + ext);
    }.bind(this));

  drag.on('dragstart', function() {
    this.inDrag = true;
  });
  drag.on('dragend', function() {
    this.inDrag = false;
  });

  return drag;
};

ui.d3.RadialPlot.prototype.addSceneTransitions = function(scenes, area, points) {
  var delay = 0,
      previous = this.origin;
    
  if(typeof scenes !== 'undefined') {
    scenes.forEach(function(scene) {
      var sum = 0;
      scene = this.map(scene, function(row) { sum += row.value; return row.value; });
      area.transition().ease('linear').delay(delay).duration(this.animateDuration).attrTween('d', this.lineTween(previous, scene));
      previous = scene;
      delay += this.animateDuration + this.delayDuration;
    }.bind(this));
  }
  area.transition().ease('linear').delay(delay).duration(this.animateDuration).attrTween('d', this.lineTween(previous));
  delay += this.animateDuration + this.delayDuration;

  points.transition()
   .delay(delay)
   .duration(50)
   .attr('r', this.pointRadius);
};

ui.radialplot = function() {
  function link(scope, element, attrs) {
    scope.$watch('dsn', function(dsn) {
      var radialPlot = new ui.d3.RadialPlot(scope, element, attrs);
      radialPlot.onDataLoaded_(dsn, scope.compare, scope.play, scope);
    }.bind(this), true);
  }

  return {
    restrict: 'E',
    scope: {
      dsn: '=',
      compare: '=',
      play: '='
    },
    link: link
  };
};

angular.module('ui.radialplot', [])
  .directive('radialPlot', ui.radialplot);