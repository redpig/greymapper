function mindweb_save(title, xml, txt) {
  var xhr;
  if (window.XMLHttpRequest) { 
    xhr = new XMLHttpRequest();
  } else if (window.ActiveXObject) {
    xhr = new ActiveXObject("Microsoft.XMLHTTP");
  }
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if(xhr.status == 200) {
        var revUrl = window.location.protocol + '//' +
                     window.location.host + xhr.responseText;
        if (window.location.href != revUrl) {
          window.location.href = xhr.responseText;
        }
      } else {
        alert("An error occurred while saving: " + xhr.status);
      }
    }
  }
  if (g_YView.tree.id == null) {
    xhr.open('POST', "/map/", true);
  } else {
    xhr.open('POST', "/map/"+g_YView.tree.id, true);
  }
  xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  var payload = "xml=" + escape(xml) + "&title=" + escape(title);
  xhr.send(payload);
}
