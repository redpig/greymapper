document.onmousemove	= mouseMove;
document.onmouseup		= mouseUp;
document.oncontextmenu	= function () {return false;}

if ( document.all ) {
	document.onkeydown		= keyPress;
} else {
	document.onkeypress		= keyPress;
	
	var element = HTMLElement.prototype;

    var capture = ["click",    "mousedown", "mouseup",    "mousemove", "mouseover", "mouseout" ];

    element.setCapture = function(){
        var self = this;
        var flag = false;
        this._capture = function(e){
            if (flag) {return}
            flag = true;
            var event = document.createEvent("MouseEvents");
            event.initMouseEvent(e.type,
                e.bubbles, e.cancelable, e.view, e.detail,
                e.screenX, e.screenY, e.clientX, e.clientY,
                e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
                e.button, e.relatedTarget);
            self.dispatchEvent(event);
            flag = false;
        };
        for (var i=0; i<capture.length; i++) {
            window.addEventListener(capture[i], this._capture, true);
        }
    };

    element.releaseCapture = function(){
        for (var i=0; i<capture.length; i++) {
            window.removeEventListener(capture[i], this._capture, true);
        }
        this._capture = null;
    };
}


function keyPress(evt) {
	if ( g_YView.bNodeEditing || g_YView.bPopupDisplayed || g_YView.isLockEditing() ) return true;

	evt = (evt) ? evt:window.event;
	code = (evt.keyCode)? evt.keyCode:evt.charCode;

	switch( code ) {
		case YKEYCODE_ENTER:
			if ( g_YView.getSelectedNodeCount() == 1 ) {
				node = g_YView.getLastSelectedNode();
				if ( node == null ) {
					return false;
				}
				
				var tmpNode = null;
				if ( node.indent == 0 ) {
					tmpNode = g_YView.appendChildNode(node);
				} else {
					tmpNode = g_YView.appendSiblingNode(node, g_YView.tree.NODE_SIB_NEXT);
				}
				if ( tmpNode ) {
					g_YView.startNodeEdit(tmpNode);
					return false;
				}
			}
			break;
		case YKEYCODE_SPACE:
			if ( g_YView.getSelectedNodeCount() == 1 ) {
				node = g_YView.getLastSelectedNode();
				if ( node == null ) {
					return false;
				}
				g_YView.toggleNode(node);
			}
			break;
		case YKEYCODE_PAGEUP:
		case YKEYCODE_PAGEDN:
			g_YView.navigateNode( code, false);
			break;
		case YKEYCODE_END:
		case YKEYCODE_HOME:
			if ( g_YView.getSelectedNodeCount() == 1 ) {
				node = g_YView.getLastSelectedNode();
				if ( node == null ) {
					return false;
				}
				if ( code == YKEYCODE_END ) {
					g_YView.startNodeEdit(node, g_YView.CARET_ORG_END);
				} else if (  code == YKEYCODE_HOME ) {
					g_YView.startNodeEdit(node, g_YView.CARET_ORG_START);
				}
			}
			break;
		case YKEYCODE_LEFT:
		case YKEYCODE_UP:
		case YKEYCODE_RIGHT:
		case YKEYCODE_DOWN:
			if ( evt.ctrlKey ) {
				g_YView.swapSibNode( code );
			} else {
				g_YView.navigateNode( code, evt.shiftKey);
			}
			break;
		case YKEYCODE_TAB:
		case YKEYCODE_INSERT:
			if ( g_YView.getSelectedNodeCount() == 1 ) {
				node = g_YView.getLastSelectedNode();
				if ( node == null ) {
					return false;
				}
				
				var tmpNode = g_YView.appendChildNode(node);;
				if ( tmpNode ) {
					g_YView.startNodeEdit(tmpNode);
					return false;
				}
			}
			break;
		case YKEYCODE_DELETE:
			g_YView.deleteSelectedNodes();
			break;
		case YKEYCODE_F2:
			if ( g_YView.getSelectedNodeCount() == 1 ) {
				node = g_YView.getLastSelectedNode();
				if ( node == null ) {
					return false;
				}
				g_YView.startNodeEdit(node);
			}
			break;
	}

	return false;
}

