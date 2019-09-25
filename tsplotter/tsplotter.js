function show_link_button_cb() {
  var permalink = thePage.make_permalink();

  $.ajax({
    type: "POST",
    url: "https://api.rebrandly.com/v1/links",
    data: JSON.stringify({"destination": permalink}),
    headers: {
      "Content-Type": "application/json",
      "apikey": thePage.get_key("rebrandly"),
    },
    dataType: "json",
    success: function(data) {
      // we can't copy the url to the clipboard from here because we can only do that from a trusted user action
      // but since the url is short now, it's ok to just display it
      var shortUrl = data["shortUrl"];
      HTML.show_perma_link(shortUrl);
    },
  });
}

function search_button_cb() {
  var term = document.getElementById("search-box").value;
  term = encodeURIComponent(term);
  var url = "https://www.quandl.com/search?query=" + term + "&type=free";
  var win = window.open(url, '_blank');
  win.focus();
}

function help_button_cb() {
  var url = "tsplotter/user_manual.html";
  var win = window.open(url, '_blank');
  win.focus();
}

// called after google charts and jquery DOM are ready
function init() {
  IO.websocket_connect("9002"); // used for sending data programatic
  thePage.init();
}

console.log("started execution");

// EXECUTION STARTS HERE
$(document).ready(function() {
  console.log("document is ready");
  thePage = new Page();
  HTML.init();
  google.charts.load('current', {'packages': ['charteditor'], 'callback': init});
});