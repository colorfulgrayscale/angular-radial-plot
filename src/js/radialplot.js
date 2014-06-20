'use strict';
/* global d3 */

var ui = ui || { d3: {} };

/**
 * @constructor
 * @param {Element} element
 */
ui.d3.RadialPlot = function(element) {
  this._radians = 2 * Math.PI;
  this._draws = 0; 
  this._inDrag = false; 
  this._increment = 20; 
  this._element = element;
};

/**
 * Set the radius of the radial plot
 *
 * @param {Number} plotRadius
 */
ui.d3.RadialPlot.prototype.setPlotRadius = function(plotRadius) {
  this._plotRadius = plotRadius || 43;

  return this;
};

/**
 * Set the radius of the inner circle of the radial plot
 * 
 * @param {Number} innerRadius
 */
ui.d3.RadialPlot.prototype.setInnerRadius = function(innerRadius) {
  this._innerRadius = innerRadius || 3;

  return this;
};

/**
 * Set the radius of each point for each value for each dimension
 * 
 * @param {Number} pointRadius
 */
ui.d3.RadialPlot.prototype.setPointRadius = function(pointRadius) {
  this._pointRadius = pointRadius || 1;

  return this;
};

/**
 * Set the padding that surrounds the plot (Important to provide padding so that
 * label display does not overrun the canvas space available)
 * 
 * @param {Number} padding
 */
ui.d3.RadialPlot.prototype.setPadding = function(padding) {
  this._padding = padding || 7;

  return this;
};

ui.d3.RadialPlot.prototype.setInterpolation = function(interpolation) {
  this._interpolation = interpolation || 'linear-closed';

  return this;
}

/**
 * Set whether the plot is editable or not. Will enable the plot to be interactive
 * 
 * @param {Boolean} editable
 */
ui.d3.RadialPlot.prototype.setEditable = function(editable) {
  this._editable = editable || false;

  return this;
};

/**
 * Set whether to display labels or not
 * 
 * @param {Boolean} labelled
 */
ui.d3.RadialPlot.prototype.setLabelled = function(labelled) {
  this._labelled = labelled || true;

  return this;
};

/**
 * Set whether the plot is animated or not.
 * 
 * @param {Boolean} animated
 */
ui.d3.RadialPlot.prototype.setAnimated = function(animated) {
  this._animated = animated || true;

  return this;
};

/**
 * Set the time it takes for the tween to animate and the time the resulting shape
 * is displayed before the next set in the sequence is transitioned to
 * 
 * @param {Number} tweenTime
 * @param {Number} delayTime
 */
ui.d3.RadialPlot.prototype.setAnimationTimes = function(tweenTime, delayTime) {
  this._animateDuration = tweenTime || 400;
  this._delayDuration = delayTime || 1000;

  return this;
};

/**
 * Set what scale to use: currently either linear or logarithmic
 * 
 * @param {Boolean} scaleType
 */
ui.d3.RadialPlot.prototype.setScaleType = function(scaleType) {
  this._scaleType = scaleType || 'linear';

  return this;
};

/**
 * Set whether the plot is restricted to totalling 100 or not
 * 
 * @param {Boolean} freeDraw
 */
ui.d3.RadialPlot.prototype.setFreeDraw = function(freeDraw) {
  this._freeDraw = freeDraw;

  return this;
};


/**
 * When any underlying change to the data is made this method should be called
 * to update the radial plot
 *
 * @param {Array} dsn
 * @param {Array|null} compare
 * @param {Array|null} scenes
 * @param {Object} scope
 */
