'use strict';

/* globals d3 */

angular.module('g1b.calendar-heatmap', []).
    directive('calendarHeatmap', function () {

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
        var days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        var gutter = 5;
        var width = 1000;
        var height = 200;
        var circle_radius = 10;
        var label_padding = 40;
        var tooltip_width = 250;

        var svg = d3.select(element[0])
          .append('svg')
          .attr('class', 'svg');

        var labels = svg.append('g');
        var circles = svg.append('g');

        var tooltip = svg.append('g')
          .attr('opacity', 0)
          .attr('x', -500)
          .attr('y', -500)
          .attr('class', 'tooltip');

        scope.$watch(function () {
          return element[0].clientWidth;
        }, function ( w ) {
          if ( !w ) { return; }
          width = w < 1000 ? 1000 : w;
          circle_radius = Math.round((width / moment().weeksInYear() - gutter * 2) / 2);
          label_padding = circle_radius * 4;
          height = label_padding + 7 * (circle_radius * 2 + gutter);
          svg.attr({'width': width, 'height': height});
          scope.drawChart();
        });

        scope.$watch('data', scope.drawChart);

        scope.drawChart = function () {
          if ( !scope.data ) { return; }

          var firstDate = moment(scope.data[0].date);
          var max = d3.max(scope.data, function (d) {
            return d.total;
          });

          var color = d3.scale.linear()
            .range(['#ffffff', scope.color || '#ff4500'])
            .domain([0, max]);

          circles.selectAll('circle').remove();
          circles.selectAll('circle')
            .data(scope.data)
            .enter()
            .append('circle')
            .attr('class', 'circle')
            .attr('opacity', 0)
            .attr('r', function (d) {
              return circle_radius * 0.75 + (circle_radius * d.total / max) * 0.25;
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
              if ( scope.handler ) { scope.handler(d); }
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
              tooltip.selectAll('text').remove();
              tooltip.selectAll('rect').remove();
              tooltip.insert('rect')
                .attr('class', 'tooltip-background')
                .attr('width', 250)
                .attr('height', 60 + 15 * d.details.length);
              tooltip.append('text')
                .attr('class', 'tooltip-title')
                .attr('font-weight', 900)
                .attr('x', 15)
                .attr('y', 20)
                .text((d.total ? scope.formatTime(d.total) : 'No time') + ' tracked');
              tooltip.append('text')
                .attr('class', 'tooltip-date')
                .attr('x', 15)
                .attr('y', 35)
                .text('on ' + moment(d.date).format('dddd, MMM Do YYYY'));

              // Add details to the tooltip
              for ( var i = 0; i < d.details.length; i++ ) {
                tooltip.append('text')
                  .attr('class', 'tooltip-detail-name')
                  .attr('font-weight', 900)
                  .attr('x', 15)
                  .attr('y', 60 + i * 15)
                  .text(d.details[i].name)
                  .each(function () {
                    var self = d3.select(this),
                      textLength = self.node().getComputedTextLength(),
                      text = self.text();
                    while (textLength > (125 - 2 * 10) && text.length > 0) {
                      text = text.slice(0, -1);
                      self.text(text + '...');
                      textLength = self.node().getComputedTextLength();
                    }
                  });
                tooltip.append('text')
                  .attr('class', 'tooltip-detail-value')
                  .attr('x', 130)
                  .attr('y', 60 + i * 15)
                  .text(scope.formatTime(d.details[i].value));
              }

              var cellDate = moment(d.date);
              var week_num = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
              var x = week_num * (circle_radius * 2 + gutter) + label_padding + circle_radius;
              while ( width - x < 300 ) {
                x -= 10;
              }
              var y = cellDate.weekday() * (circle_radius * 2 + gutter) + label_padding + circle_radius;
              while ( height - y < (90 + d.details.length * 15 ) ) {
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
          var now = moment().endOf('day').toDate();
          var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
          labels.selectAll('.label-month')
            .data(d3.time.months(moment(yearAgo).startOf('month').toDate(), now))
            .enter()
            .append('text')
            .attr('class', 'label label-month')
            .attr('font-size', function () {
              return Math.floor(width / 100) + 'px';
            })
            .text(function (d) {
              return d.toLocaleDateString('en-us', {month: 'short'});
            })
            .attr('x', function (d, i) {
              return i * ((circle_radius * 2 + gutter) * 30 / 7) + label_padding / 3;
            })
            .attr('y', label_padding / 2);

          // Add day labels
          labels.selectAll('.label-day')
            .data(days)
            .enter()
            .append('text')
            .attr('class', 'label label-day')
            .attr('x', label_padding / 3)
            .attr('y', function (d, i) {
              return i * (circle_radius * 2 + gutter) + label_padding;
            })
            .style('text-anchor', 'middle')
            .attr('font-size', function () {
              return Math.floor(width / 100) + 'px';
            })
            .attr('dy', function () {
              return Math.floor(width / 100) / 3;
            })
            .text(function (d) {
              return d;
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
});
