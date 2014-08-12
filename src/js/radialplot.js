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
  this._plotRadius = 43;
  this._innerRadius = 3;
  this._pointRadius = 1;
  this._overPointRadius = 2;
  this._padding = 7;
  this._interpolation = 'linear-closed';
  this._editable = false;
  this._labelled = true;
  this._tooltips = true;
  this._animated = true;
  this._animateDuration = 400;
  this._animateEasing = "linear";
  this._delayDuration = 600;
  this._scaleType = 'linear';
  this._freeDraw = false;
  this._tendToZero = 0.0001;
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
 * Set the radius of each point when hovered over
 * 
 * @param {Number} overPointRadius
 */
ui.d3.RadialPlot.prototype.setOverPointRadius = function(overPointRadius) {
  this._overPointRadius = overPointRadius || 2;

  return this;
};

/**
 * Set the radius of each point when hovered over
 * 
 * @param {Number} tooltips
 */
ui.d3.RadialPlot.prototype.setTooltips = function(tooltips) {
  this._tooltips = tooltips || true;

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
  this._delayDuration = delayTime || 600;

  return this;
};

/**
 * Set the animation easing type for when the drawing of a shape is animated
 * 
 * @param {Number} tooltips
 */
ui.d3.RadialPlot.prototype.setAnimateEasing = function(animateEasing) {
  this._animateEasing = animateEasing|| 'linear';

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
  this._freeDraw = freeDraw || false;

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
  var that = this,
      dataset = this._convert(dsn),
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
    var cvalues = this._map(compare, function(row) {
        var val = ui.d3.RadialPlot.toFloat(row.value, 1); 
        return (val > 100) ? 100 : (val <= 0) ? that._tendToZero: val;
      });
    this._drawArea(this.svg, cvalues, 'compare-area');
  }

  var sum = 0,
      values = this._map(dataset, function(row) {
        var val = ui.d3.RadialPlot.toFloat(row.value, 1); 
        return (val > 100) ? 100 : (val <= 0) ? that._tendToZero: val;
      });

  for (var x in dataset) {
    sum += dataset[x].value;
  }

  this.areaCanvas = this.svg.append('g')
    .attr('class', 'area-g');
  this.area = this._drawArea(this.areaCanvas, values, this._checkTotal(sum) ? 'area' : 'area-invalid');

  this._drawInnerCircle();

  this.points = this._drawPoints(dataset, sum);

  if (this._labelled) {
    this._addLabels(dataset);
  }

  if (this._editable) {
    console.log('is Editable');
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

ui.d3.RadialPlot.toInteger = function(x) {
  var y = parseInt(x, 10);
  if (isNaN(y)) {
    console.log(x + ' could not be converted to an integer.');
    return 0;
  }
  return y;
};

ui.d3.RadialPlot.toFloat = function(x, precision) {
  var y = parseFloat(x);
  if (isNaN(y)) {
    console.log(x + ' could not be converted to a float.');
    y = 0.0;
  }
  return y.toFixed(precision);
};

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
      var one = this._plotRadius/100*2;
      this._scale = d3.scale.log()
      .domain([this._tendToZero, 1, 100])
      .range([this._innerRadius, this._innerRadius + one, this._innerRadius + this._plotRadius]);
  } else {
      this._scale = d3.scale.linear()
      .domain([this._tendToZero, 100])
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
  var that = this;
  this.line = d3.svg.line.radial()
    .interpolate(this._interpolation)
    .radius(function(d) { return (d === 0) ? that._innerRadius : that._scale(d); })
    .angle(function(d, i) { return that.angle(i); });
};

ui.d3.RadialPlot.prototype._setIncrements = function() {
  var that = this;
  this._increments = d3.range(0, 101, this._increment);

  this._incrementArc = d3.svg.arc()
    .innerRadius(function(d) {
      d = d - that._increment;
      return (d < 0) ? 0 : (d === 0) ? that._innerRadius : that._scale(d);
    })
    .outerRadius(function(d) {
      return (d === 0) ? that._innerRadius: that._scale(d);
    })
    .startAngle(0) //converting from degs to radians
    .endAngle(this._radians); //just radians
}

ui.d3.RadialPlot.prototype._lineTween = function(start, end) {
  var that = this;
  return function(d, i) {
    if (end === null || typeof end === 'undefined') {
      end = d;
    }
    var interpolate = d3.interpolateArray(start, end);
    return function(t) {
        return that.line(interpolate(t),i);
    };
  };
};

