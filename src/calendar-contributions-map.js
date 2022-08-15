/**
 * Name        : calendar-contributions-map
 * Created on  : 2017/05/15 10:51
 * Author      : Liuker <liu@liuker.xyz>
 * Version     : 1.0.0
 * Copyright   : Copyright (C) 2016 - 2017, Liuker Lab, https://liuker.org.
 * Description : A d3 map for representing time series data similar to github's contribution chart.
 *
 */
function calendarContributionsMap() {
    // defaults
    var selector = 'body';
    var colorRange = ['#eee', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
    var SQUARE_LENGTH = 15;  // square length
    var SQUARE_PADDING = 2;  // square padding
    var MONTH_LABEL_PADDING = 15;
    var WEEK_LABEL_PADDING = 15;
    var width = 0; //(SQUARE_LENGTH + SQUARE_PADDING) * 53 + WEEK_LABEL_PADDING; // (size + 2) * 53
    var height = (SQUARE_LENGTH + SQUARE_PADDING) * 8 + MONTH_LABEL_PADDING; // (size + 2) * 8 + 6
    var legendWidth = (SQUARE_LENGTH + SQUARE_PADDING) * (colorRange.length + 1) + 24 + SQUARE_PADDING;
	var legendHeight = SQUARE_LENGTH;
    var now = moment().endOf('day').toDate();
    var yearAgo = moment().startOf('day').subtract(1, 'year').toDate();
    var startDate = null;
    var data = [];
    var max = null;
    var tooltipEnabled = true;
    var tooltipUnit = 'contribution';
    var legendEnabled = true;
    var onClick = null;
    var weekStart = 1; //0 for Sunday, 1 for Monday
    var locale = {
        months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        days: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        No: '0',
        on: 'on',
        Less: 'Less',
        More: 'More'
    };

    // setters and getters
    chart.data = function (value) {
        if (!arguments.length) {
            return data;
        }
        data = value;
        
        let startWeekDay = moment(data[0].date).weekday();
        let endWeekDay = moment(data[data.length-1].date).weekday();

        // 通过时间序列的实际情况，计算总体的宽度。
        // 实际的宽度，不一定为53列，可能会出现54列的情况。根据具体情况设置实际宽度。
        if (weekStart === 0) {
            if(startWeekDay == 0 || endWeekDay == 6) {
                width = (SQUARE_LENGTH + SQUARE_PADDING) * 53 + WEEK_LABEL_PADDING;
            } else {
                width = (SQUARE_LENGTH + SQUARE_PADDING) * 54 + WEEK_LABEL_PADDING;
            }
        } else {
            if(startWeekDay == 1 || endWeekDay == 0) {
                width = (SQUARE_LENGTH + SQUARE_PADDING) * 53 + WEEK_LABEL_PADDING;
            } else {
                width = (SQUARE_LENGTH + SQUARE_PADDING) * 54 + WEEK_LABEL_PADDING;
            }
        }

        return chart;
    };

    chart.max = function (value) {
        if (!arguments.length) {
            return max;
        }
        max = value;
        return chart;
    };

    chart.selector = function (value) {
        if (!arguments.length) {
            return selector;
        }
        selector = value;
        return chart;
    };

    chart.startDate = function (value) {
        if (!arguments.length) {
            return startDate;
        }
        yearAgo = value;
        now = moment(value).endOf('day').add(1, 'year').toDate();
        return chart;
    };

    chart.colorRange = function (value) {
        if (!arguments.length) {
            return colorRange;
        }
        colorRange = value;
        return chart;
    };

    chart.tooltipEnabled = function (value) {
        if (!arguments.length) {
            return tooltipEnabled;
        }
        tooltipEnabled = value;
        return chart;
    };

    chart.tooltipUnit = function (value) {
        if (!arguments.length) {
            return tooltipUnit;
        }
        tooltipUnit = value;
        return chart;
    };

    chart.legendEnabled = function (value) {
        if (!arguments.length) {
            return legendEnabled;
        }
        legendEnabled = value;
        return chart;
    };

    chart.onClick = function (value) {
        if (!arguments.length) {
            return onClick();
        }
        onClick = value;
        return chart;
    };

    chart.locale = function (value) {
        if (!arguments.length) {
            return locale;
        }
        locale = value;
        return chart;
    };

    function chart() {

        d3.select(chart.selector()).selectAll('svg.calendar-contributions-map,div.day-cell-tooltip').remove(); // remove the existing chart, if it exists

        var dateRange = d3.timeDay.range(yearAgo, now); // generates an array of date objects within the specified range
        var monthRange = d3.timeMonth.range(moment(yearAgo).startOf('month').toDate(), now); // it ignores the first month if the 1st date is after the start of the month
        var firstDate = moment(dateRange[0]);
        if (max === null) {
            max = d3.max(chart.data(), function (d) {
                return d.count;
            });
        } // max data value

        // color range
        function color(count) {
            if (count > 0 && count <= (max * 0.1)) {
                return colorRange[1];
            }
            else if (count > (max * 0.1) && count <= (max * 0.3)) {
                return colorRange[2];
            }
            else if (count > (max * 0.3) && count <= (max * 0.6)) {
                return colorRange[3];
            }
            else if (count > (max * 0.6) && count <= (max * 1)) {
                return colorRange[4];
            }
            else {
                return colorRange[0];
            }
        };

        var tooltip;
        var dayRects;

        drawChart();

        function drawChart() {
            if(chart.legendEnabled()){
                height = height + legendHeight + SQUARE_PADDING;
            }
            var svg = d3.select(chart.selector())
                .style('position', 'relative')
                .append('svg')
                .attr('width', width)
                .attr('class', 'calendar-contributions-map')
                .attr('height', height)
                .style('padding', '16px');

			//  array of days for the last yr
            dayRects = svg.selectAll('.day-cell')
                .data(dateRange).enter().append('rect')
                .attr('class', 'day-cell')
                .attr('width', SQUARE_LENGTH)
                .attr('height', SQUARE_LENGTH)
                .attr('fill', function (d) {
                    var c = parseInt(countForDate(d));
                    return color(c);
                })
                .attr('x', function (d, i) {
                    var cellDate = moment(d);

                    var result = 0;
                    if (weekStart === 1) {
                        result = cellDate.isoWeek() - firstDate.isoWeek() + (firstDate.isoWeeksInYear() * (cellDate.isoWeekYear() - firstDate.isoWeekYear()));
                    } else {
                        result = cellDate.week() - firstDate.week() + (firstDate.weeksInYear() * (cellDate.weekYear() - firstDate.weekYear()));
                    }
                    return result * (SQUARE_LENGTH + SQUARE_PADDING) + WEEK_LABEL_PADDING;
                })
                .attr('y', function (d, i) {
                    return MONTH_LABEL_PADDING + formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING);
                });

            if (typeof onClick === 'function') {
                dayRects.on('click', function (d) {
                    var count = countForDate(d);
                    onClick({date: d, count: count});
                });
            }

            if (chart.tooltipEnabled()) {
                dayRects.on('mouseover', function (d, i) {
                    tooltip = d3.select(chart.selector())
                        .append('div')
                        .attr('class', 'day-cell-tooltip')
                        .html(tooltipHTMLForDate(d))
                        .style('left', function () {
                            return Math.floor(i / 7) * SQUARE_LENGTH + 'px';
                        })
                        .style('top', function () {
                            return formatWeekday(d.getDay()) * (SQUARE_LENGTH + SQUARE_PADDING) + MONTH_LABEL_PADDING * 2 + SQUARE_LENGTH + SQUARE_PADDING + 'px';
                        });
                })
                    .on('mouseout', function (d, i) {
                        tooltip.remove();
                    });
            }

            if (chart.legendEnabled()) {
                var legendGroup = svg.append('g');
                legendGroup.selectAll('.calendar-contributions-map-legend')
                    .data(colorRange)
                    .enter()
                    .append('rect')
                    .attr('class', 'calendar-contributions-map-legend')
                    .attr('width', SQUARE_LENGTH)
                    .attr('height', SQUARE_LENGTH)
                    .attr('x', function (d, i) {
                        return (width - legendWidth) + (i + 1) * (SQUARE_LENGTH + SQUARE_PADDING);
                    })
					// 5 是弥补字体和方框大小带来的误差
                    .attr('y', height - SQUARE_LENGTH - 5)
                    .attr('fill', function (d) {
                        return d;
                    });

                legendGroup.append('text')
                    .attr('class', 'calendar-contributions-map-legend-text calendar-contributions-map-legend-text-less')
                    .attr('x', width - legendWidth - (SQUARE_LENGTH + SQUARE_PADDING))
                    .attr('y', height - SQUARE_LENGTH)
                    .text(locale.Less);

                legendGroup.append('text')
                    .attr('class', 'calendar-contributions-map-legend-text calendar-contributions-map-legend-text-more')
                    .attr('x', (width - legendWidth + SQUARE_PADDING) + (colorRange.length + 1) * (SQUARE_LENGTH + SQUARE_PADDING))
                    .attr('y', height - SQUARE_LENGTH)
                    .text(locale.More);
            }

            dayRects.exit().remove();
            var monthLabels = svg.selectAll('.month')
                .data(monthRange)
                .enter().append('text')
                .attr('class', 'month-name')
                .style('text-anchor', 'middle')
                .text(function (d) {
                    return locale.months[d.getMonth()];
                })
                .attr('x', function (d, i) {
                    var matchIndex = 0;
                    dateRange.find(function (element, index) {
                        matchIndex = index;
                        return moment(d).isSame(element, 'month') && moment(d).isSame(element, 'year');
                    });

                    return Math.floor(matchIndex / 7) * (SQUARE_LENGTH + SQUARE_PADDING) + WEEK_LABEL_PADDING;
                })
                .attr('y', 0);  // fix these to the top

            locale.days.forEach(function (day, index) {
                index = formatWeekday(index);
                if (index % 2) {
                    svg.append('text')
                        .attr('class', 'day-initial')
                        .attr('transform', 'translate(4,' + (SQUARE_LENGTH + SQUARE_PADDING) * (index + 1) + ')')
                        .style('text-anchor', 'middle')
                        .attr('dy', '2')
                        .text(day);
                }
            });
        }

        function pluralizedTooltipUnit(count) {
            if ('string' === typeof tooltipUnit) {
                return (tooltipUnit + (count === 1 ? '' : 's'));
            }
            for (var i in tooltipUnit) {
                var _rule = tooltipUnit[i];
                var _min = _rule.min;
                var _max = _rule.max || _rule.min;
                _max = _max === 'Infinity' ? Infinity : _max;
                if (count >= _min && count <= _max) {
                    return _rule.unit;
                }
            }
        }

        function tooltipHTMLForDate(d) {
            var dateStr = moment(d).format('ddd, MMM Do YYYY');
            var count = countForDate(d);
            return '<span><strong>' + (count ? count : locale.No) + ' ' + pluralizedTooltipUnit(count) + '</strong> ' + locale.on + ' ' + dateStr + '</span>';
        }

        function countForDate(d) {
            var count = 0;
            var match = chart.data().find(function (element, index) {
                return moment(element.date).isSame(d, 'day');
            });
            if (match) {
                count = match.count;
            }
            return count;
        }

        function formatWeekday(weekDay) {
            if (weekStart === 1) {
                if (weekDay === 0) {
                    return 6;
                } else {
                    return weekDay - 1;
                }
            }
            return weekDay;
        }

        var daysOfChart = chart.data().map(function (day) {
            return moment(day.date).toDate().toDateString();
        });

        // dayRects.filter(function (d) {
        //     return daysOfChart.indexOf(d.toDateString()) > -1;
        // }).attr('fill', function (d, i) {
        //     return color(chart.data()[i].count);
        // });
    }

    return chart;
}


// polyfill for Array.find() method
/* jshint ignore:start */
if (!Array.prototype.find) {
    Array.prototype.find = function (predicate) {
        if (this === null) {
            throw new TypeError('Array.prototype.find called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        var list = Object(this);
        var length = list.length >>> 0;
        var thisArg = arguments[1];
        var value;

        for (var i = 0; i < length; i++) {
            value = list[i];
            if (predicate.call(thisArg, value, i, list)) {
                return value;
            }
        }
        return undefined;
    };
}
/* jshint ignore:end */
