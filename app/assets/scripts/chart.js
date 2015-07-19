'use strict';

var config = require('./config');
var d3 = require('d3');
var _ = require('lodash');
var async = require('async');
var moment = require('moment');

var width;
var height = 400;
var margin = {top: 38, right: 28, bottom: 72, left: 84};
var aspectRatio = 2;
var svg;
var dataset = {};
var x;
var y;
var xAxis;
var yAxis;
var line;
var tip;

var handleResize = function () {
  // Clear anything in the svg element since we're going to rewrite
  d3.select('svg').remove();
  setupChart();
  createScales();
  createAxes();
  drawData();
};
window.addEventListener('resize', handleResize);

var createScales = function () {
  x = d3.time.scale.utc()
    .range([0, width]);

  y = d3.scale.linear()
    .range([height, 0]);

  // Get global extents
  // X Domain
  var xMin, xMax;
  xMin = xMax = dataset[d3.keys(dataset)[0]][0].date;
  _.forEach(dataset, function (location) {
    _.forEach(location, function (m) {
      if (m.date < xMin) {
        xMin = m.date;
      } else if (m.date > xMax) {
        xMax = m.date;
      }
    });
  });

  // Y Domain
  var yMin, yMax;
  yMin = yMax = dataset[d3.keys(dataset)[0]][0].value;
  _.forEach(dataset, function (location) {
    _.forEach(location, function (m) {
      if (m.value < yMin) {
        yMin = m.value;
      } else if (m.value > yMax) {
        yMax = m.value;
      }
    });
  });

  x.domain([xMin, xMax]);
  y.domain([yMin, yMax]);
};

var createAxes = function () {
  xAxis = d3.svg.axis()
    .scale(x)
    .orient('bottom');

  // Better ticks on resize
  if (width <= 300) {
    xAxis.ticks(3);
  } else if (width <= 600) {
    xAxis.ticks(6);
  }

  yAxis = d3.svg.axis()
    .scale(y)
    .orient('left');

  line = d3.svg.line()
    .x(function (d) { return x(d.date); })
    .y(function (d) { return y(d.value); });
};

var drawData = function () {
  svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')')
      .call(xAxis)
    .append('text')
      .attr('transform', 'translate(' + (width / 2) + ',' +
        (margin.bottom - 25) + ')')
      .style('text-anchor', 'middle')
      .text('Local Time');

  svg.append('g')
      .attr('class', 'y axis')
      .call(yAxis)
    .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left)
      .attr('x', -(height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('PM 2.5 (µg/m³)');

  // Legend
  d3.select('svg').selectAll('.circle-legend')
     .data([{country: 'china', y: 20}, {country: 'india', y: 40}])
     .enter()
     .append('circle')
     .attr('fill-opacity', '0')
     .attr('stroke', function (d) {
      return d.country === 'china' ? 'red' : 'orange';
     })
     .attr('cx', function (d) {
      return width + margin.left + margin.right - 70;
     })
     .attr('cy', function (d) { return d.y; })
     .attr('r', 6);

  d3.select('svg').selectAll('.circle-text')
    .data([{ text: 'Beijing', y: 20}, { text: 'Delhi', y: 40}])
    .enter()
    .append('text')
    .classed('circle-text', true)
    .attr('x', function(d) {
     return width + margin.left + margin.right - 60;
    })
    .attr('y', function(d) { return d.y + 6; })
    .attr('text-anchor','beginning')
    .style('fill','#777')
    .text(function(d){ return d.text; });

  // Plot it
  _.forEach(dataset, function (location) {
    // A bit of cheating for now to add color
    var country = 'india';
    if (location[0].location === 'Beijing US Embassy') {
      country = 'china';
    }

    // Lines
    svg.append('path')
        .datum(location)
        .attr('class', 'line ' + country)
        .attr('d', line);

    // Points
    svg.selectAll('.point ' + country)
          .data(location)
        .enter().append('svg:circle')
          .attr('cx', function (d) { return x(d.date); })
          .attr('cy', function (d) { return y(d.value); })
          .classed(country, true)
          .classed('point', true)
          .attr('r', 6)
          .on('mouseover', tip.show)
          .on('mouseout', tip.hide);
  });
};

var formatDataset = function () {
  // Convert to local time
  var dateForLocation = function (m) {
    var date = moment.utc(m.date);
    if (m.city === 'Beijing') {
      date = date.add(8, 'hour');
    } else if (m.city === 'Delhi') {
      date = date.add(5.5, 'hour');
    } else {
      console.error('invalid city');
    }

    return date;
  };

  // A bit of data formatting
  _.forEach(dataset, function (measurements) {
    _.forEach(measurements, function (m) {
      m.date = dateForLocation(m);
      m.value = +m.value;
    });
  });
};

var setupChart = function () {
  // For responsiveness
  width = d3.select('.chart').node().getBoundingClientRect().width;
  width = width - margin.left - margin.right;
  height = Math.round(width / aspectRatio);

  // Create SVG element
  svg = d3.select('.chart')
              .append('svg')
              .attr('width', width + margin.left + margin.right)
              .attr('height', height + margin.top + margin.bottom)
            .append('g')
              .attr('transform',
                    'translate(' + margin.left + ',' + margin.top + ')');

  // Set up tooltip
  tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function (d) {
      var html = '<p><strong>Date:</strong> ' + moment(d.date).format('Do MMM, YYYY, H:mm').toString() + '</p>' +
        '<p><strong>PM 2.5:</strong> ' + d.value + ' (µg/m³)</p>';
      return html;
    });
  svg.call(tip);
};

var init = function () {
  // Get data function
  var getData = function (location) {
    return function (done) {
      var url = config.baseURL + 'measurements?parameter=pm25&date_from=2015-07-17&date_to=2015-07-20&location=' + encodeURIComponent(location);
      d3.json(url, function (err, json) {
        if (err) {
          done(err);
        }
        dataset[location] = json.results;
        done(null);
      });
    };
  };

  async.parallel(
    [
      getData('Beijing US Embassy'),
      getData('Mandir Marg')
    ],
    function (err, results) {
      if (err) {
        return console.error(err);
      }

      // Plot everything
      setupChart();
      formatDataset();
      createScales();
      createAxes();
      drawData();
    });
};
init();
