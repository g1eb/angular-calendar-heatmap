'use strict';

/* globals d3 */

angular.module('g1b.calendar-heatmap', []).
    directive('calendarHeatmap', function () {

    var DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    var GUTTER = 3;
    var CIRCLE_RADIUS = 10;
    var TOOLTIP_WIDTH = 250;
    var MONTH_LABEL_PADDING = 40;

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

        scope.$watch('data', function(data) {
          if ( !data ) { return; }
          scope.drawChart(data);
        });

        scope.drawChart = function (data) {
          var firstDate = moment(data[0].date);
          var max = d3.max(data, function (d) {
            return d.total;
          });

          var color = d3.scale.linear()
            .range(['#ffffff', scope.color || '#ff4500'])
            .domain([0, max]);

          var svg = d3.select(element[0])
            .append('svg')
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .attr('viewBox', '0 0 1280 200')
            .attr('class', 'svg');

          var tooltip = d3.select(element[0])
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .attr('width', TOOLTIP_WIDTH);

          var dayCircles = svg.selectAll('.cell')
            .data(data);

          dayCircles.enter().append('circle')
            .attr('class', 'circle')
            .attr('opacity', 0)
            .attr('r', function (d) {
              return CIRCLE_RADIUS * 0.75 + (CIRCLE_RADIUS * d.total / max) * 0.25;
            })
            .attr('fill', function (d) {
              return color(d.total);
            })
            .attr('cx', function (d) {
              var cellDate = moment(d.date);
              var result = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
              return result * (CIRCLE_RADIUS * 2 + GUTTER) + MONTH_LABEL_PADDING;
            })
            .attr('cy', function (d) {
              return moment(d.date).weekday() * (CIRCLE_RADIUS * 2 + GUTTER) + MONTH_LABEL_PADDING;
            });

          // Animate circles on show
          dayCircles.transition()
            .delay(function(d, i) {
              return Math.cos( Math.PI * Math.random() ) * 1000;
            })
            .duration(500)
            .ease('ease-in')
            .attr('opacity', 1);

          dayCircles.on('click', function (d) {
            if ( scope.handler ) { scope.handler(d); }
          });

          dayCircles.on('mouseover', function (d) {
            var circle = d3.select(this);
            var circle_xpos = parseInt(circle.attr('cx'));
            var circle_ypos = parseInt(circle.attr('cy'));
            (function repeat() {
              circle = circle.transition()
                .duration(500)
                .ease('ease-in')
                .attr('r', CIRCLE_RADIUS+1)
                .transition()
                .duration(500)
                .ease('ease-in')
                .attr('r', CIRCLE_RADIUS)
                .each('end', repeat);
            })();
            tooltip.html(scope.tooltipHTMLForDate(d))
              .style('left', function () {
                if ( (parseInt(svg.style('width')) - circle_xpos ) < TOOLTIP_WIDTH ) {
                  return (circle_xpos - TOOLTIP_WIDTH) + 'px';
                }
                return (circle_xpos + TOOLTIP_WIDTH/2) + 'px';
              })
              .style('top', (circle_ypos + CIRCLE_RADIUS*3 + MONTH_LABEL_PADDING) + 'px')
              .transition()
              .duration(250)
              .ease('ease-in')
              .style('opacity', 1);
          })
          .on('mouseout', function () {
            d3.select(this).transition().duration(250).ease('ease-in').attr('r', CIRCLE_RADIUS);
            tooltip.transition()
              .duration(250)
              .ease('ease-in')
              .style('opacity', 0);
          });

          dayCircles.exit().remove();

          // Add month labels
          var now = moment().endOf('day').toDate();
          var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
          svg.selectAll('label')
            .data(d3.time.months(moment(yearAgo).startOf('month').toDate(), now))
            .enter().append('text')
            .attr('class', 'label')
            .attr('font-size', function () {
              return Math.floor(parseInt(svg.attr('width')) / 100) + 'px';
            })
            .text(function (d) {
              return d.toLocaleDateString('en-us', {month: 'short'});
            })
            .attr('x', function (d, i) {
              return i * ((CIRCLE_RADIUS * 2 + GUTTER) * 30 / 7) + MONTH_LABEL_PADDING / 3;
            })
            .attr('y', MONTH_LABEL_PADDING / 2);

          // Add day labels
          svg.selectAll('label')
            .data(DAYS)
            .enter().append('text')
            .attr('class', 'label')
            .attr('x', MONTH_LABEL_PADDING / 3)
            .attr('y', function (d, i) {
              return i * (CIRCLE_RADIUS * 2 + GUTTER) + MONTH_LABEL_PADDING;
            })
            .style('text-anchor', 'middle')
            .attr('font-size', function () {
              return Math.floor(parseInt(svg.attr('width')) / 100) + 'px';
            })
            .attr('dy', function () {
              return Math.floor(parseInt(svg.attr('width')) / 100) / 3;
            })
            .text(function (d) {
              return d;
            });
        };

        /**
         * Helper function to build html for the tooltip
         * @param d Object
         */
        scope.tooltipHTMLForDate = function (d) {
          var dateStr = moment(d.date).format('dddd, MMM Do YYYY');
          var html = '<span><strong>' + (d.total ? scope.formatTime(d.total) : 'No time') + ' tracked' + '</strong><br/> on ' + dateStr + '</span>';
          if ( d.details.length > 0 ) {
            html += '<ul>';
            for ( var i = 0; i < d.details.length; i++ ) {
              html += '<li><strong>' + d.details[i].name + '</strong>' + scope.formatTime(d.details[i].value) + '</li>';
            }
            html += '</ul>';
          }
          return html;
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
});
