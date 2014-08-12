'use strict';

describe('a new RadialPlot object', function() {
    var elem = {};
    var radialPlot = new ui.d3.RadialPlot(elem);
    it('should have draws set to 0 on creation', function() {
        expect(radialPlot._draws).toBe(0);
    });

    it('should have radians set and equal to 2 * Math.PI', function() {
        expect(radialPlot._radians).toBe(2*Math.PI);
    });

    it('should have radians set and equal to 2 * Math.PI', function() {
        expect(radialPlot._element).toBe(elem);
    });

    it('should not be in drag mode', function() {
        expect(radialPlot._inDrag).toBe(false);
    });

    it('should have an increment set to 20', function() {
        expect(radialPlot._increment).toBe(20);
    });

    it('should have a plot radius of 43', function() {
        expect(radialPlot._plotRadius).toBe(43);
    });

    it('should have a inner radius of 3', function() {
        expect(radialPlot._innerRadius).toBe(3);
    });

    it('should have a point radius of 1', function() {
        expect(radialPlot._pointRadius).toBe(1);
    });

    it('should have a padding of 7', function() {
        expect(radialPlot._padding).toBe(7);
    });

    it('should have interpolation set to linear-closed', function() {
        expect(radialPlot._interpolation).toBe('linear-closed');
    });

    it('should have editable set to false', function() {
        expect(radialPlot._editable).toBe(false);
    });

    it('should have editable set to true', function() {
        expect(radialPlot._labelled).toBe(true);
    });

    it('should have animated set to true and have animate and delay durations set', function() {
        expect(radialPlot._animated).toBe(true);
        expect(radialPlot._animateDuration).toBe(400);
        expect(radialPlot._delayDuration).toBe(600);
    });

    it('should have scale of type linear', function() {
        expect(radialPlot._scaleType).toBe('linear');
    });

    it('should have freeDraw set to false', function() {
        expect(radialPlot._freeDraw).toBe(false);
    });
});

describe('RadialPlot element manipulation', function() {
    var elem = document.createElement('div');
    var radialPlot = new ui.d3.RadialPlot(elem);
    var data = [ 
        { id: 0 , name: "Analysing" , value: 30 },
        { id: 1 , name: "Designing" , value: 50 },
        { id: 2 , name: "Implementing" , value: 20 },
        { id: 3 , name: "Testing" , value: 15 },
        { id: 4 , name: "Reviewing" , value: 55 },
        { id: 5 , name: "Deploying" , value: 85 }
    ];
    it('should have a class assigned and have a child svg element', function() {
        radialPlot.onDataChanged(data);
        expect(elem.className).toBe('plot-radial-plot');
        expect(elem.firstChild.nodeName).toBe('svg');
    });

    it('should have an radial plot with 6 axes', function() {
        radialPlot.onDataChanged(data);
        var lines = elem.firstChild.getElementsByTagName('line');
        expect(lines.length).toBe(6);
    });

    it('should have an radial plot with 8 axes', function() {
        var data2 = [ 
            { id: 0 , name: "Analysing" , value: 30 },
            { id: 1 , name: "Designing" , value: 50 },
            { id: 2 , name: "Implementing" , value: 20 },
            { id: 3 , name: "Testing" , value: 15 },
            { id: 4 , name: "Reviewing" , value: 55 },
            { id: 5 , name: "Deploying" , value: 85 },
            { id: 6 , name: "Managing" , value: 85 },
            { id: 7 , name: "Learning" , value: 85 }
        ];
        radialPlot.onDataChanged(data2);
        var lines = elem.firstChild.getElementsByTagName('line');
        expect(lines.length).toBe(8);
    });

    it('should have 12 text elements', function() {
        radialPlot.onDataChanged(data);
        var text = elem.firstChild.getElementsByTagName('text');
        console.log(text);
        expect(text.length).toBe(12);
    });
});

