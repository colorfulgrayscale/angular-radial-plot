Angular.js Radial Plot Directive
================================

I think radial plots are cool. I also think Angular.js and d3.js are cool, so I decided to create an Angular.js directive for creating customisable radial plots... and here it is! :)

I welcome any contributions. Please feel free to fork and improve.

Setup Examples
--------------

`git clone https://github.com/GordyD/radialplot.git`
`cd radialplot`
`npm install`
`bower install`
`node app.js`

Go to 'http://localhost:3000/example.html' to see example radial plots.

Usage
-----

In order to use in your project you will need to:

1. include radialplot.js as one of your source files e.g `<script src="src/radialplot.js">`
2. include ui.radialplot as a dependency of your Angular app e.g. `var app = angular.module('radialPlotExampleApp', ['ui.radialplot']);

Features
--------

- Plot a 1-n dimension radial plot
- Labelling 
- Linear or logarithic scaling
- Interactive - can be used as an input device
- Overlay comparison plot on graph
- Animate between different sets of values
- Styleable
 
Planned Improvements
--------------------

- Unit tests 
- Improve interactive mode on mobile