function NodeClick(evt,nodeID) {
	if ( g_YView.bNodeEditing || g_YView.bPopupDisplayed ) return false;

	evt = (evt) ? evt:window.event;

	var node = g_YView.tree.getNodeById(nodeID);
	if ( node == undefined || node == null ) {
		return true;;
	}
	
	if ( node.childNodes.length > 0 && !evt.shiftKey && !evt.ctrlKey ) {
		g_YView.toggleNode(node);
	}

	if ( g_YView.getSelectedNodeCount() > 1 && evt.ctrlKey && g_YView.isSelectedNode(node) ) {
		g_YView.deSelectNodes(node);
		return false;
	}

	g_YView.selectNode(node, evt.shiftKey || evt.ctrlKey);

	if ( g_YView.getSelectedNodeCount() == 1 && node.childNodes.length == 0 &&
		!evt.shiftKey && !evt.ctrlKey) {

		if ( g_YView.isLockEditing() ) return true;

		g_YView.startNodeEdit(node);
	}
	return true;
}

function NodeDblClick(evt,nodeID) {
	return false;
}

function NodeMouseOver(evt,nodeID) {
	if ( g_YView.bNodeEditing || g_YView.bPopupDisplayed ) return false;

	evt = (evt) ? evt:window.event;
	
	if ( evt.shiftKey || evt.ctrlKey || g_YView.getSelectedNodeCount() > 1) {
		return;
	}
	
	if ( nodeID == g_YView.tree.rootNodeID ) {
		var oDiv = g_YView.getNodeDiv(g_YView.tree.rootNode);
		var oDivPos = getPosition(oDiv);
		var mousePos = mouseCoords(evt);
		if ( mousePos.x > (oDivPos.x + parseInt(oDiv.offsetWidth/2,10)) ) {
			g_YView.selectNode(nodeID, false, g_YView.tree.NODE_POS_RIGHT);
			g_YView.dragPos = g_YView.tree.NODE_POS_RIGHT;
		} else {
			g_YView.selectNode(nodeID, false, g_YView.tree.NODE_POS_LEFT);
			g_YView.dragPos = g_YView.tree.NODE_POS_LEFT;
		}
		return;
	}
	g_YView.selectNode(nodeID, false);
	
	if ( g_YView.getSelectedNodeCount() == 1 && !g_YView.bNodeEditing ) {
		
		if ( g_YView.isLockEditing() ) return true;

		makeDraggable(g_YView.getNodeDiv(g_YView.tree.getNodeById(nodeID)));
	}
}


function NodeContextMenu(evt,nodeID) {
	if ( g_YView.isLockEditing() ) return true;

	evt = evt || window.event;
	
	if ( g_YView.isLockEditing() ) return true;

	var node = g_YView.tree.getNodeById(nodeID);
	if ( node == null ) return;
	
	g_YView.selectNode(node, evt.shiftKey || evt.ctrlKey);
	
	g_YView.showPopupMain(evt);
}

function switchMenu(evt, obj) {
	if ( obj.className=="menuItem") {
		obj.className="highlightItem";

	} else if ( obj.className=="highlightItem") {
		obj.className="menuItem";
	}
}

