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
        var max_block_height = 25;
        var transition_duration = 500;
        var in_transition = false;
        var selected_date;

        // Tooltip defaults
        var tooltip_width = 250;
        var tooltip_padding = 15;

        // Initialize svg element
        var svg = d3.select(element[0])
          .append('svg')
          .attr('class', 'svg');

        // Initialize main svg elements
        var items = svg.append('g');
        var labels = svg.append('g');
        var buttons = svg.append('g');

        // Add tooltip to the same element as main svg
        var tooltip = d3.select(element[0]).append('div')
          .attr('class', 'heatmap-tooltip')
          .style('opacity', 0);

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

          // Get daily summary if that was not provided
          if ( !data[0].summary ) {
            data.map(function (d) {
              var summary = d.details.reduce( function(uniques, project) {
                if ( !uniques[project.name] ) {
                  uniques[project.name] = {
                    'value': project.value
                  };
                } else {
                  uniques[project.name].value += project.value;
                }
                return uniques;
              }, {});
              var unsorted_summary = Object.keys(summary).map(function (key) {
                return {
                  'name': key,
                  'value': summary[key].value
                };
              });
              d.summary = unsorted_summary.sort(function (a, b) {
                return b.value - a.value;
              });
              return d;
            });
          }

          // Draw the chart
          scope.drawChart();
        });


        /**
         * Draw the chart based on the current overview type
         */
        scope.drawChart = function () {
          if ( !scope.data ) { return; }

          if ( !!selected_date && !!selected_date.total ) {
            scope.drawDayOverview();
          } else if ( !!selected_date ) {
            scope.drawMonthOverview();
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
            .domain([-0.15 * max_value, max_value]);

          items.selectAll('.item-circle').remove();
          items.selectAll('.item-circle')
            .data(scope.data)
            .enter()
            .append('circle')
            .attr('class', 'item item-circle')
            .style('opacity', 0)
            .attr('r', function (d) {
              if ( max_value <= 0 ) { return circle_radius; }
              return circle_radius * 0.75 + (circle_radius * d.total / max_value) * 0.25;
            })
            .attr('fill', function (d) {
              return ( d.total > 0 ) ? color(d.total) : 'transparent';
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
              if ( in_transition ) { return; }

              // Don't transition if there is no data to show
              if ( d.total === 0 ) { return; }

              in_transition = true;

              // Set selected date to the one clicked on
              selected_date = d;

              // Hide tooltip
              scope.hideTooltip();

              // Remove all year overview related items and labels
              scope.removeYearOverview();

              // Redraw the chart
              scope.drawChart();
            })
            .on('mouseover', function (d) {
              if ( in_transition ) { return; }

              // Pulsating animation
              var circle = d3.select(this);
              (function repeat() {
                circle = circle.transition()
                  .duration(transition_duration)
                  .ease('ease-in')
                  .attr('r', circle_radius+1)
                  .transition()
                  .duration(transition_duration)
                  .ease('ease-in')
                  .attr('r', circle_radius)
                  .each('end', repeat);
              })();

              // Construct tooltip
              var tooltip_html = '';
              tooltip_html += '<div class="header"><strong>' + (d.total ? scope.formatTime(d.total) : 'No time') + ' tracked</strong></div>';
              tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY') + '</div><br>';

              // Add summary to the tooltip
              angular.forEach(d.summary, function (d) {
                tooltip_html += '<div><span><strong>' + d.name + '</strong></span>';
                tooltip_html += '<span>' + scope.formatTime(d.value) + '</span></div>';
              });

              // Calculate tooltip position
              var cellDate = moment(d.date);
              var week_num = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
              var x = week_num * (circle_radius * 2 + gutter) + label_padding + circle_radius;
              if ( width - x < (tooltip_width + tooltip_padding * 3) ) {
                x -= tooltip_width + tooltip_padding * 3;
              }
              var y = cellDate.weekday() * (circle_radius * 2 + gutter) + label_padding + circle_radius;

              // Show tooltip
              tooltip.html(tooltip_html)
                .style('left', x + 'px')
                .style('top', y + 'px')
                .transition()
                  .duration(transition_duration / 2)
                  .ease('ease-in')
                  .style('opacity', 1);
            })
            .on('mouseout', function () {
              if ( in_transition ) { return; }

              // Set circle radius back to what it's supposed to be
              d3.select(this).transition()
                .duration(transition_duration / 2)
                .ease('ease-in')
                .attr('r', circle_radius);

              // Hide tooltip
              scope.hideTooltip();
            })
            .transition()
              .delay( function () {
                return ( in_transition ) ? transition_duration / 2 : 0;
              })
              .duration(function () {
                return Math.cos( Math.PI * Math.random() ) * transition_duration * 2;
              })
              .ease('ease-in')
              .style('opacity', 1)
              .call(function (transition, callback) {
                if ( transition.empty() ) {
                  callback();
                }
                var n = 0;
                transition
                  .each(function() { ++n; })
                  .each('end', function() {
                    if ( !--n ) {
                      callback.apply(this, arguments);
                    }
                  });
                }, function() {
                  in_transition = false;
                });

          // Add month labels
          var today = moment().endOf('day');
          var todayYearAgo = moment().startOf('day').subtract(1, 'year');
          var monthLabels = d3.time.months(todayYearAgo.startOf('month'), today);
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
              return monthAxis(i);
            })
            .attr('y', label_padding / 2)
            .on('mouseenter', function (d) {
              if ( in_transition ) { return; }

              var selectedMonth = moment(d);
              items.selectAll('.item-circle')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', function (d) {
                  return moment(d.date).isSame(selectedMonth, 'month') ? 1 : 0.1;
                });
            })
            .on('mouseout', function () {
              if ( in_transition ) { return; }

              items.selectAll('.item-circle')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', 1);
            })
            .on('click', function (d) {
              if ( in_transition ) { return; }

              in_transition = true;

              // Set selected month to the one clicked on
              selected_date = d;

              // Hide tooltip
              scope.hideTooltip();

              // Remove all year overview related items and labels
              scope.removeYearOverview();

              // Redraw the chart
              scope.drawChart();
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
              if ( in_transition ) { return; }

              var selectedDay = moment(d);
              items.selectAll('.item-circle')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', function (d) {
                  return (moment(d.date).day() === selectedDay.day()) ? 1 : 0.1;
                });
            })
            .on('mouseout', function () {
              if ( in_transition ) { return; }

              items.selectAll('.item-circle')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', 1);
            });
        };


        /**
         * Draw month overview
         */
        scope.drawMonthOverview = function () {
          // Define beginning and end of the month
          var start_of_month = moment(selected_date).startOf('month');
          var end_of_month = moment(selected_date).endOf('month');

          // Filter data down to the selected month
          var month_data = scope.data.filter(function (d) {
            return start_of_month <= moment(d.date) && moment(d.date) < end_of_month;
          });

          // Define day labels and axis
          var dayLabels = d3.time.days(moment().startOf('week'), moment().endOf('week'));
          var dayAxis = d3.scale.ordinal()
            .rangeRoundBands([label_padding, height], 0.1)
            .domain(dayLabels.map(function (d) {
              return moment(d).weekday();
            }));

          // Define week labels and axis
          var weekLabels = [start_of_month.week()];
          while ( start_of_month.week() !== end_of_month.week() ) {
            weekLabels.push(start_of_month.add(1, 'week').week());
          }

          // Add month data items to the overview
          var weekScale = d3.scale.ordinal()
            .rangeRoundBands([label_padding, width], 0.1)
            .domain(weekLabels);

          items.selectAll('.item-block-g').remove();
          var item_block = items.selectAll('.item-block-g')
            .data(month_data)
            .enter()
            .append('g')
            .attr('class', 'item item-block-g')
            .attr('width', function () {
              return (width - label_padding) / weekLabels.length - gutter * 5;
            })
            .attr('height', function () {
              return Math.min(dayAxis.rangeBand(), max_block_height);
            })
            .attr('transform', function (d) {
              return 'translate(' + weekScale(moment(d.date).week()) + ',' + (dayAxis(moment(d.date).weekday()) - 10) + ')';
            })
            .attr('total', function (d) {
              return d.total;
            })
            .attr('max', function (d) {
              return d3.max(d.summary, function (d) {
                return d.value;
              });
            })
            .attr('date', function (d) {
              return d.date;
            })
            .attr('offset', 0)
            .on('click', function (d) {
              if ( in_transition ) { return; }

              // Don't transition if there is no data to show
              if ( d.total === 0 ) { return; }

              in_transition = true;

              // Set selected date to the one clicked on
              selected_date = d;

              // Hide tooltip
              scope.hideTooltip();

              // Remove all month overview related items and labels
              scope.removeMonthOverview();

              // Redraw the chart
              scope.drawChart();
            });

          var item_width = (width - label_padding) / weekLabels.length - gutter * 5;
          var itemScale = d3.scale.linear()
            .range([0, item_width]);

          item_block.selectAll('.item-block-rect')
            .data(function (d) {
              return d.summary;
            })
            .enter()
            .append('rect')
            .attr('class', 'item item-block-rect')
            .attr('x', function (d) {
              var total = parseInt(d3.select(this.parentNode).attr('total'));
              var offset = parseInt(d3.select(this.parentNode).attr('offset'));
              var item_width = d.value * ((width - label_padding) / weekLabels.length - gutter * 5) / total;
              d3.select(this.parentNode).attr('offset', offset + item_width);
              return offset;
            })
            .attr('width', function (d) {
              var total = parseInt(d3.select(this.parentNode).attr('total'));
              itemScale.domain([0, total]);
              return itemScale(d.value);
            })
            .attr('height', function () {
              return Math.min(dayAxis.rangeBand(), max_block_height);
            })
            .attr('fill', function (d) {
              var max = parseInt(d3.select(this.parentNode).attr('max'));
              var color = d3.scale.linear()
                .range(['#ffffff', scope.color || '#ff4500'])
                .domain([-0.15 * max, max]);
              return color(d.value) || '#ff4500';
            })
            .style('opacity', 0)
            .on('mouseover', function(d) {
              if ( in_transition ) { return; }

              // Construct tooltip
              var tooltip_html = '';
              tooltip_html += '<div class="header"><strong>' + d.name + '</strong></div><br>';
              tooltip_html += '<div><strong>' + (d.value ? scope.formatTime(d.value) : 'No time') + ' tracked</strong></div>';
              tooltip_html += '<div>on ' + moment(d.value).format('dddd, MMM Do YYYY') + '</div>';

              // Calculate tooltip position
              var date = new Date(d3.select(this.parentNode).attr('date'));
              var x = weekScale(moment(date).week()) + tooltip_padding * 3;
              while ( width - x < (tooltip_width + tooltip_padding * 3) ) {
                x -= 10;
              }
              var y = dayAxis(moment(date).weekday()) + tooltip_padding;

              // Show tooltip
              tooltip.html(tooltip_html)
                .style('left', x + 'px')
                .style('top', y + 'px')
                .transition()
                  .duration(transition_duration / 2)
                  .ease('ease-in')
                  .style('opacity', 1);
            })
            .on('mouseout', function () {
              if ( in_transition ) { return; }
              scope.hideTooltip();
            })
            .transition()
              .delay(function () {
                return ( in_transition ) ? transition_duration / 2: 0;
              })
              .duration(function () {
                return Math.cos( Math.PI * Math.random() ) * transition_duration * 2;
              })
              .ease('ease-in')
              .style('opacity', 0.75)
              .call(function (transition, callback) {
                if ( transition.empty() ) {
                  callback();
                }
                var n = 0;
                transition
                  .each(function() { ++n; })
                  .each('end', function() {
                    if ( !--n ) {
                      callback.apply(this, arguments);
                    }
                  });
                }, function() {
                  in_transition = false;
                });

          // Add day labels
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
              if ( in_transition ) { return; }

              var selectedDay = moment(d);
              items.selectAll('.item-block')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', function (d) {
                  return (moment(d.date).day() === selectedDay.day()) ? 1 : 0.1;
                });
            })
            .on('mouseout', function () {
              if ( in_transition ) { return; }

              items.selectAll('.item-block')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', 1);
            });

          // Add week labels
          labels.selectAll('.label-week').remove();
          labels.selectAll('.label-week')
            .data(weekLabels)
            .enter()
            .append('text')
            .attr('class', 'label label-week')
            .attr('font-size', function () {
              return Math.floor(label_padding / 3) + 'px';
            })
            .text(function (week_nr) {
              return 'Week ' + week_nr;
            })
            .attr('x', function (d) {
              return weekScale(d);
            })
            .attr('y', label_padding / 2)
            .on('mouseenter', function (week_nr) {
              if ( in_transition ) { return; }

              items.selectAll('.item-block')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', function (d) {
                  return ( moment(d.date).week() === week_nr ) ? 1 : 0.1;
                });
            })
            .on('mouseout', function () {
              if ( in_transition ) { return; }

              items.selectAll('.item-block')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', 0.5);
            });

          // Add button to switch back to year overview
          scope.drawButton();
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
              return itemScale(moment(d.date));
            })
            .attr('y', function (d) {
              return projectScale(d.name) - 10;
            })
            .attr('width', function (d) {
              var end = itemScale(d3.time.second.offset(moment(d.date), d.value));
              return end - itemScale(moment(d.date));
            })
            .attr('height', function () {
              return Math.min(projectScale.rangeBand(), max_block_height);
            })
            .attr('fill', function () {
              return scope.color || '#ff4500';
            })
            .style('opacity', 0)
            .on('mouseover', function(d) {
              if ( in_transition ) { return; }

              // Construct tooltip
              var tooltip_html = '';
              tooltip_html += '<div class="header"><strong>' + d.name + '</strong><div><br>';
              tooltip_html += '<div><strong>' + (d.value ? scope.formatTime(d.value) : 'No time') + ' tracked</strong></div>';
              tooltip_html += '<div>on ' + moment(d.date).format('dddd, MMM Do YYYY HH:mm') + '</div>';

              // Calculate tooltip position
              var x = d.value * 100 / (60 * 60 * 24) + itemScale(moment(d.date));
              while ( width - x < (tooltip_width + tooltip_padding * 3) ) {
                x -= 10;
              }
              var y = projectScale(d.name) - 10 + projectScale.rangeBand();

              // Show tooltip
              tooltip.html(tooltip_html)
                .style('left', x + 'px')
                .style('top', y + 'px')
                .transition()
                  .duration(transition_duration / 2)
                  .ease('ease-in')
                  .style('opacity', 1);
            })
            .on('mouseout', function () {
              if ( in_transition ) { return; }
              scope.hideTooltip();
            })
            .on('click', function (d) {
              if ( scope.handler ) {
                scope.handler(d);
              }
            })
            .transition()
              .delay(function () {
                return ( in_transition ) ? transition_duration / 2: 0;
              })
              .duration(function () {
                return Math.cos( Math.PI * Math.random() ) * transition_duration * 2;
              })
              .ease('ease-in')
              .style('opacity', 0.5)
              .call(function (transition, callback) {
                if ( transition.empty() ) {
                  callback();
                }
                var n = 0;
                transition
                  .each(function() { ++n; })
                  .each('end', function() {
                    if ( !--n ) {
                      callback.apply(this, arguments);
                    }
                  });
                }, function() {
                  in_transition = false;
                });

          // Add time labels
          var timeLabels = d3.time.hours(moment(selected_date.date).startOf('day'), moment(selected_date.date).endOf('day'));
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
            .attr('y', label_padding / 2)
            .on('mouseenter', function (d) {
              if ( in_transition ) { return; }

              var selected = itemScale(moment(d));
              items.selectAll('.item-block')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', function (d) {
                  var start = itemScale(moment(d.date));
                  var end = itemScale(moment(d.date).add(d.value, 'seconds'));
                  return ( selected >= start && selected <= end ) ? 1 : 0.1;
                });
            })
            .on('mouseout', function () {
              if ( in_transition ) { return; }

              items.selectAll('.item-block')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', 0.5);
            });

          // Add project labels
          labels.selectAll('.label-project').remove();
          labels.selectAll('.label-project')
            .data(projectLabels)
            .enter()
            .append('text')
            .attr('class', 'label label-project')
            .attr('x', gutter)
            .attr('y', function (d) {
              return projectScale(d);
            })
            .attr('min-height', function () {
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
            .each(function () {
              var obj = d3.select(this),
                textLength = obj.node().getComputedTextLength(),
                text = obj.text();
              while (textLength > (label_padding * 1.5) && text.length > 0) {
                text = text.slice(0, -1);
                obj.text(text + '...');
                textLength = obj.node().getComputedTextLength();
              }
            })
            .on('mouseenter', function (project) {
              if ( in_transition ) { return; }

              items.selectAll('.item-block')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', function (d) {
                  return (d.name === project) ? 1 : 0.1;
                });
            })
            .on('mouseout', function () {
              if ( in_transition ) { return; }

              items.selectAll('.item-block')
                .transition()
                .duration(transition_duration)
                .ease('ease-in')
                .style('opacity', 0.5);
            });

          // Add button to switch back to year overview
          scope.drawButton();
        };


        /**
         * Draw the button for navigation purposes
         */
        scope.drawButton = function () {
          buttons.selectAll('.button').remove();
          var button = buttons.append('g')
            .attr('class', 'button button-back')
            .style('opacity', 0)
            .on('click', function () {
              if ( in_transition ) { return; }

              // Set transition boolean
              in_transition = true;

              // Cleanup the canvas from whichever overview type was on
              if ( !!selected_date && !!selected_date.total ) {
                scope.removeDayOverview();
              } else if ( !!selected_date ) {
                scope.removeMonthOverview();
              }

              // Unset selected date
              selected_date = undefined;

              // Redraw the chart
              scope.drawChart();
            });
          button.append('circle')
            .attr('cx', label_padding / 2.75)
            .attr('cy', label_padding / 2.5)
            .attr('r', circle_radius);
          button.append('text')
            .attr('x', label_padding / 2.75)
            .attr('y', label_padding / 2.5)
            .attr('dy', function () {
              return Math.floor(width / 100) / 3;
            })
            .attr('font-size', function () {
              return Math.floor(label_padding / 3) + 'px';
            })
            .html('&#x2190;');
          button.transition()
            .duration(transition_duration)
            .ease('ease-in')
            .style('opacity', 1);
        };


        /**
         * Transition and remove items and labels related to year overview
         */
        scope.removeYearOverview = function () {
          items.selectAll('.item-circle')
            .transition()
            .duration(transition_duration)
            .ease('ease')
            .style('opacity', 0)
            .remove();
          labels.selectAll('.label-day').remove();
          labels.selectAll('.label-month').remove();
        };


        /**
         * Transition and remove items and labels related to month overview
         */
        scope.removeMonthOverview = function () {
          svg.selectAll('.item-block-rect')
            .transition()
            .duration(transition_duration)
            .ease('ease-in')
            .style('opacity', 0)
            .attr('x', function (d, i) {
              return ( i % 2 === 0) ? -width/3 : width/3;
            })
            .remove();
          labels.selectAll('.label-day').remove();
          labels.selectAll('.label-week').remove();
          scope.hideBackButton();
        };


        /**
         * Transition and remove items and labels related to daily overview
         */
        scope.removeDayOverview = function () {
          items.selectAll('.item-block')
            .transition()
            .duration(transition_duration)
            .ease('ease-in')
            .style('opacity', 0)
            .attr('x', function (d, i) {
              return ( i % 2 === 0) ? 0 : width;
            })
            .remove();
          labels.selectAll('.label-time').remove();
          labels.selectAll('.label-project').remove();
          scope.hideBackButton();
        };


        /**
         * Helper function to hide the tooltip
         */
        scope.hideTooltip = function () {
          tooltip.transition()
            .duration(transition_duration / 2)
            .ease('ease-in')
            .style('opacity', 0);
        };


        /**
         * Helper function to hide the back button
         */
        scope.hideBackButton = function () {
          buttons.selectAll('.button')
            .transition()
            .duration(transition_duration)
            .ease('ease')
            .style('opacity', 0)
            .remove();
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
