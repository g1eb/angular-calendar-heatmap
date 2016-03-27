# Angular directive for D3.js Calendar Heatmap

This circular time series heatmap is used to visualise tracked time over the past year, showing details for each of the days on demand.
Converted into an angular directive for your convenience.

Inspired by Github's contribution chart.

A [d3.js](https://d3js.org/) heatmap representing time series data. 

Based on [D3.js Calendar Heatmap](https://github.com/DKirwan/calendar-heatmap) by [Darragh Kirwan](https://github.com/DKirwan)

![Angular directive for d3.js calendar heatmap chart](https://raw.githubusercontent.com/g1eb/angular-calendar-heatmap/master/screenshot.png)

## Dependencies

* [d3.js](https://d3js.org/)
* [moment.js](http://momentjs.com/)

## Options

|Property        | Usage           | Default  | Required |
|:------------- |:-------------|:-----:|:-----:|
| data | Time series data | none | yes |
| color | Theme color | #45ff00 | no |
| handler | Handler function is fired on click | none | no |

## Example data

Time series data for each day going 1 year back.
Each day has a total time tracked in seconds.
Details, if provided, are shown in a tooltip.

```
var data = {[
  date: Sun Mar 27 2016 00:00:00 GMT+0100 (CET),
  total: 17164,
  details: [{
    name: 'Project 1',
    seconds: 9192
  }, {
    name: 'Project 2',
    seconds: 6753
  },
  .....
  {
    name: 'Project X',
    seconds: 1219
  }]
]}
```

See example.html for an example implementation with random data.
