'use strict';

/* globals d3 */

angular.module('g1b.calendar-heatmap', []).
    directive('calendarHeatmap', ['$window', function ($window) {

    return {
      restrict: 'E',
      scope: {
        data: '=',
        color: '=',
        handler: '='
      },
      replace: true,
      template: '<div class="calendar-heatmap"></div>',
      link: function (scope, element) {

        // Defaults
        var gutter = 5;
        var width = 1000;
        var height = 200;
        var circle_radius = 10;
        var label_padding = 40;
        var selected_date;

        // Tooltip defaults
        var tooltip_width = 250;
        var tooltip_padding = 15;
        var tooltip_line_height = 15;

        // Initialize svg element
        var svg = d3.select(element[0])
          .append('svg')
          .attr('class', 'svg');

        // Initialize main svg elements
        var labels = svg.append('g');
        var items = svg.append('g');
        var tooltip = svg.append('g')
          .attr('opacity', 0)
          .attr('class', 'heatmap-tooltip');

        scope.$watch(function () {
          return element[0].clientWidth;
        }, function ( w ) {
          if ( !w ) { return; }
          width = w < 1000 ? 1000 : w;
          circle_radius = (((width - gutter) / (moment().weeksInYear() + 2)) - gutter) / 2;
          label_padding = circle_radius * 4;
          height = label_padding + 7 * (circle_radius * 2 + gutter);
          svg.attr({'width': width, 'height': height});
          scope.drawChart();
        });

        angular.element($window).bind('resize', function () {
          scope.$apply();
        });

        // Watch for data availability
        scope.$watch('data', function (data) {
          if ( !data ) { return; }
          scope.drawChart();
        });


        /**
         * Draw the chart based on the current overview type
         */
        scope.drawChart = function () {
          if ( !scope.data ) { return; }

          if ( !!selected_date ) {
            scope.drawDayOverview();
          } else {
            scope.drawYearOverview();
          }
        };


        /**
         * Draw year overview
         */
        scope.drawYearOverview = function () {
          var firstDate = moment(scope.data[0].date);
          var max_value = d3.max(scope.data, function (d) {
            return d.total;
          });
          var color = d3.scale.linear()
            .range(['#ffffff', scope.color || '#ff4500'])
            .domain([0, max_value]);

          items.selectAll('.item-circle').remove();
          items.selectAll('.item-circle')
            .data(scope.data)
            .enter()
            .append('circle')
            .attr('class', 'item item-circle')
            .attr('opacity', 0)
            .attr('r', function (d) {
              if ( max_value <= 0 ) { return circle_radius; }
              return circle_radius * 0.75 + (circle_radius * d.total / max_value) * 0.25;
            })
            .attr('fill', function (d) {
              return color(d.total);
            })
            .attr('cx', function (d) {
              var cellDate = moment(d.date);
              var week_num = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
              return week_num * (circle_radius * 2 + gutter) + label_padding;
            })
            .attr('cy', function (d) {
              return moment(d.date).weekday() * (circle_radius * 2 + gutter) + label_padding;
            })
            .on('click', function (d) {
              // Set selected day to the one clicked on
              selected_date = d;

              // Remove year overview
              items.selectAll('circle').remove();
              tooltip.selectAll('text').remove();
              tooltip.selectAll('rect').remove();
              labels.selectAll('.label-month').remove();
              labels.selectAll('.label-day').remove();

              // Redraw the chart
              scope.drawChart();
            })
            .on('mouseover', function (d) {
              // Pulsating animation
              var circle = d3.select(this);
              (function repeat() {
                circle = circle.transition()
                  .duration(500)
                  .ease('ease-in')
                  .attr('r', circle_radius+1)
                  .transition()
                  .duration(500)
                  .ease('ease-in')
                  .attr('r', circle_radius)
                  .each('end', repeat);
              })();

              // Construct tooltip
              var tooltip_height = tooltip_padding * 4 + tooltip_line_height * d.summary.length;
              tooltip.selectAll('text').remove();
              tooltip.selectAll('rect').remove();
              tooltip.insert('rect')
                .attr('class', 'heatmap-tooltip-background')
                .attr('width', tooltip_width)
                .attr('height', tooltip_height);
              tooltip.append('text')
                .attr('font-weight', 900)
                .attr('x', tooltip_padding)
                .attr('y', tooltip_padding * 1.5)
                .text((d.total ? scope.formatTime(d.total) : 'No time') + ' tracked');
              tooltip.append('text')
                .attr('x', tooltip_padding)
                .attr('y', tooltip_padding * 2.5)
                .text('on ' + moment(d.date).format('dddd, MMM Do YYYY'));

              // Add summary to the tooltip
              angular.forEach(d.summary, function (d, i) {
                tooltip.append('text')
                  .attr('font-weight', 900)
                  .attr('x', tooltip_padding)
                  .attr('y', tooltip_line_height * 4 + i * tooltip_line_height)
                  .text(d.name)
                  .each(function () {
                    var obj = d3.select(this),
                      textLength = obj.node().getComputedTextLength(),
                      text = obj.text();
                    while (textLength > (tooltip_width / 2 - tooltip_padding) && text.length > 0) {
                      text = text.slice(0, -1);
                      obj.text(text + '...');
                      textLength = obj.node().getComputedTextLength();
                    }
                  });
                tooltip.append('text')
                  .attr('x', tooltip_width / 2 + tooltip_padding / 2)
                  .attr('y', tooltip_line_height * 4 + i * tooltip_line_height)
                  .text(scope.formatTime(d.value));
              });

              var cellDate = moment(d.date);
              var week_num = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
              var x = week_num * (circle_radius * 2 + gutter) + label_padding + circle_radius;
              while ( width - x < (tooltip_width + tooltip_padding * 3) ) {
                x -= 10;
              }
              var y = cellDate.weekday() * (circle_radius * 2 + gutter) + label_padding + circle_radius;
              while ( height - y < tooltip_height && y > label_padding/2 ) {
                y -= 10;
              }
              tooltip.attr('transform', 'translate(' + x + ',' + y + ')');
              tooltip.transition()
                .duration(250)
                .ease('ease-in')
                .attr('opacity', 1);
            })
            .on('mouseout', function () {
              // Set circle radius back to what it's supposed to be
              d3.select(this).transition()
                .duration(250)
                .ease('ease-in')
                .attr('r', circle_radius);

              // Hide tooltip
              tooltip.transition()
                .duration(250)
                .ease('ease-in')
                .attr('opacity', 0);
            })
            .transition()
              .delay( function () {
                return Math.cos( Math.PI * Math.random() ) * 1000;
              })
              .duration(500)
              .ease('ease-in')
              .attr('opacity', 1);

          // Add month labels
          var today = moment().endOf('day');
          var todayYearAgo = moment().startOf('day').subtract(1, 'year');
          var monthLabels = d3.time.months(todayYearAgo.startOf('month'), today);
          var monthLabelOffset = (width - label_padding * 2) / 12 / 2;
          var monthAxis = d3.scale.linear()
            .range([label_padding, width])
            .domain([0, monthLabels.length]);
          labels.selectAll('.label-month').remove();
          labels.selectAll('.label-month')
            .data(monthLabels)
            .enter()
            .append('text')
            .attr('class', 'label label-month')
            .attr('font-size', function () {
              return Math.floor(label_padding / 3) + 'px';
            })
            .text(function (d) {
              return d.toLocaleDateString('en-us', {month: 'short'});
            })
            .attr('x', function (d, i) {
              return monthLabelOffset + monthAxis(i);
            })
            .attr('y', label_padding / 2)
            .on('mouseenter', function (d) {
              var selectedMonth = moment(d);
              items.selectAll('.item-circle')
                .transition()
                .duration(500)
                .ease('ease-in')
                .attr('opacity', function (d) {
                  return moment(d.date).isSame(selectedMonth, 'month') ? 1 : 0.1;
                });
            })
            .on('mouseout', function () {
              items.selectAll('.item-circle')
                .transition()
                .duration(500)
                .ease('ease-in')
                .attr('opacity', 1);
            });

          // Add day labels
          var dayLabels = d3.time.days(moment().startOf('week'), moment().endOf('week'));
          var dayAxis = d3.scale.linear()
            .range([label_padding, height])
            .domain([0, dayLabels.length]);
          labels.selectAll('.label-day').remove();
          labels.selectAll('.label-day')
            .data(dayLabels)
            .enter()
            .append('text')
            .attr('class', 'label label-day')
            .attr('x', label_padding / 3)
            .attr('y', function (d, i) {
              return dayAxis(i);
            })
            .style('text-anchor', 'middle')
            .attr('font-size', function () {
              return Math.floor(label_padding / 3) + 'px';
            })
            .attr('dy', function () {
              return Math.floor(width / 100) / 3;
            })
            .text(function (d) {
              return moment(d).format('dddd')[0];
            })
            .on('mouseenter', function (d) {
              var selectedDay = moment(d);
              items.selectAll('.item-circle')
                .transition()
                .duration(500)
                .ease('ease-in')
                .attr('opacity', function (d) {
                  return (moment(d.date).day() === selectedDay.day()) ? 1 : 0.1;
                });
            })
            .on('mouseout', function () {
              items.selectAll('.item-circle')
                .transition()
                .duration(500)
                .ease('ease-in')
                .attr('opacity', 1);
            });
        };


        /**
         * Draw day overview
         */
        scope.drawDayOverview = function () {
          var projectLabels = selected_date.summary.map(function (project) {
            return project.name;
          });
          var projectScale = d3.scale.ordinal()
            .domain(projectLabels)
            .rangeRoundBands([label_padding, height], 0.1);

          var seconds = d3.time.seconds(moment().startOf('day'), moment().endOf('day'));
          var itemScale = d3.time.scale()
            .range([label_padding*2, width])
            .domain([moment(selected_date.date).startOf('day'), moment(selected_date.date).endOf('day')]);
          items.selectAll('.item-block').remove();
          items.selectAll('.item-block')
            .data(selected_date.details)
            .enter()
            .append('rect')
            .attr('class', 'item item-block')
            .attr('x', function (d) {
              return itemScale(d.date);
            })
            .attr('y', function (d) {
              return projectScale(d.name) - 10;
            })
            .attr('width', function (d) {
              return d.value * 100 / (60 * 60 * 24);
            })
            .attr('height', function (d) {
              return projectScale.rangeBand();
            })
            .attr('fill', function (d) {
              return scope.color || '#ff4500';
            })
            .attr('opacity', 0)
            .on('click', function (d) {
              if ( scope.handler ) {
                scope.handler(d);
              }
            })
            .transition()
              .delay( function () {
                return Math.cos( Math.PI * Math.random() ) * 1000;
              })
              .duration(500)
              .ease('ease-in')
              .attr('opacity', 0.5);

          // Add time labels
          var timeLabels = d3.time.hours(moment().startOf('day'), moment().endOf('day'));
          var timeAxis = d3.time.scale()
            .range([label_padding*2, width])
            .domain([0, timeLabels.length]);
          labels.selectAll('.label-time').remove();
          labels.selectAll('.label-time')
            .data(timeLabels)
            .enter()
            .append('text')
            .attr('class', 'label label-time')
            .attr('font-size', function () {
              return Math.floor(label_padding / 3) + 'px';
            })
            .text(function (d) {
              return moment(d).format('HH:mm');
            })
            .attr('x', function (d, i) {
              return timeAxis(i);
            })
            .attr('y', label_padding / 2);

          // Add project labels
          labels.selectAll('.label-project').remove();
          labels.selectAll('.label-project')
            .data(projectLabels)
            .enter()
            .append('text')
            .attr('class', 'label label-project')
            .attr('x', label_padding / 3)
            .attr('y', function (d) {
              return projectScale(d);
            })
            .attr('min-height', function (d) {
              return projectScale.rangeBand();
            })
            .style('text-anchor', 'left')
            .attr('font-size', function () {
              return Math.floor(label_padding / 3) + 'px';
            })
            .attr('dy', function () {
              return Math.floor(width / 100) / 3;
            })
            .text(function (d) {
              return d;
            })
            .on('mouseenter', function (project) {
              items.selectAll('.item-block')
                .transition()
                .duration(500)
                .ease('ease-in')
                .attr('opacity', function (d) {
                  return (d.name === project) ? 1 : 0.1;
                });
            })
            .on('mouseout', function () {
              items.selectAll('.item-block')
                .transition()
                .duration(500)
                .ease('ease-in')
                .attr('opacity', 0.5);
            });
        };


        /**
         * Helper function to convert seconds to a human readable format
         * @param seconds Integer
         */
        scope.formatTime = function (seconds) {
          var sec_num = parseInt(seconds, 10);
          var hours = Math.floor(sec_num / 3600);
          var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
          var time = '';
          if ( hours > 0 ) {
            time += hours === 1 ? '1 hour ' : hours + ' hours ';
          }
          if ( minutes > 0 ) {
            time += minutes === 1 ? '1 minute' : minutes + ' minutes';
          }
          if ( hours === 0 && minutes === 0 ) {
            time = seconds + ' seconds';
          }
          return time;
        };
      }
    };
}]);
