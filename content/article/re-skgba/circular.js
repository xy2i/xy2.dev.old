'use strict';
/* Congratulations! You found the super secret d3 source code! 
 * Have fun :)
 */

// JS doens't have 32 bit multiply with overflow
// https://stackoverflow.com/questions/6232939/is-there-a-way-to-correctly-multiply-two-32-bit-integers-in-javascript
function multiply_uint32(a, b) {
  var ah = (a >> 16) & 0xffff, al = a & 0xffff;
  var bh = (b >> 16) & 0xffff, bl = b & 0xffff;
  var high = ((ah * bl) + (al * bh)) & 0xffff;
  return ((high << 16)>>>0) + (al * bl);
}

// Substraction may return a negative value which we need to 
// abs to get a proper index
// So we need to use a proper modulo operator,
// instead of JS's "modulo" % which is actually a remainder
function mod(n, m) {
  return ((n % m) + m) % m;
}

// Convert to an uint32.
function touint32(x) {
  return mod(x, Math.pow(2, 32));
}

// Shaman King RNG implementation in JS
function RNG(old) {
  return touint32(multiply_uint32(old, 0x41C64E6D) + 0x3039)
}

function toHex(n) { 
    if (n === -1) return "";
    return "0x" + n.toString(16);
};

// CircularBuffer class
class CircularBuffer {
  constructor(size, array) {
    // Represents the maximum size of the buffer,
    // not its actual size.
    this.size = size; 
    this.head = 0;
    this.tail = 0;
    this.full = false;
    this.array = [];
    
    if (array !== undefined) {
      array.forEach(
        e => this.enqueue(e)
      );
    }
  }
  
  empty() {
    return (! this.full && this.head == this.tail);
  }
  
  advance() {
    if (this.full) {
      this.tail = (this.tail + 1) % this.size
    }
    
    this.head = (this.head + 1) % this.size
    this.full = (this.head == this.tail)
  }
  
  enqueue(value) {
    this.array[this.head] = value
    this.advance()
  }
  
  get() {
    if (this.empty()) {
      console.log("get: queue is empty")
      return;
    }
    return this.array[this.tail];
  }
  
  get_head() {
    if (this.empty()) {
      console.log("get: queue is empty")
      return;
    }
    var head = mod(this.head - 1, this.size) // See above
    return this.array[head];
  }
  
  consume() {
      var newest = this.get_head()
      var advanced = RNG(newest)
      this.enqueue(advanced)
      return newest;
  }
}

// Force to finish transition and retain state
// Taken from https://bl.ocks.org/Andrew-Reid/d92de15ef9694f12cf5695271dd73cb8
d3.selection.prototype.finish = function() {
  // check if there is a transition to finish:
  if (this.node() !== null && this.node().__transition) {
      // if there is transition data in any slot in the transition array, call the timer callback:
      var slots = this.node().__transition;
      var keys = Object.keys(slots);
      keys.forEach(function(d,i) {
        if(slots[d]) slots[d].timer._call(); 
   })	
  }
  return this;
}

