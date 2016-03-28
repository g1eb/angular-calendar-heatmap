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

        var days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        var gutter = 5;
        var circle_radius = 10;
        var label_padding = 40;
        var tooltip_width = 250;

        var svg = d3.select(element[0])
          .append('svg')
          .attr('class', 'svg');

        var labels = svg.append('g');

        scope.$watch(function () {
          return element[0].clientWidth;
        }, function ( width ) {
          if ( !width ) { return; }
          width = width < 1000 ? 1000 : width;
          circle_radius = Math.round((width / moment().weeksInYear() - gutter * 2) / 2);
          label_padding = circle_radius * 4;
          svg.attr('width', width)
            .attr('height', function () {
              return (label_padding + 7 * (circle_radius * 2 + gutter));
            });
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

          var tooltip = d3.select(element[0])
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .attr('width', tooltip_width);

          var dayCircles = svg.selectAll('.cell')
            .data(scope.data);

          dayCircles.enter().append('circle')
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
                .attr('r', circle_radius+1)
                .transition()
                .duration(500)
                .ease('ease-in')
                .attr('r', circle_radius)
                .each('end', repeat);
            })();
            tooltip.html(scope.tooltipHTMLForDate(d))
              .style('left', function () {
                if ( (parseInt(svg.attr('width')) - circle_xpos ) < tooltip_width ) {
                  return (circle_xpos - tooltip_width) + 'px';
                }
                return (circle_xpos + tooltip_width/2) + 'px';
              })
              .style('top', (circle_ypos + circle_radius*3 + label_padding) + 'px')
              .transition()
              .duration(250)
              .ease('ease-in')
              .style('opacity', 1);
          })
          .on('mouseout', function () {
            d3.select(this).transition().duration(250).ease('ease-in').attr('r', circle_radius);
            tooltip.transition()
              .duration(250)
              .ease('ease-in')
              .style('opacity', 0);
          });

          dayCircles.exit().remove();

          // Add month labels
          var now = moment().endOf('day').toDate();
          var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
          labels.selectAll('.label-month')
            .data(d3.time.months(moment(yearAgo).startOf('month').toDate(), now))
            .enter()
            .append('text')
            .attr('class', 'label label-month')
            .attr('font-size', function () {
              return Math.floor(parseInt(svg.attr('width')) / 100) + 'px';
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
