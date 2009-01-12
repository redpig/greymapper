function mindweb_init() {
// Extract YTree id from url and load unles it is missing -- then this is new.
	var yTree = new YTree();
  var rNode = null;
  var title = "{{title|escape}}";
  var id = parseInt("{{id|escape}}");
  var revision = parseInt("{{revision|escape}}");

  if (id) {
    rNode = yTree.createRootNode("Loading...");
  } else {
    rNode = yTree.createRootNode("New MindWeb");
  }
	var yView = new YView(yTree, document.getElementById("panelDOM"), document.getElementById("panelSVG"));
	yView.drawNode(rNode, true);

  if (id) {
    var xhr;
    if (window.XMLHttpRequest) {
      xhr = new XMLHttpRequest();
    } else if (window.ActiveXObject) {
      xhr = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if(xhr.status == 200) {
          yTree.loadFromXML(xhr.responseText);
          yTree.id = id;
          yView.setContentTitle(title);
          yView.redrawTree();
        } else {
          alert("An error occurred while loading: " + xhr.status);
        }
      }
    }
    var url = "/map/xml/" + id;
    if (revision) {
      url += ";"+revision;
    }
    xhr.open('GET', url, true);
    xhr.send(null);
  } 
	//var yView = new YView(yTree, document.getElementById("panelDOM"), document.getElementById("panelSVG"));
}