// Closure for modularity and configuration.
// See t.
function chart(selection) {
  var colorScale = d3.scaleSequential()
      .domain([0x0, 0xffffffff])
      .interpolator(d3.interpolateOranges);  

  // Compute the position of each group on the pie:
  var pie = d3.pie()
      .startAngle(-90 * Math.PI/180) // Angle it like a circle!
      .endAngle(-90 * Math.PI/180 + 2*Math.PI)
      .value(1) // Make the slices constant size.
    
  function interpol(a, b) {
      return d3.interpolateNumber(a, b);
  }
  
  // Transition time, in ms
  var transitionTime = 750;
  
  function my() {
    selection.each(function(data) {
      // Dynamic size SVG, responsive.
      // selection.node().getBoundingClientRect gets the bounding rectangle
      // of the parent element. I've put my graph inside a div,
      // but anything works. The size will be determined by the element's initial
      // width as reported by getBoundingClientRect.
      var bbox = selection.node().getBoundingClientRect()
      var width = 0.5 * bbox.width;
      // Make height the same as width. As such, only the width of the page 
      // matters for determining size.
      var height = width; 
      var radius = Math.min(width, height) / 2;
      var innerRadius = radius / 2;
      
      //
      var svgElement = d3.select(this).selectAll("svg")
      
      // Create the SVG if it doens't exist (enter selection)
      svgElement
        // Create a data join with empty data, 
        // see https://github.com/d3/d3-selection/issues/91 for rationale
        .data([null]) 
        .enter()
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
        
      // Main g element of svg (misleading named svg)
      var svg = d3.select(this).select("g")
        
      var arc = d3.arc()
        .innerRadius(innerRadius) 
        .outerRadius(radius)
        .padAngle(2* Math.PI/180)
        
      /* Why? The pie is not fixed size. We are trying to represent
      * an array where each element is fixed size, but the pie
      * will extend to an entire circle by default.
      * Adjusting start and end angle necessary is needed.
      * This function mutates pie.
      */
      function updateStartEndAngles(data) {
          // Note that we angle the pie like a circle, to make
          // the invertArcIfBottom() calculations easier.
          var startAngle = -90 * Math.PI/180
          
          // How much area does a single cell cover?
          // 2*pi is the radius of a circle.
          // We calculate against the buffer's max size.
          var step = 2*Math.PI / data.size
          
          // How many cells are there? That's going to be the end angle,
          // relative to the starting one.
          // If data.array.length == data.size,
          // then endAngle = startAngle + 2*pi and we form a complete circle.
          var endAngle = startAngle + step * data.array.length
          
          pie = d3.pie()
              .startAngle(startAngle) 
              .endAngle(endAngle)
              .value(8) // Make each cell constant size.
      }
          
      function joinCell(data) { 
        var tEnter = d3.transition("cellFade")
          .duration(transitionTime);
          
        var tUpdate = d3.transition("cellChange")
          .duration(transitionTime);
        
        return svg.selectAll(".cell")
        .data(pie(data.array))
        .join(
            enter => enter.append("path")
                .attr("class", "cell")
                .attr("id", (d,i) => "cell_"+i) //Unique id for each slice
                .attr("d", arc) // Give it an arc
                .attr("fill", "white")
            .call(enter => enter.transition(tEnter)
                .attr("fill", (d) => colorScale(d.data))),
            update => update
                .attr("d", arc)
                .call(update => update.transition(tUpdate)
                    .attr("fill", (d) => colorScale(d.data))),
            exit => exit.remove()
        );
      }

      // Code taken from https://www.visualcinnamon.com/2015/09/placing-text-on-arcs.html
      // All credit to him, none to me! 
      function invertArcIfBottom(data){
          //A regular expression that captures all in between the start of a string
          //(denoted by ^) and the first capital letter L
          var firstArcSection = /(^.+?)L/;
          
          //The [1] gives back the expression between the () (thus not the L as well)
          //which is exactly the arc statement
          var newArc = firstArcSection.exec(arc(data))[1];
          //Replace all the comma's so that IE can handle it -_-
          newArc = newArc.replace(/,/g , " ");
          
          //If the end angle lies beyond a quarter of a circle (90 degrees or pi/2)
          //flip the end and start position
          if (data.endAngle > 90 * Math.PI/180) {
              //Everything between the capital M and first capital A
              var startLoc = /M(.*?)A/;
              //Everything between the capital A and 0 0 1
              var middleLoc = /A(.*?)0 0 1/;
              //Everything between the 0 0 1 and the end of the string (denoted by $)
              var endLoc = /0 0 1 (.*?)$/;
              //Flip the direction of the arc by switching the start and end point
              //and using a 0 (instead of 1) sweep flag
              var newStart = endLoc.exec( newArc )[1];
              var newEnd = startLoc.exec( newArc )[1];
              var middleSec = middleLoc.exec( newArc )[1];

              //Build up the new arc notation, set the sweep-flag to 0
              newArc = "M" + newStart + "A" + middleSec + "0 0 0 " + newEnd;
          }
          return newArc;  
      }

      function joinCellTextArc(data){
          return svg.selectAll(".cellHidden")
          .data(pie(data.array))
          .join(
              enter => enter
                  .append("path")
                  .attr("class", "cellHidden")
                  .attr("id", (d,i) => "donutArc"+i)
                  .attr("d", d => invertArcIfBottom(d))
                  .attr("fill", "none"),
              update => update
                  .attr("d", d => invertArcIfBottom(d)),
              exit => exit.remove()
          )
      }

      function joinCellText(data) {
          var tEnter = d3.transition("textEnter")
            .duration(transitionTime);
          var tUpdate = d3.transition("textUpdate")
            .duration(transitionTime);
            
          return svg.selectAll(".cellText")
          .data(pie(data.array))
          .join(
              enter => enter.append("text")
                  .attr("class", "cellText")
                  // Move the labels below the arcs for slices with an end angle > than 90 degrees
                  .attr("dy", (d,i) => (d.endAngle > 90 * Math.PI/180 ? -11 : 18) )
                  .append("textPath")
                  .attr("startOffset","50%")
                  .attr("xlink:href", (d,i) => "#donutArc"+i )
                  // Create a _current property to memoize last value, for the later update()
                  .property("_current", d => d.data) 
                  .text(d => toHex(d.data))
                  .call(enter => enter.transition(tEnter)
                      // Transition: fade to black
                      .attrTween("fill", _ => d3.interpolate("white", "black"))), 
              update => update
                  .select("textPath")
                  .call(update => update.transition(tUpdate)
                      .textTween(
                          function(d) {
                              const i = interpol(this._current, d.data)
                              return function(t) { 
                                  return toHex(this._current = Math.round(i(t))); 
                              };
                          })),
              exit => exit.remove()
          );
      }

      function joinHead(data) {
          var t = d3.transition("head")
            .duration(2 * transitionTime / 3);
            
          // Make sure to have the same behavior as actual head(),
          // but just return the index instead of the actual value
          var actualHead = mod(data.head - 1, data.size)
          
          return svg.selectAll("#head")
          .data(
            [ pie(data.array)[actualHead] ] // Data is an array of one element
          )
          .join(
              enter => enter
                  .append("circle")
                  .attr("id", "head")
                  .attr("cx", d => arc.centroid(d)[0])
                  .attr("cy", d => arc.centroid(d)[1])
                  .attr("r", 10),
              update => update
                .call(update => update
                  // End the other transition, see
                  // https://bl.ocks.org/Andrew-Reid/d92de15ef9694f12cf5695271dd73cb8
                  .finish() // No, this isn't included in d3 by default!
                  .transition(t)
                  .attr("cx", d => arc.centroid(d)[0])
                  .attr("cy", d => arc.centroid(d)[1]))
                  // Make sure the head element is correctly ordered at the top
                  .raise(),
              exit => exit.remove()
          );
      }
      
      function joinTail(data) {
          var t = d3.transition("tail")
            .duration(transitionTime / 2);
            
          var actualTail = data.tail
          
          return svg.selectAll("#tail")
          .data(
            [ pie(data.array)[actualTail] ] // Data is an array of one element
          )
          .join(
              enter => enter
                  .append("rect") 
                  .attr("id", "tail")
                  .attr("x", d => arc.centroid(d)[0] - 15)
                  .attr("y", d => arc.centroid(d)[1] - 15)
                  .attr("width", 30)
                  .attr("height", 30),
              update => update
                .call(update => update
                  .finish()
                  .transition(t)
                  .attr("x", d => arc.centroid(d)[0] - 15)
                  .attr("y", d => arc.centroid(d)[1] - 15))
                  .raise(),
              exit => exit.remove()
          );
      }

      /* To update:
      * - Change the start and end angle of the pie. We represent a circular buffer with
      * fixed size, so if the buffer is empty, then it needs to start at the according
      * angle.
      * - Join each of our chart elements. See https://bost.ocks.org/mike/selection/
      * for the idea,
      * and https://observablehq.com/@d3/selection-join for the pattern used here.
      */
      function update(data) {
          updateStartEndAngles(data) // Mutates pie!
          joinCell(data)
          joinCellTextArc(data)
          joinCellText(data)
          joinHead(data)
          joinTail(data)
      }
      
      update(data) // Run the initial chart.
    })
  };
  
  my.transitionTime = function(value) {
    if (!arguments.length) return transitionTime;
    transitionTime = value;
    return my;
  };
  
  return my;
}

// O-ho, what's this?
console.log('%cYay, you opened the console! d3 is fun :)', 'font-weight: bold; font-size: 22px;color: red; text-shadow: 1px 1px 0 rgb(217,31,38) , 2px 2px 0 rgb(226,91,14) , 3px 3px 0 rgb(245,221,8) , 4px 4px 0 rgb(5,148,68) , 5px 5px 0 rgb(2,135,206) , 6px 6px 0 rgb(4,77,145) , 7px 7px 0 rgb(42,21,113)');