ui.d3.RadialPlot.prototype.onDataChanged = function(dsn, compare, scenes, scope) {
  if (typeof dsn === 'undefined' || this._inDrag) {
    return;
  }
  var dataset = this._convert(dsn),
      compare = this._convert(compare);

  this.origin = dataset.map(function(row) { return 0; });

  this._setScale(this._scaleType);
  this._setAngle(dataset.length);
  this._setLine();
  this._setIncrements();

  this._setElementClass('plot-radial-plot');
  this._clearElementContents();

  this._drawPlot();
  if (this._scaleType !== 'log') {
    this._addIncrementLabels();
  }
  this._drawAxes(dataset);

  if (typeof compare !== 'undefined') {
    var cvalues = this._map(compare, function(row) { return row.value; });
    this._drawArea(this.svg, cvalues, 'compare-area');
  }

  var sum = 0,
      values = this._map(dataset, function(row) { sum += row.value; return row.value; });
  this.areaCanvas = this.svg.append('g')
    .attr('class', 'area-g');
  this.area = this._drawArea(this.areaCanvas, values, this._checkTotal(sum) ? 'area' : 'area-invalid');

  this._drawInnerCircle();

  this.points = this._drawPoints(dataset, sum);

  if (this._labelled) {
    this._addLabels(dataset);
  }

  if (this._editable) {
    var drag = this._getDragBehaviour(scope);
    this.points.call(drag);
  }

  if (this._draws++ === 0 && this._animated) {
    this._addSceneTransitions(scenes, this.area, this.points);
  } else {
    this.points.attr('r', this._pointRadius);
    this.area.attr('d', this.line);
  }  
};

/** 
 * Private Methods for internal workings 
 */

//Todo: Re-architect, simplify

/**
 * @param {String} className
 */
ui.d3.RadialPlot.prototype._setElementClass = function(className) {
  d3.select(this._element).attr('class', className);
};

/**
 * 
 */
ui.d3.RadialPlot.prototype._clearElementContents = function() {
  d3.select(this._element).selectAll('*').remove();
}

ui.d3.RadialPlot.prototype._setScale = function(scale) {
  if (scale === 'log') {
      this._scale = d3.scale.log()
      .domain([1, 100])
      .range([this._innerRadius, this._innerRadius + this._plotRadius]);
  } else {
      this._scale = d3.scale.linear()
      .domain([1, 100])
      .range([this._innerRadius, this._innerRadius + this._plotRadius]);
  }
};

/**
 * Given the number of entries in the dataset set the angle generator function
 */
ui.d3.RadialPlot.prototype._setAngle = function(size) {
  this.angle = d3.scale.linear()
    .domain([0, size])
    .range([0, this._radians]);
};

ui.d3.RadialPlot.prototype._setLine = function() {
  this.line = d3.svg.line.radial()
    .interpolate(this._interpolation)
    .radius(function(d) { return (d === 0) ? this._innerRadius : this._scale(d); }.bind(this))
    .angle(function(d, i) { return this.angle(i); }.bind(this));
};

ui.d3.RadialPlot.prototype._setIncrements = function() {
  this._increments = d3.range(0, 101, this._increment);

  this._incrementArc = d3.svg.arc()
    .innerRadius(function(d) {
      d = d - this._increment;
      return (d < 0) ? 0 : (d === 0) ? this._innerRadius : this._scale(d);
    }.bind(this))
    .outerRadius(function(d) {
      return (d === 0) ? this._innerRadius: this._scale(d);
    }.bind(this))
    .startAngle(0) //converting from degs to radians
    .endAngle(this._radians); //just radians
}

ui.d3.RadialPlot.prototype._lineTween = function(start, end) {
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

ui.d3.RadialPlot.prototype._drawAxes = function(dataset) {
  this.svg.selectAll('.axis')
    .data(dataset)
    .enter()
    .append('line')
    .attr('class', 'axis')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', function(d,i) {
       return (this._innerRadius+this._plotRadius) * Math.sin(this.angle(i));
    }.bind(this))
    .attr('y2', function(d,i) {
       return - (this._innerRadius+this._plotRadius) * Math.cos(this.angle(i));
    }.bind(this))
    .attr('transform', 'translate(' + (this._plotRadius + this._padding) + ', ' + (this._plotRadius + this._padding) + ')');
};