ui.d3.RadialPlot.prototype._drawAxes = function(dataset) {
  var that = this;
  this.svg.selectAll('.axis')
    .data(dataset)
    .enter()
    .append('line')
    .attr('class', 'axis')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', function(d,i) {
       return (that._innerRadius+that._plotRadius) * Math.sin(that.angle(i));
    })
    .attr('y2', function(d,i) {
       return - (that._innerRadius+that._plotRadius) * Math.cos(that.angle(i));
    })
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
  var that = this;
  if (this._scaleType !== 'log') {
    this.svg.selectAll('.increment-label')
      .data(this._increments)
      .enter()
      .append('text')
      .attr('class','increment-label')
      .attr('x', 5)
      .attr('y', function(d) { return - (that._scale(d) + (that._scale(20)/20)); })
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
  var svg = this.svg,
      that = this,
      points = this.svg.selectAll('.point')
        .data(dataset)
        .enter()
        .append('circle')
        .attr('transform', 'translate(' + (that._plotRadius + that._padding) + ', ' + (that._plotRadius + that._padding) + ')')
        .on('mouseover', function (d) {
          if (that._editable) {
            d3.select(this).attr('r', that._overPointRadius);
          }
          if (that._tooltips) {
            var cx =  ui.d3.RadialPlot.toFloat(d3.select(this).attr('cx')),
                x =  cx - 15,
                y =  ui.d3.RadialPlot.toFloat(d3.select(this).attr('cy')),
                tooltipText = svg
                  .append('text')
                  .attr('class', 'tooltip-text')
                  .attr('transform', 'translate(' + (that._plotRadius + that._padding) + ', ' + (that._plotRadius + that._padding) + ')')
                  .attr('x', x + 2 ).attr('y', y - 4).text(d.name + ': ' + ui.d3.RadialPlot.toFloat(d.value,1) + '%').style('opacity', 0);
            tooltipText.transition(200).style('opacity', 1); 
          }
          })
        .on('mouseout', function(){
          if (!that._inDrag) {
            d3.select(this).attr('r', that._pointRadius);
          }
          svg.selectAll('.tooltip-box, .tooltip-text').remove();
        })
        .attr('class', that._checkTotal(sum) ? 'point' : 'point-invalid')
        .attr('r', 0)
        .attr('cx', function(d,i) {
           var x = (ui.d3.RadialPlot.toFloat(d.value,1) <= that._tendToZero) ? that._innerRadius : that._scale(d.value);
           return x * Math.sin(that.angle(i));
        })
        .attr('cy', function(d,i) {
           var x = (ui.d3.RadialPlot.toFloat(d.value,1) <= that._tendToZero) ? that._innerRadius : that._scale(d.value);
           return - x * Math.cos(that.angle(i));
        });
  return points;
};

ui.d3.RadialPlot.prototype._addLabels = function(dataset) {
  var that = this;
  this.svg.selectAll('.label')
    .data(dataset)
    .enter()
    .append('text')
    .text(function(d,i){
      return d.name;
    })
    .attr('class','label')
    .attr('transform', function(d,i) { 
      var transform = that._plotRadius + that._padding,
          x = (that._innerRadius + that._plotRadius+2) * Math.sin(that.angle(i-0.2)) + transform,
          y = (-(that._innerRadius + that._plotRadius+2) * Math.cos(that.angle(i-0.2))) + transform,
          rotation = that.angle(i) * (180/Math.PI);
      return 'translate('+x+','+y+') rotate(' + rotation + ')'; 
    });
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
          scope.dsn[name].value = (val > 100) ? 100 : (val <= 0) ? that._tendToZero: val;
          draggedName = name;
          break;
        }
      }
      
      scope.$apply(function() {
         scope.dsn = scope.dsn;
      });

      sum = 0;
      values = that._map(scope.dsn,function(row) {
        var val = ui.d3.RadialPlot.toFloat(row.value, 1); 
        return (val > 100) ? 100 : (val <= 0) ? that._tendToZero: val;
      });
      ext = that._checkTotal(sum) ? '' : '-invalid';

      d3.select(that._element).selectAll('.area,.area-invalid').remove();
      that.areaCanvas.append('path').datum(values)
        .attr('class', 'area' + ext)
        .attr('transform', 'translate(' + (that._plotRadius + that._padding) + ', ' + (that._plotRadius + that._padding) + ')')
        .attr('d', that.line);
      d3.select(this)
        .attr('cx', function(d,i) {
           var x = (d.value <= that._tendToZero) ? that._innerRadius : that._scale(scope.dsn[draggedName].value);
           var cx = x * Math.sin(that.angle(scope.dsn[draggedName].id));
           return cx;
        })
        .attr('cy', function(d,i) {
           var x = (d.value <= that._tendToZero) ? that._innerRadius : that._scale(scope.dsn[draggedName].value);
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
      d3.select(that._element).selectAll('.point,.point-invalid').attr('r', that._pointRadius);
    });
  return drag;
};

ui.d3.RadialPlot.prototype._addSceneTransitions = function(scenes, area, points) {
  var that = this,
      delay = 0,
      previous = this.origin;
    
  if(typeof scenes !== 'undefined') {
    scenes.forEach(function(scene) {
      scene = that._map(scene, function(row) {
        var val = ui.d3.RadialPlot.toFloat(row.value, 1); 
        return (val > 100) ? 100 : (val <= 0) ? that._tendToZero: val;
      });
      area.transition().ease(that._animateEasing).delay(delay).duration(that._animateDuration).attrTween('d', that._lineTween(previous, scene));
      previous = scene;
      delay += that._animateDuration + that._delayDuration;
    });
  }
  area.transition().ease(this._animateEasing).delay(delay).duration(this._animateDuration).attrTween('d', this._lineTween(previous));
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
        .setPlotRadius(ui.d3.RadialPlot.toInteger(attrs.plotRadius))
        .setInnerRadius(ui.d3.RadialPlot.toInteger(attrs.innerRadius))
        .setPadding(ui.d3.RadialPlot.toInteger(attrs.padding))
        .setPointRadius(ui.d3.RadialPlot.toInteger(attrs.pointRadius))
        .setOverPointRadius(ui.d3.RadialPlot.toInteger(attrs.overPointRadius))
        .setInterpolation(attrs.interpolation)
        .setEditable((attrs.editable === 'true'))
        .setTooltips((attrs.tooltips === 'true'))
        .setLabelled((attrs.labelled === 'true'))
        .setAnimated((attrs.animate === 'false')? false : true)
        .setAnimateEasing(attrs.animateEasing)
        .setAnimationTimes(ui.d3.RadialPlot.toInteger(attrs.animateDuration), ui.d3.RadialPlot.toInteger(attrs.delayDuration))
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