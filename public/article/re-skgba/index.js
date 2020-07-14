// Normal buffer
var normal_buf = new CircularBuffer(8, [0x0]);
var normal_sel = d3.select("#normal-buffer")
    .datum(normal_buf)
var normalBuffer = chart(normal_sel)
normal_sel.append("button")
    .attr("class", "btn c")
    .text("Add RNG value")
    .on("click", function() {
        normal_buf.consume()
        normalBuffer() // Render again
    });
normalBuffer()

// Full buffer
var full_buf = new CircularBuffer(8, [
  0,
  12345,
  3554416254,
  2802067423,
  3596950572,
  229283573,
  3256818826,
  1051550459
]);
var full_sel = d3.select("#full-buffer")
    .datum(full_buf)
var fullBuffer = chart(full_sel)
full_sel.append("button")
.attr("class", "btn c")
    .text("Advance RNG")
    .on("click", function() {
        full_buf.consume()
        fullBuffer()
    });
fullBuffer()

// Search
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resetSearch() {
  found = false;
  taken = 0;
}

var search_buf = new CircularBuffer(8, [
    0,
    12345,
    3554416254,
    2802067423,
    3596950572,
    229283573,
    3256818826,
    1051550459
  ]);
var search_sel = d3.select("#search-buffer")
      .datum(search_buf)
var searchBuffer = chart(search_sel).transitionTime(250);
searchBuffer()

function resetBuffer() {
  if (! found) { return; } // Don't run while bufferLookForValue is running
  
  search_buf = new CircularBuffer(8, [
    0,
    12345,
    3554416254,
    2802067423,
    3596950572,
    229283573,
    3256818826,
    1051550459
  ]);
  search_sel = d3.select("#search-buffer")
      .datum(search_buf)
  searchBuffer = chart(search_sel).transitionTime(250);
  searchBuffer()
  
  d3.select(".results").node().innerHTML = "";
  found = false;
}

var found = false; // Global context
async function bufferLookForValue(value) {
  if (found) { return; } // Have we already done this?
  
  found = false;
  var taken = 0;
  
  // Take values from the queue, until we find the matching one.
  while (! found) {
    var searchValue = search_buf.consume();
    taken += 1;
    
    if (searchValue === value) {
      found = true;
    }
    
    searchBuffer();
    // DOM manipulation is good enough.
    var results = d3.select(".results").node()
    if (results.innerHTML !== "") {
      results.innerHTML += "</br>"
    }
    results.innerHTML += taken + ": " +  toHex(searchValue)
    await sleep(250);
  }
  
  results.innerHTML += "</br>Values taken: " + taken;
}
