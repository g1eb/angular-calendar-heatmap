# Angular directive for D3.js Calendar Heatmap

This [d3.js](https://d3js.org/) heatmap representing time series data is used to visualize tracked time over the past year, showing details for each of the days on demand.
Converted into an angular directive for your convenience :)

Inspired by Github's contribution chart.

Based on [D3.js Calendar Heatmap](https://github.com/DKirwan/calendar-heatmap) by [Darragh Kirwan](https://github.com/DKirwan)
Aaand [Calendar View](https://bl.ocks.org/mbostock/4063318) by [Mike Bostock](https://github.com/mbostock)

[![Angular directive for d3.js calendar heatmap chart](https://raw.githubusercontent.com/g1eb/angular-calendar-heatmap/master/screenshot.png)](https://rawgit.com/g1eb/angular-calendar-heatmap/master/example.html)

## Demo

Click <a href="https://rawgit.com/g1eb/angular-calendar-heatmap/master/example.html" target="_blank">here</a> for a live demo.

## Installation

1) Install 'angular-calendar-heatmap' with bower

```
bower install angular-calendar-heatmap
```

2) Add 'g1b.calendar-heatmap' module to your app config


```javascript
angular.module('myApp', [
  'g1b.calendar-heatmap',
  .....
])
```

3) Use 'calendar-heatmap' directive in a view

```html
<calendar-heatmap data="exampleData" color="'#ff0000'" handler="print"></calendar-heatmap>
```

### Attributes

|Property        | Usage           | Default  | Required |
|:------------- |:-------------|:-----:|:-----:|
| data | Time series data | none | yes |
| color | Theme hex color | #45ff00 | no |
| handler | Handler function is fired on click | none | no |

### Example data

Time series data for each day going 1 year back.
Each day has a total time tracked (in seconds).
Details, if provided, are shown in a tooltip.

```
var data = [{
  "date": "2016-01-01",
  "total": 17164,
  "details": [{
    "name": "Project 1",
    "value": 9192
  }, {
    "name": "Project 2",
    "value": 6753
  },
  .....
  {
    "name": "Project N",
    "value": 1219
  }]
}]
```

See [example.html](https://github.com/g1eb/angular-calendar-heatmap/blob/master/example.html) for an example implementation with random data or click <a href="https://rawgit.com/g1eb/angular-calendar-heatmap/master/example.html" target="_blank">here</a> for a live demo.

## Dependencies

* [d3.js](https://d3js.org/)
* [moment.js](http://momentjs.com/)
* [AngularJS](https://angularjs.org/)