function clickMenu(evt, obj) {
	g_YView.hidePopupMenus();
	
	if ( g_YView.isLockEditing() ) return true;
	
	evt = evt || window.event;

	if ( obj.disabled == true ) return;
	
	if ( obj.id == "menuEditNode" ) {
		if ( g_YView.getSelectedNodeCount() != 1 ) return;
		
		var node = g_YView.getLastSelectedNode();
		if ( node == null ) return;
		
		g_YView.startNodeEdit(node);
	} else if ( obj.id == "menuRemoveNode" ) {
		g_YView.deleteSelectedNodes();
	} else if ( obj.id == "menuNewChildNode" ) {
		if ( g_YView.getSelectedNodeCount() != 1 ) return;
		
		var node = g_YView.getLastSelectedNode();
		if ( node == null ) return;
				
		var tmpNode = g_YView.appendChildNode(node);;
		if ( tmpNode ) {
			g_YView.startNodeEdit(tmpNode);
		}
	} else if ( obj.id == "menuNewSiblingdNode" ) {
		if ( g_YView.getSelectedNodeCount() != 1 ) return;
		
		var node = g_YView.getLastSelectedNode();
		if ( node == null ) return;
		
		if ( node.indent == 0 ) return;
				
		var tmpNode = g_YView.appendSiblingNode(node, g_YView.tree.NODE_SIB_NEXT);

		if ( tmpNode ) {
			g_YView.startNodeEdit(tmpNode);
		}
	} else if ( obj.id == "menuNewPrevSiblingdNode" ) {
		if ( g_YView.getSelectedNodeCount() != 1 ) return;
		
		var node = g_YView.getLastSelectedNode();
		if ( node == null ) return;
		
		if ( node.indent == 0 ) return;
				
		var tmpNode = g_YView.appendSiblingNode(node, g_YView.tree.NODE_SIB_PREV);

		if ( tmpNode ) {
			g_YView.startNodeEdit(tmpNode);
		}
	} else if ( obj.id == "menuNodeUp" ) {
		g_YView.swapSibNode( g_YView.NODE_NAV_UP );
	} else if ( obj.id == "menuNodeDown" ) {
		g_YView.swapSibNode( g_YView.NODE_NAV_DOWN );
	} else if ( obj.id == "menuToggleFolded" ) {
		if ( g_YView.getSelectedNodeCount() != 1 ) return;
		
		var node = g_YView.getLastSelectedNode();
		if ( node == null ) return;

		g_YView.toggleNode(node);
	} else if ( obj.id == "menuRemoveLastIcon" ) {
		g_YView.removeLastIcon();
	} else if ( obj.id == "menuRemoveAllIcon" ) {
		g_YView.removeAllIcon();
	} else if ( obj.id.indexOf("menuIcon") >= 0 ) {
		var oImg;
		if ( obj.tagName == "TR" || obj.tagName == "tr" ) {
			oImg = obj.childNodes[0].childNodes[0];
		} else {
			oImg = obj.childNodes[0];
		}
		var imgSrc = getRelPath(oImg.src).replace(".gif","");
		g_YView.appendIcon( imgSrc );
	} else if ( obj.id == "menuNewDoc" ) {
		if ( !confirm("All nodes will be removed!\nAre you sure?") ) {
			return;
		}
		g_YView.initMap("New MindWeb");
		
		// append your init code

	} else if ( obj.id == "menuSaveDoc" ) {
		var strXML = g_YView.tree.exportToXML();
		var strTXT = g_YView.tree.exportToText(false);
		var strTitle = g_YView.getContentTitle();
		
		// If the function mindweb_save is defined
		// call it to save.
		if (mindweb_save) {
			mindweb_save(strTitle, strXML, strTXT);
		}
		
	} else if ( obj.id == "menuConvertMap" ) {
		g_YView.toggleContentView();
	} else if ( obj.id == "menuExportMap" ) {
		g_YView.exportMap();
	} else if ( obj.id == "menuImportMap" ) {
		g_YView.importMap();
		g_YView.toggleContentView();
	} else if ( obj.id == "menuPrintDoc" ) {
		window.print();
	} else if ( obj.id == "menuItalic" ) {
		g_YView.toggleNodeStyle(g_YView.NODE_STYLE_ITALIC);
	} else if ( obj.id == "menuBold" ) {
		g_YView.toggleNodeStyle(g_YView.NODE_STYLE_BOLD);
	} else if ( obj.id == "menuCloseContentView" ) {
		g_YView.toggleContentView();
	}
	
}

function NodeIconClick(evt, oImg, nodeID, iconIdx) {
	evt = (evt) ? evt:window.event;
	
	if ( document.all ) {
		evt.cancelBubble = true;
	} else {
		evt.stopPropagation();
	}
	
	return false;
}

function NodeIconDblClick(evt, oImg, nodeID, iconIdx) {
	if ( g_YView.isLockEditing() ) return true;

	if ( g_YView.bNodeEditing || g_YView.bPopupDisplayed ) return false;
	
	evt = (evt) ? evt:window.event;

	if ( oImg == null ) {
		return false;
	}

	var node = g_YView.tree.getNodeById(nodeID);
	if ( node == undefined || node == null ) return false;
	
	if ( node.removeIcon(iconIdx) ) {
		g_YView.drawNode(node, true );
	}
	
	return false;
}


function NodeEditEnd(obj, nodeID) {
	node = g_YView.tree.getNodeById(nodeID);
	if ( node == null ) {
		return;
	}
	
	g_YView.stopNodeEdit(node);
	
	makeDraggable(g_YView.panelD);
}



///////////////////////////////////////////////////////////
// Key Code
YKEYCODE_TAB		= 9;
YKEYCODE_ENTER		= 13;

YKEYCODE_SPACE		= 32;
YKEYCODE_PAGEUP		= 33;
YKEYCODE_PAGEDN		= 34;
YKEYCODE_END		= 35;
YKEYCODE_HOME		= 36;
YKEYCODE_LEFT		= 37;
YKEYCODE_UP			= 38;
YKEYCODE_RIGHT		= 39;
YKEYCODE_DOWN		= 40;

YKEYCODE_INSERT		= 45;
YKEYCODE_DELETE		= 46;

YKEYCODE_F2			= 113;



