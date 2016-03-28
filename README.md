# Angular directive for D3.js Calendar Heatmap

This circular time series heatmap is used to visualise tracked time over the past year, showing details for each of the days on demand.
Converted into an angular directive for your convenience.

Inspired by Github's contribution chart.

A [d3.js](https://d3js.org/) heatmap representing time series data. 

Based on [D3.js Calendar Heatmap](https://github.com/DKirwan/calendar-heatmap) by [Darragh Kirwan](https://github.com/DKirwan)

[![Angular directive for d3.js calendar heatmap chart](https://raw.githubusercontent.com/g1eb/angular-calendar-heatmap/master/screenshot.png)](https://rawgit.com/g1eb/angular-calendar-heatmap/master/example.html)

## Demo

<a href="https://rawgit.com/g1eb/angular-calendar-heatmap/master/example.html" target="_blank">View demo in a new window</a>

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

3) Use 'calendar-heatmap' directive in your view

```html
<calendar-heatmap data="exampleData" color="'#ff0000'" handler="print"></calendar-heatmap>
```

### Attributes

|Property        | Usage           | Default  | Required |
|:------------- |:-------------|:-----:|:-----:|
| data | Time series data | none | yes |
| color | Theme color | #45ff00 | no |
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

See example.html for an example implementation with random data, click <a href="https://rawgit.com/g1eb/angular-calendar-heatmap/master/example.html" target="_blank">here</a> for a live demo.