ui.d3.RadialPlot.prototype._drawPlot = function() {
  this.svg = d3.select(this._element).append('svg')
      .attr('viewBox', '0 0 100 100')
      .append('g');

  this.svg.append('circle')
    .attr('r', this._innerRadius + this._plotRadius)
    .attr('class','increment-a-outer')
    .attr('transform', 'translate(' + (this._plotRadius + this._padding) + ', ' + (this._plotRadius + this._padding) + ')');

  this.svg.selectAll('.increment')
    .data(this._increments)
    .enter()
    .append('path')
    .attr('class',function(d,i) { 
      if (i%2 === 0) {
          return 'increment-a';
      } else {
          return 'increment-b';
      }
    })
    .attr('d', this._incrementArc)
    .attr('transform', 'translate(' + (this._plotRadius + this._padding) + ', ' + (this._plotRadius + this._padding) + ')');
};

ui.d3.RadialPlot.prototype._addIncrementLabels = function() {
  if (this._scaleType !== 'log') {
    this.svg.selectAll('.increment-label')
      .data(this._increments)
      .enter()
      .append('text')
      .attr('class','increment-label')
      .attr('x', 5)
      .attr('y', function(d) { return - (this._scale(d) + (this._scale(20)/20)); }.bind(this))
      .text(function(d) {return d;})
      .attr('transform', 'translate(' + (this._plotRadius + this._padding) + ', ' + (this._plotRadius + this._padding) + ')');
  }
};

ui.d3.RadialPlot.prototype._drawInnerCircle = function() {
  this.svg.append('circle')
    .attr('r', this._innerRadius-1)
    .attr('class','centre')
    .attr('transform', 'translate(' + (this._plotRadius + this._padding) + ', ' + (this._plotRadius + this._padding) + ')');
};

ui.d3.RadialPlot.prototype._drawArea = function(canvas, data, className) {
  return canvas.append('path').datum(data)
    .attr('d', this.line)
    .attr('class', className)
    .attr('transform', 'translate(' + (this._plotRadius + this._padding) + ', ' + (this._plotRadius + this._padding) + ')');
}

ui.d3.RadialPlot.prototype._drawPoints = function(dataset, sum) {
  var radius = this._plotRadius,
      padding = this._padding,
      tooltipText = this.tooltipText,
      svg = this.svg,
      points = this.svg.selectAll('.point')
        .data(dataset)
        .enter()
        .append('circle')
        .attr('transform', 'translate(' + (this._plotRadius + this._padding) + ', ' + (this._plotRadius + this._padding) + ')')
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
        .attr('class', this._checkTotal(sum) ? 'point' : 'point-invalid')
        .attr('r', 0)
        .attr('cx', function(d,i) {
           var x = (d.value === 0) ? this._innerRadius : this._scale(d.value);
           return x * Math.sin(this.angle(i));
        }.bind(this))
        .attr('cy', function(d,i) {
           var x = (d.value === 0) ? this._innerRadius : this._scale(d.value);
           return - x * Math.cos(this.angle(i));
        }.bind(this));
  return points;
};

ui.d3.RadialPlot.prototype._addLabels = function(dataset) {
  this.svg.selectAll('.label')
    .data(dataset)
    .enter()
    .append('text')
    .text(function(d,i){
      return d.name;
    })
    .attr('class','label')
    .attr('transform', function(d,i) { 
      var transform = this._plotRadius + this._padding,
          x = (this._innerRadius + this._plotRadius+2) * Math.sin(this.angle(i-0.2)) + transform,
          y = (-(this._innerRadius + this._plotRadius+2) * Math.cos(this.angle(i-0.2))) + transform,
          rotation = this.angle(i) * (180/Math.PI);
      return 'translate('+x+','+y+') rotate(' + rotation + ')'; 
    }.bind(this));
}

ui.d3.RadialPlot.prototype._checkTotal = function(sum) {
  if(this._freeDraw) {
    return true;
  } else {
    return (sum === 100);
  }
};

ui.d3.RadialPlot.prototype._map = function(object, func) {
  var output = [];
  for(var x in object) {
    output.push(func(object[x]));
  }
  return output;
};

