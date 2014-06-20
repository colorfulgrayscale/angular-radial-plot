'use strict';

describe('RadialPlot', function() {
    it('should have draws set to 0 on creation', function() {
        var radialPlot = new ui.d3.RadialPlot({});
        expect(radialPlot._draws).toBe(0);
    });

    it('should have radians set and equal to 2 * Math.PI', function() {
        var elem = {};
        var radialPlot = new ui.d3.RadialPlot(elem);
        expect(radialPlot._radians).toBe(2*Math.PI);
    });

    it('should have radians set and equal to 2 * Math.PI', function() {
        var elem = {};
        var radialPlot = new ui.d3.RadialPlot(elem);
        expect(radialPlot._element).toBe(elem);
    });
});