ui.d3.RadialPlot.prototype._convert = function(object) {
  if(object instanceof Array) {
    return object;
  }
  var dataset = [];
  for(var l in object) {
    dataset[object[l].id] = object[l];
  }
  return dataset;
};

ui.d3.RadialPlot.prototype._getDragBehaviour = function(scope) {
  var that = this,
    drag = d3.behavior.drag()
    .on('drag', function(d,i) {
      var realX = d3.event.x - (that._plotRadius + that._padding),
          realY = d3.event.y - (that._plotRadius + that._padding),
          r = Math.sqrt(Math.pow(realX,2) + Math.pow(realY,2)),// - inner;
          val = Math.floor(that._scale.invert(r)),
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
      values = that._map(scope.dsn, function(row) { sum += row.value; return row.value; });
      ext = that._checkTotal(sum) ? '' : '-invalid';

      d3.select(that._element).selectAll('.area,.area-invalid').remove();
      that.areaCanvas.append('path').datum(values)
        .attr('class', 'area' + ext)
        .attr('transform', 'translate(' + (that._plotRadius + that._padding) + ', ' + (that._plotRadius + that._padding) + ')')
        .attr('d', that.line);
      d3.select(this)
        .attr('cx', function(d,i) {
           var x = (d.value === 0) ? that.inner : that._scale(scope.dsn[draggedName].value);
           var cx = x * Math.sin(that.angle(scope.dsn[draggedName].id));
           return cx;
        })
        .attr('cy', function(d,i) {
           var x = (d.value === 0) ? that.inner : that._scale(scope.dsn[draggedName].value);
           var cy = - x * Math.cos(that.angle(scope.dsn[draggedName].id));
           return cy;
        });

      d3.select(that._element).selectAll('.point,.point-invalid').attr('class', 'point' + ext);
    })
    .on('dragstart', function() {
      that._inDrag = true;
    })
    .on('dragend', function() {
      that._inDrag = false;
    });
  return drag;
};

ui.d3.RadialPlot.prototype._addSceneTransitions = function(scenes, area, points) {
  var delay = 0,
      previous = this.origin;
    
  if(typeof scenes !== 'undefined') {
    scenes.forEach(function(scene) {
      var sum = 0;
      scene = this._map(scene, function(row) { sum += row.value; return row.value; });
      area.transition().ease('linear').delay(delay).duration(this._animateDuration).attrTween('d', this._lineTween(previous, scene));
      previous = scene;
      delay += this._animateDuration + this._delayDuration;
    }.bind(this));
  }
  area.transition().ease('linear').delay(delay).duration(this._animateDuration).attrTween('d', this._lineTween(previous));
  delay += this._animateDuration + this._delayDuration;

  points.transition()
   .delay(delay)
   .duration(50)
   .attr('r', this._pointRadius);
};

/**
 * Create directive in namespace
 */
ui.radialplot = function() {
  function link(scope, element, attrs) {
    var radialPlot = new ui.d3.RadialPlot(element[0])
        .setPlotRadius(parseInt(attrs.plotRadius))
        .setInnerRadius(parseInt(attrs.innerRadius))
        .setPadding(parseInt(attrs.padding))
        .setPointRadius(parseFloat(attrs.pointRadius))
        .setInterpolation(attrs.interpolation)
        .setEditable((attrs.editable === 'true'))
        .setLabelled((attrs.labelled === 'true'))
        .setAnimated((attrs.animate === 'false')? false : true)
        .setAnimationTimes(parseInt(attrs.animateDuration), parseInt(attrs.delayDuration))
        .setScaleType(attrs.scale)
        .setFreeDraw((attrs.free === 'true'));

    // Watch statement that triggers redraw of content. 
    scope.$watch('dsn', function(dsn) {
      radialPlot.onDataChanged(dsn, scope.compare, scope.play, scope);
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

/**
 * Expose directive
 */
angular.module('ui.radialplot', [])
  .directive('radialPlot', ui.radialplot);