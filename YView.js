///////////////////////////////////////////////////////////
// The only one instance for YView
var g_YView = null;

///////////////////////////////////////////////////////////
// Tree View
YView.prototype				= new Object();
YView.prototype.constructor	= YView;
YView.superclass			= Object.prototype;

/*
* @brief construct tree's node view, make toolbar, popup menus.
* @param tree YTree instance.
* @param panelD HTML layer object for holding node's div elements.
* @param panelV VML or SVG layer object for holding node's link curve elements.
* @return
*/

function YView(tree, panelD, panelV) {
	this.tree					= tree;
	
	this.panelD					= panelD;
	this.panelV					= panelV;
	
	this.rootPosX				= panelD.offsetWidth/2;
	this.rootPosY				= 300;
	
	// hold all selected nodes' id
	this.selectedNodes			= new Array;
	this.lastSelectedNodeID		= "";
	
	// hold custom attributes
	this.attributes				= new Array;
	
	// Set as true when a node's text is edited.
	this.bNodeEditing			= false;

	this.CARET_ORG_START		= 0;
	this.CARET_ORG_END			= 1;
	
	this.NODE_NAV_PAGEUP		= 33;
	this.NODE_NAV_PAGEDN		= 34;
	this.NODE_NAV_LEFT			= 37;
	this.NODE_NAV_UP			= 38;
	this.NODE_NAV_RIGHT			= 39;
	this.NODE_NAV_DOWN			= 40;
	
	this.NODE_DIV_PREFIX		= "DIV";
	this.NODE_DIV_HGAP			= 20;
	this.NODE_DIV_VGAP			= 3;
	this.NODE_DIV_SELCOLOR		= "#D0D0D0";
	
	this.NODE_STYLE_BOLD		= 0;
	this.NODE_STYLE_ITALIC		= 1;

	this.NODE_LINK_PREFIX		= "LNK";
	this.NODE_LNK_WIDTH			= 1;
	this.NODE_LNK_COLOR			= "gray";
	
	this.ROOT_SHAPE_ID			= "V_ROOT";
	this.ROOT_SHAPE_HEIGHT		= 60;
	this.ROOT_SHAPE_STCOLOR		= "gray";
	this.ROOT_SHAPE_COLOR		= "white";
	this.ROOT_SHAPE_SELCOLOR	= "#D0D0D0";

	this.SVG_NAMESPACE			= "http://www.w3.org/2000/svg";
	this.SVG_RIGHTGRADIENT_ID	= "V_RGRA_ID";
	this.SVG_LEFTGRADIENT_ID	= "V_LGRA_ID";
	this.SVG_NUTRALGRADIENT_ID	= "V_NGRA_ID";
	
	this.ICON_PATH				= "icons";
	this.UIIMG_PATH				= "ui";

	this.POPUP_MAIN_ID			= "popupMain";
	this.POPUP_ICON_ID			= "popupIcon";
	this.bPopupDisplayed		= false;
	
	this.TOOLBAR_BAND_HEIGHT	= 28;
	this.TOOLBAR_MAIN_ID		= "toolbarMain";
	this.TOOLBAR_TITLE_ID		= "toolbarTitle";
	this.TOOLBAR_ICON_ID		= "toolbarIcon";
	
	this.CONTENT_VIEW_ID		= "contentView";
	this.CONTENT_FORM_ID		= "contentForm";
	this.CONTENT_TEXT_ID		= "contentText";

	this.dragObject				= null;
	this.dragPos				= 0;
	this.dragOldLeft			= 0;
	this.dragOldTop				= 0;
	this.mouseOffset			= null;
	
	if ( window.HTMLElement ) {
		this.createSVGElement();
	}
	
	this.createPopupMenus();
	this.createToolbarMenus();
	this.createContentView();

	this.bEditingLock			= false;
	this.bPermanentLock			= false;
	
	g_YView = this;
	this.centerPanelView();

	if ( document.all ) {
		panelD.onselectstart = function() { return (g_YView.bNodeEditing) ?true:false; }
	}
	panelD.onclick = function() { if ( !g_YView.bNodeEditing ) makeDraggable(panelD); g_YView.hidePopupMenus();}
}

YView.prototype.setAttribute = function(key, val) {
	this.attributes[key] = val;
}

YView.prototype.getAttribute = function(key) {
	if ( this.attributes[key] == undefined || this.attributes[key] == null ) {
		return null;
	}
	
	return this.attributes[key];
}

YView.prototype.removeAttribute = function(key) {
	if ( this.attributes[key] == undefined || this.attributes[key] == null ) {
		return null;
	}
	
	val = this.attributes[key];
	delete this.attributes[key];
	
	return val;
}

YView.prototype.isLockEditing = function() {
	return this.bEditingLock;
}

YView.prototype.lockEditing = function() {
	this.bEditingLock = true;
}

YView.prototype.unLockEditing = function() {
	if ( this.bPermanentLock ) return;
	this.bEditingLock = false;
}

YView.prototype.isPermanentLocked = function() {
	return this.bPermanentLock;
}

YView.prototype.setPermanentLock = function(val) {
	this.bPermanentLock = val;
	
	if ( val ) {
		var oInput = document.getElementById(this.TOOLBAR_TITLE_ID);
		if ( oInput ) {
			oInput.readOnly = true;
		}
	} else {
		var oInput = document.getElementById(this.TOOLBAR_TITLE_ID);
		if ( oInput ) {
			oInput.readOnly = false;
		}
	}
}

YView.prototype.toggleContentView = function() {
	var oPanel = document.getElementById(this.CONTENT_VIEW_ID);
	
	if ( oPanel == null ) return false;
	
	if ( oPanel.style.display == "none" ) {
		oPanel.style.display = "";
	} else {
		oPanel.style.display = "none";
	}
}

YView.prototype.exportMap = function() {
	this.setContentViewText(this.tree.exportToXML());
}

YView.prototype.importMap = function() {
	var xmlString = '<?xml version="1.0" encoding="UTF-8"?>' + this.getContentViewText();
	this.initMap("New MindWeb");
	this.tree.loadFromXML(xmlString);
	this.redrawTree();
}

YView.prototype.setContentTitle = function(str) {
	var oInput = document.getElementById(this.TOOLBAR_TITLE_ID);
	
	if ( oInput == null ) return;
	
	oInput.value = str;
}

YView.prototype.getContentTitle = function() {
	var oInput = document.getElementById(this.TOOLBAR_TITLE_ID);
	
	if ( oInput == null ) return "";
	
	return oInput.value;
}

YView.prototype.setContentViewText = function(str) {
	var oForm = document.getElementById(this.CONTENT_FORM_ID);
	
	if ( oForm == null ) return;
	
	oForm.childNodes[0].value = str;
}

YView.prototype.getContentViewText = function() {
	var oForm = document.getElementById(this.CONTENT_FORM_ID);

	if ( oForm == null ) return "";

	return oForm.childNodes[0].value;
}

YView.prototype.createContentView = function() {
	var ms =
	[
		['menuCloseContentView',this.UIIMG_PATH + '/btn_close.gif',			'Hide',				'',		''],
		['','','-','',''],
		['menuExportMap',		this.UIIMG_PATH + '/btn_exportmap.gif',		'Export FreeMind',	'',		''],
		['menuImportMap',		this.UIIMG_PATH + '/btn_importmap.gif',		'Import FreeMind',	'',		'']
	];
	
	var msLen = ms.length;

	var TOOLBAR_PANEL_CLASSNAME	= "toolbarMenu";
	var TOOLBUTTON_CLASSNAME	= "toolButton";

	var M_ID	= 0;
	var M_ICON	= 1;
	var M_TEXT	= 2;
	var M_KEY	= 3;
	var M_SUB	= 4;
	
	var onclick = "clickMenu(event, this)";

	var oToolBarMain = document.createElement("table");
	document.body.appendChild(oToolBarMain);
	
	var onfocus = "g_YView.lockEditing()";
	var onblur = "g_YView.unLockEditing()";
	
	if ( document.all ) {
		var str = "<table id='" + this.CONTENT_VIEW_ID + "' cellpadding='0' cellspacing='0' class='" + TOOLBAR_PANEL_CLASSNAME + "'><tr height='" + this.TOOLBAR_BAND_HEIGHT + "'>";
		
		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			if ( menuItem[M_TEXT] == '-' ) {
				str += "<td class='vsplit'><img src='" + this.UIIMG_PATH + "/btn_null.gif' width='1' heigth='1'></td>";
				continue;
			}

			str += "<td id='" + menuItem[M_ID] + "' class='" + TOOLBUTTON_CLASSNAME + "'";
			str += " title='" + menuItem[M_TEXT] + "'";
			str += " onclick='" + onclick + "'";
			str += "><img src='" + menuItem[M_ICON] + "'></td>";
		}
		
		str += "<td width='100%'></td></tr>";
		
		str += "<td width='100%' colspan='" + (msLen + 1) + "'>";
		str += "<form id='" + this.CONTENT_FORM_ID + "' style='margin:0px;'>";
		str += "<textarea id='" + this.CONTENT_TEXT_ID + "' onfocus='" + onfocus + "' onblur='" + onblur + "' style='width:100%;height:320px;'></textarea></form>";
		str += "</td></tr></table>";

		oToolBarMain.outerHTML = str;
		
		oToolBarMain = document.getElementById(this.CONTENT_VIEW_ID);
	} else {
		oToolBarMain.setAttribute("id", this.CONTENT_VIEW_ID);
		oToolBarMain.cellPadding = 0 + "px";
		oToolBarMain.cellSpacing = 0 + "px";
		oToolBarMain.className = TOOLBAR_PANEL_CLASSNAME;
		
		var oBand = document.createElement("tr");
		oToolBarMain.appendChild(oBand);

		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			var oButton = document.createElement("td");
			oBand.appendChild(oButton);
			
			if ( menuItem[M_TEXT] == '-' ) {
				oButton.className = "vsplit";
				
				var oImg	= document.createElement("img");
				oImg.setAttribute("src", this.UIIMG_PATH + "/btn_null.gif");
				oImg.width = 1;
				oImg.heigth = 1;
				
				oButton.appendChild(oImg);
				continue;
			}
			
			oButton.className = TOOLBUTTON_CLASSNAME;
			oButton.setAttribute("id", menuItem[M_ID]);
			oButton.setAttribute("onclick", onclick);
			
			var oImg	= document.createElement("img");
			oImg.setAttribute("src", menuItem[M_ICON]);
			oImg.title = menuItem[M_TEXT];
			oImg.alt = menuItem[M_TEXT];
			oImg.setAttribute("alt", menuItem[M_TEXT]);
			oImg.setAttribute("title", menuItem[M_TEXT]);
			oButton.appendChild(oImg);
		}
		
		var oButton = document.createElement("td");
		oButton.width = "100%";
		
		oBand.appendChild(oButton);
		
		var oRow = document.createElement("tr");
		oToolBarMain.appendChild(oRow);

		var oCell = document.createElement("td");
		oCell.colSpan = msLen+1;
		oRow.appendChild(oCell);
		
		var oForm = document.createElement("form");
		oForm.setAttribute("id", this.CONTENT_FORM_ID);
		oForm.style.margin = 0 + "px";
		oCell.appendChild(oForm);
		
		var oTextArea = document.createElement("textarea");
		oTextArea.setAttribute("onfocus", onfocus);
		oTextArea.setAttribute("onblur", onblur);
		oTextArea.setAttribute("id", this.CONTENT_TEXT_ID);
		oTextArea.style.width = "100%";
		oTextArea.style.height = "320px";
		oForm.appendChild(oTextArea);
		
	}
	
	oToolBarMain.style.height = 360 + "px";
	oToolBarMain.style.left = 0 + "px";
	oToolBarMain.style.top = (this.TOOLBAR_BAND_HEIGHT) + "px";
	
	oToolBarMain.style.display = "none";
}

YView.prototype.createToolbarMenus = function() {
	var ms =
	[
		['menuSaveDoc',				this.UIIMG_PATH + '/btn_save.gif',			'Save',				'Ctrl+S',	''],
		['','','-','',''],
		['menuNewDoc',				this.UIIMG_PATH + '/btn_new.gif',			'New', 				'Ctrl+N',	''],
		['menuConvertMap',			this.UIIMG_PATH + '/btn_convertmap.gif',	'Import/Export Map','Ctrl+P',	''],
		['menuPrintDoc',			this.UIIMG_PATH + '/btn_print.gif',			'Print...',			'Ctrl+P',	''],
		['','','-','',''],
		['menuNewChildNode',		this.UIIMG_PATH + '/btn_newchild.gif',		'New Child Node',	'Insert',	''],
		['menuItalic',				this.UIIMG_PATH + '/btn_italic.gif',		'Italic',			'Ctrl+I',	''],
		['menuBold',				this.UIIMG_PATH + '/btn_bold.gif',			'Bold',				'Ctrl+B',	'']
	];
	
	

	var TOOLBAR_PANEL_CLASSNAME	= "toolbarMenu";
	var TOOLBUTTON_CLASSNAME	= "toolButton";

	var M_ID	= 0;
	var M_ICON	= 1;
	var M_TEXT	= 2;
	var M_KEY	= 3;
	var M_SUB	= 4;

	var onclick = "clickMenu(event, this)";

	var msLen = ms.length;
	var oToolBarMain = document.createElement("table");
	document.body.appendChild(oToolBarMain);

	var onfocus = "g_YView.lockEditing()";
	var onblur = "g_YView.unLockEditing()";
	
	if ( document.all ) {
		var str = "<table id='" + this.TOOLBAR_MAIN_ID + "' cellpadding='0' cellspacing='0' class='" + TOOLBAR_PANEL_CLASSNAME + "'><tr>";
		
		str += "<td><img src='" + this.UIIMG_PATH + "/label_title.gif'></td>";
		str += "<td><input id='" + this.TOOLBAR_TITLE_ID + "' onfocus='" + onfocus + "' onblur='" + onblur + "' type='text' maxlength='128' size='108' style='height:18px;'></td>";
		
		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			if ( menuItem[M_TEXT] == '-' ) {
				str += "<td class='vsplit'><img src='" + this.UIIMG_PATH + "/btn_null.gif' width='1' heigth='1'></td>";
				continue;
			}

			str += "<td id='" + menuItem[M_ID] + "' class='" + TOOLBUTTON_CLASSNAME + "'";
			str += " title='" + menuItem[M_TEXT] + "'";
			str += " onclick='" + onclick + "'";
			str += "><img src='" + menuItem[M_ICON] + "'></td>";
		}
		
		str += "<td width='100%'></td></tr></table>";
		oToolBarMain.outerHTML = str;
		
		oToolBarMain = document.getElementById(this.TOOLBAR_MAIN_ID);
	} else {
		oToolBarMain.setAttribute("id", this.TOOLBAR_MAIN_ID);
		oToolBarMain.cellPadding = 0 + "px";
		oToolBarMain.cellSpacing = 0 + "px";
		oToolBarMain.className = TOOLBAR_PANEL_CLASSNAME;
		
		var oButton = document.createElement("td");
			var oImg = document.createElement("img");
			oImg.src = this.UIIMG_PATH + '/label_title.gif';
			oButton.appendChild(oImg);
		oToolBarMain.appendChild(oButton);
		
		oButton = document.createElement("td");
		oButton.style.padding = "0px";
			var oInput = document.createElement("input");
			oInput.setAttribute("id", this.TOOLBAR_TITLE_ID);
			oInput.setAttribute("onfocus", onfocus);
			oInput.setAttribute("onblur", onblur);
			oInput.type = "text";
			oInput.maxlength = 128;
			oInput.size = 108;
			oInput.style.height = "14px";
			oButton.appendChild(oInput);
		oToolBarMain.appendChild(oButton);

		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			var oButton = document.createElement("td");
			oToolBarMain.appendChild(oButton);
			
			if ( menuItem[M_TEXT] == '-' ) {
				oButton.className = "vsplit";
				
				var oImg	= document.createElement("img");
				oImg.setAttribute("src", this.UIIMG_PATH + "/btn_null.gif");
				oImg.width = 1;
				oImg.heigth = 1;
				
				oButton.appendChild(oImg);
				continue;
			}
			
			oButton.className = TOOLBUTTON_CLASSNAME;
			oButton.setAttribute("id", menuItem[M_ID]);
			oButton.setAttribute("onclick", onclick);
			
			var oImg	= document.createElement("img");
			oImg.setAttribute("src", menuItem[M_ICON]);
			oImg.title = menuItem[M_TEXT];
			oImg.alt = menuItem[M_TEXT];
			oImg.setAttribute("alt", menuItem[M_TEXT]);
			oImg.setAttribute("title", menuItem[M_TEXT]);
			oButton.appendChild(oImg);
		}
		
		oButton = document.createElement("td");
		oButton.width = "100%";
		oToolBarMain.appendChild(oButton);
	}
	
	oToolBarMain.style.height = this.TOOLBAR_BAND_HEIGHT + "px";
	oToolBarMain.style.left = 0 + "px";
	oToolBarMain.style.top = 0 + "px";
	
	ms =
	[
		['menuRemoveLastIcon',		this.UIIMG_PATH + '/btn_x.gif',				'Remove Last Icon',	'',			''],
		['menuRemoveAllIcon',		this.UIIMG_PATH + '/btn_trash.gif',			'Remove All Icons',	'',			''],
		['','','-','',''],
		['menuIconQuestion',		this.ICON_PATH + "/help.gif",				'Question',			'',			''],
		['menuIconImportant',		this.ICON_PATH + "/messagebox_warning.gif",	'Important',		'',			''],
		['menuIconIdea',			this.ICON_PATH + "/idea.gif",				'Idea',				'',			''],
		['menuIconOK',				this.ICON_PATH + "/button_ok.gif",			'OK',				'',			''],
		['menuIconNotOK',			this.ICON_PATH + "/button_cancel.gif",		'Not OK',			'',			''],
		['menuIconPriority1',		this.ICON_PATH + "/full-1.gif",				'Priority 1',		'',			''],
		['menuIconPriority2',		this.ICON_PATH + "/full-2.gif",				'Priority 2',		'',			''],
		['menuIconPriority3',		this.ICON_PATH + "/full-3.gif",				'Priority 3',		'',			''],
		['menuIconPriority4',		this.ICON_PATH + "/full-4.gif",				'Priority 4',		'',			''],
		['menuIconPriority5',		this.ICON_PATH + "/full-5.gif",				'Priority 5',		'',			''],
		['menuIconPriority6',		this.ICON_PATH + "/full-6.gif",				'Priority 6',		'',			''],
		['menuIconPriority7',		this.ICON_PATH + "/full-7.gif",				'Priority 7',		'',			''],
		['menuIconBack',			this.ICON_PATH + "/back.gif",				'Back',				'',			''],
		['menuIconForward',			this.ICON_PATH + "/forward.gif",			'Forward',			'',			''],
		['menuIconLookHere',		this.ICON_PATH + "/attach.gif",				'Look here',		'',			''],
		['menuIconIamhappy',		this.ICON_PATH + "/ksmiletris.gif",			'I am happy',		'',			''],
		['menuIconDangerous',		this.ICON_PATH + "/clanbomber.gif",			'Dangerous',		'',			''],
		['menuIconDonotforget',		this.ICON_PATH + "/desktop_new.gif",		'Do not forget',	'',			''],
		['menuIconFlag',			this.ICON_PATH + "/flag.gif",				'Flag',				'',			''],
		['menuIconHome',			this.ICON_PATH + "/gohome.gif",				'Home',				'',			''],
		['menuIconPhone',			this.ICON_PATH + "/kaddressbook.gif",		'Phone',			'',			''],
		['menuIconMusic',			this.ICON_PATH + "/knotify.gif",			'Music',			'',			''],
		['menuIconMailbox',			this.ICON_PATH + "/korn.gif",				'Mailbox',			'',			''],
		['menuIconMail',			this.ICON_PATH + "/Mail.gif",				'Mail',				'',			''],
		['menuIconKey',				this.ICON_PATH + "/password.gif",			'Key',				'',			''],
		['menuIconToberefined',		this.ICON_PATH + "/pencil.gif",				'To be refined',	'',			''],
		['menuIconStop',			this.ICON_PATH + "/stop.gif",				'Stop',				'',			''],
		['menuIconMagic',			this.ICON_PATH + "/wizard.gif",				'Magic',			'',			''],
		['menuIconTobediscussed',	this.ICON_PATH + "/xmag.gif",				'To be discussed',	'',			''],
		['menuIconRemember',		this.ICON_PATH + "/bell.gif",				'Remember',			'',			''],
		['menuIconExcellent',		this.ICON_PATH + "/bookmark.gif",			'Excellent',		'',			''],
		['menuIconLinux',			this.ICON_PATH + "/penguin.gif",			'Linux',			'',			''],
		['menuIconNice',			this.ICON_PATH + "/licq.gif",				'Nice',				'',			'']
	];
	
	msLen = ms.length;

	var oToolBarIcon = document.createElement("table");
	document.body.appendChild(oToolBarIcon);
	if ( document.all ) {
		var str = "<table id='" + this.TOOLBAR_ICON_ID + "' cellpadding='0' cellspacing='0' class='" + TOOLBAR_PANEL_CLASSNAME + "'><tr>";
		
		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			if ( menuItem[M_TEXT] == '-' ) {
				str += "<td class='vsplit'><img src='" + this.UIIMG_PATH + "/btn_null.gif' width='1' heigth='1'></td>";
				continue;
			}

			str += "<td id='" + menuItem[M_ID] + "' class='" + TOOLBUTTON_CLASSNAME + "'";
			str += " title='" + menuItem[M_TEXT] + "'";
			str += " onclick='" + onclick + "'";
			str += "><img src='" + menuItem[M_ICON] + "'></td>";
		}
		
		str += "<td width='100%'></td></tr></table>";
		oToolBarIcon.outerHTML = str;
		
		oToolBarIcon = document.getElementById(this.TOOLBAR_ICON_ID);
	} else {
		oToolBarIcon.setAttribute("id", this.TOOLBAR_ICON_ID);
		oToolBarIcon.cellPadding = 0 + "px";
		oToolBarIcon.cellSpacing = 0 + "px";
		oToolBarIcon.className = TOOLBAR_PANEL_CLASSNAME;

		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			var oButton = document.createElement("td");
			oToolBarIcon.appendChild(oButton);
			
			if ( menuItem[M_TEXT] == '-' ) {
				oButton.className = "vsplit";
				
				var oImg	= document.createElement("img");
				oImg.setAttribute("src", this.UIIMG_PATH + "/btn_null.gif");
				oImg.width = 1;
				oImg.heigth = 1;
				
				oButton.appendChild(oImg);
				continue;
			}
			
			oButton.className = TOOLBUTTON_CLASSNAME;
			oButton.setAttribute("id", menuItem[M_ID]);
			oButton.setAttribute("onclick", onclick);
			
			var oImg	= document.createElement("img");
			oImg.setAttribute("src", menuItem[M_ICON]);
			oImg.title = menuItem[M_TEXT];
			oImg.alt = menuItem[M_TEXT];
			oImg.setAttribute("alt", menuItem[M_TEXT]);
			oImg.setAttribute("title", menuItem[M_TEXT]);
			oButton.appendChild(oImg);
		}
		
		var oButton = document.createElement("td");
		oButton.width = "100%";
		oToolBarIcon.appendChild(oButton);
	}
	
	oToolBarIcon.style.height = this.TOOLBAR_BAND_HEIGHT + "px";
	oToolBarIcon.style.left = 0 + "px";
	oToolBarIcon.style.top = this.TOOLBAR_BAND_HEIGHT + "px";
}

YView.prototype.centerPanelView = function() {
	if ( document.all ) {
		var w = 2048;
		var h = 4096;
	
		this.panelD.style.width = w + "px";
		this.panelD.style.height = h + "px";
		
		this.panelD.style.left = parseInt((document.body.clientWidth - w)/2, 10) + "px";
		this.panelD.style.top = 0 - (h/2) + 300 + "px";
	}
}

YView.prototype.showPopupMain = function(evt) {
	var oDiv = document.getElementById(this.POPUP_MAIN_ID);

	if ( oDiv == null ) return;
	
	oDiv.style.left = evt.clientX + this.panelD.scrollLeft + "px";
	oDiv.style.top = evt.clientY + this.panelD.scrollTop + "px";
	oDiv.style.display="inline";

	this.bPopupDisplayed = true;
}

YView.prototype.hidePopupSubs = function() {
	var oDivs =
	[
		document.getElementById(this.POPUP_ICON_ID)
	];
	
	for ( var i=0; i<oDivs.length; i++ ) {
		oDivs[i].style.display = "none";
	}
}

YView.prototype.showPopupSub = function(mTR, subID) {
	this.hidePopupSubs();
	var oPos = getPosition(mTR);

	var oDiv = document.getElementById(subID);
	if ( oDiv == null ) return;

	oDiv.style.display = "";
	
	oDiv.style.left = oPos.x + mTR.offsetWidth - 20 + "px";
	oDiv.style.top = oPos.y - parseInt(oDiv.offsetHeight/2,10) + "px";
}

YView.prototype.hidePopupMenus = function() {
	var oDivs =
	[
		document.getElementById(this.POPUP_MAIN_ID),
		document.getElementById(this.POPUP_ICON_ID)
	];
	
	for ( var i=0; i<oDivs.length; i++ ) {
		oDivs[i].style.display = "none";
	}
	
	this.bPopupDisplayed = false;
}

YView.prototype.createPopupMenus = function() {
	var ms =
	[
		['menuEditNode',			'',					'Edit Node', 				'F2',			''],
		['menuEditLongNode',		'',					'Edit Long Node...',		'Alt+Enter', 	''],
		['menuRemoveNode',			'btn_remove.gif',	'Remove Node',				'Delete',		''],
		['',						'',					'-',						'',				''],
		['menuNewChildNode',		'btn_newchild.gif',	'New Child Node',			'Insert',		''],
		['menuNewSiblingdNode',		'',					'New Sibling Node',			'Enter',		''],
		['menuNewPrevSiblingdNode',	'',					'New Previous Sibling Node','Shif+Enter',	''],
		['',						'',					'-',						'',				''],
		['menuNodeUp',				'',					'Node Up',					'Ctrl+Up',		''],
		['menuNodeDown',				'',				'Node Down',				'Ctrl+Down',	''],
		['',						'',					'-',						'',				''],
		['menuToggleFolded',		'',					'Toggle Folded',			'Space',		''],
		['',						'',					'-',						'',				''],
		['menuRemoveLastIcon',		'btn_x.gif',		'Remove Last Icon',			'',				''],
		['menuRemoveAllIcon',		'btn_trash.gif',	'Remove All Icons',			'',				''],
		['menuIcons',				'',					'Icons',					'',				this.POPUP_ICON_ID]
	];
	var msLen = ms.length;

	var POPUP_PANEL_CLASSNAME	= "popupMenu";
		var MENUITEM_CLASSNAME		= "menuItem";
			var MENUICON_CLASSNAME		= "icon";
			var MENUTEXT_CLASSNAME		= "text";
			var MENUKEY_CLASSNAME		= "key";
			var MENUSUB_CLASSNAME		= "sub";
	
	var M_ID	= 0;
	var M_ICON	= 1;
	var M_TEXT	= 2;
	var M_KEY	= 3;
	var M_SUB	= 4;

	var onclick = "clickMenu(event, this)";
	var onmouseover = "switchMenu(event, this)";
	var onmouseout = "switchMenu(event, this)";

	var oPanelMain = document.createElement("table");
	document.body.appendChild(oPanelMain);
	
	if ( document.all ) {
		var str = "<table id='" + this.POPUP_MAIN_ID + "' cellpadding='0' cellspacing='0' class='" + POPUP_PANEL_CLASSNAME + "'>";
		
		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			str += "<tr";
		
			if ( menuItem[M_TEXT] == '-' ) {
				str += "><td colspan='4' class='split'></td></tr>";
				continue;
			}
			
			str += " id='" + menuItem[M_ID] + "' class='" + MENUITEM_CLASSNAME + "'";
			str += " onclick='" + onclick + "'";
			str += " onmouseover=\"" + onmouseover + ((menuItem[M_SUB]=='')? ";g_YView.hidePopupSubs()":";g_YView.showPopupSub(this,'" + menuItem[M_SUB] + "')") + "\"";
			str += " onmouseout=\"" + onmouseout + "\"";
			str += ">";

			str += "<td class='" + MENUICON_CLASSNAME + "'><img src='";
			if ( menuItem[M_ICON] != '' ) {
				str += this.UIIMG_PATH + "/" + menuItem[M_ICON];
			} else {
				str += this.UIIMG_PATH + "/btn_null.gif";
			}
			str += "'></td>";
			
			str += "<td class='" + MENUTEXT_CLASSNAME + "'>" + menuItem[M_TEXT] + "</td>";
			str += "<td class='" + MENUKEY_CLASSNAME + "'>" + menuItem[M_KEY] + "</td>";
			str += "<td class='" + MENUSUB_CLASSNAME + "'>" + ((menuItem[M_SUB] == '')? "":">") + "</td>";
			
			str += "</tr>";
		}
		
		str += "</table>";
		oPanelMain.outerHTML = str;
		
		oPanelMain = document.getElementById(this.POPUP_MAIN_ID);
	} else {
		oPanelMain.setAttribute("id", this.POPUP_MAIN_ID);
		oPanelMain.cellPadding = 0 + "px";
		oPanelMain.cellSpacing = 0 + "px";
		oPanelMain.className = POPUP_PANEL_CLASSNAME;

		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			var oMenuItem = document.createElement("tr");
			
			if ( menuItem[M_TEXT] == '-' ) {
				var oHR = document.createElement("td");
				oPanelMain.appendChild(oMenuItem);
				oHR.className = "split";
				oHR.colSpan = 4;
	
				oMenuItem.appendChild(oHR);
				
				continue;
			}
			
			oMenuItem.setAttribute("id", menuItem[M_ID]);
			oMenuItem.className = MENUITEM_CLASSNAME;
			
			oMenuItem.setAttribute("onclick", onclick);
			oMenuItem.setAttribute("onmouseover", onmouseover + ((menuItem[M_SUB]=='')? ";g_YView.hidePopupSubs()":";g_YView.showPopupSub(this,'" + menuItem[M_SUB] + "')") );
			oMenuItem.setAttribute("onmouseout", onmouseout);
			
			oPanelMain.appendChild(oMenuItem);
			
			var oIcon	= document.createElement("td");
				var oImg	= document.createElement("img");
			var oText	= document.createElement("td");
			var oKey	= document.createElement("td");
			var oSub	= document.createElement("td");
			
			oIcon.className	= MENUICON_CLASSNAME;
			oText.className	= MENUTEXT_CLASSNAME;
			oKey.className	= MENUKEY_CLASSNAME;
			oSub.className	= MENUSUB_CLASSNAME;
			
			
			if ( menuItem[M_ICON] != '' ) {
				oImg.setAttribute("src", menuItem[M_ICON]);
			} else {
				oImg.setAttribute("src", this.UIIMG_PATH + "/btn_null.gif");
			}
			oText.innerHTML	= menuItem[M_TEXT];
			oKey.innerHTML	= menuItem[M_KEY];
			oSub.innerHTML	= ((menuItem[M_SUB] == '')? "":">");
			
			oMenuItem.appendChild(oIcon);
				oIcon.appendChild(oImg);
			oMenuItem.appendChild(oText);
			oMenuItem.appendChild(oKey);
			oMenuItem.appendChild(oSub);
			
		}
	}	
	
	oPanelMain.style.display = "none";
	
	
	
	ms =
	[
		['menuIconQuestion',		this.ICON_PATH + "/help.gif",				'Question'],
		['menuIconImportant',		this.ICON_PATH + "/messagebox_warning.gif",	'Important'],
		['menuIconIdea',			this.ICON_PATH + "/idea.gif",				'Idea'],
		['menuIconOK',				this.ICON_PATH + "/button_ok.gif",			'OK'],
		['menuIconNotOK',			this.ICON_PATH + "/button_cancel.gif",		'Not OK'],
		['menuIconPriority1',		this.ICON_PATH + "/full-1.gif",				'Priority 1'],
		['menuIconPriority2',		this.ICON_PATH + "/full-2.gif",				'Priority 2'],
		['menuIconPriority3',		this.ICON_PATH + "/full-3.gif",				'Priority 3'],
		['menuIconPriority4',		this.ICON_PATH + "/full-4.gif",				'Priority 4'],
		['menuIconPriority5',		this.ICON_PATH + "/full-5.gif",				'Priority 5'],
		['menuIconPriority6',		this.ICON_PATH + "/full-6.gif",				'Priority 6'],
		['menuIconPriority7',		this.ICON_PATH + "/full-7.gif",				'Priority 7'],
		['menuIconBack',			this.ICON_PATH + "/back.gif",				'Back'],
		['menuIconForward',			this.ICON_PATH + "/forward.gif",			'Forward'],
		['menuIconLookHere',		this.ICON_PATH + "/attach.gif",				'Look here'],
		['menuIconIamhappy',		this.ICON_PATH + "/ksmiletris.gif",			'I am happy'],
		['menuIconDangerous',		this.ICON_PATH + "/clanbomber.gif",			'Dangerous'],
		['menuIconDonotforget',		this.ICON_PATH + "/desktop_new.gif",		'Do not forget'],
		['menuIconFlag',			this.ICON_PATH + "/flag.gif",				'Flag'],
		['menuIconHome',			this.ICON_PATH + "/gohome.gif",				'Home'],
		['menuIconPhone',			this.ICON_PATH + "/kaddressbook.gif",		'Phone'],
		['menuIconMusic',			this.ICON_PATH + "/knotify.gif",			'Music'],
		['menuIconMailbox',			this.ICON_PATH + "/korn.gif",				'Mailbox'],
		['menuIconMail',			this.ICON_PATH + "/Mail.gif",				'Mail'],
		['menuIconKey',				this.ICON_PATH + "/password.gif",			'Key'],
		['menuIconToberefined',		this.ICON_PATH + "/pencil.gif",				'To be refined'],
		['menuIconStop',			this.ICON_PATH + "/stop.gif",				'Stop'],
		['menuIconMagic',			this.ICON_PATH + "/wizard.gif",				'Magic'],
		['menuIconTobediscussed',	this.ICON_PATH + "/xmag.gif",				'To be discussed'],
		['menuIconRemember',		this.ICON_PATH + "/bell.gif",				'Remember'],
		['menuIconExcellent',		this.ICON_PATH + "/bookmark.gif",			'Excellent'],
		['menuIconLinux',			this.ICON_PATH + "/penguin.gif",			'Linux'],
		['menuIconNice',			this.ICON_PATH + "/licq.gif",				'Nice']
	];
	msLen = ms.length;
	
	var oPanelIcon = document.createElement("table");
	document.body.appendChild(oPanelIcon);
	
	if ( document.all ) {
		var str = "<table id='" + this.POPUP_ICON_ID + "' cellpadding='0' cellspacing='0' class='" + POPUP_PANEL_CLASSNAME + "'>";
		
		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			str += "<tr";
		
			if ( menuItem[M_TEXT] == '-' ) {
				str += "><td colspan='2' class='split'></td></tr>";
				continue;
			}

			str += " id='" + menuItem[M_ID] + "' class='" + MENUITEM_CLASSNAME + "'";
			str += " onclick='" + onclick + "'";
			str += " onmouseover='" + onmouseover + "'";
			str += " onmouseout='" + onmouseout + "'";
			str += ">";

			str += "<td class='" + MENUICON_CLASSNAME + "'><img src='" + menuItem[M_ICON] + "'></td>";
			str += "<td class='" + MENUTEXT_CLASSNAME + "'>" + menuItem[M_TEXT] + "</td>";
			
			str += "</tr>";
		}
		
		str += "</table>";
		oPanelIcon.outerHTML = str;
		
		oPanelIcon = document.getElementById(this.POPUP_ICON_ID);
	} else {
		oPanelIcon.setAttribute("id", this.POPUP_ICON_ID);
		oPanelIcon.cellPadding = 0 + "px";
		oPanelIcon.cellSpacing = 0 + "px";
		oPanelIcon.className = POPUP_PANEL_CLASSNAME;

		for ( var i=0; i<msLen; i++ ) {
			var menuItem = ms[i];
			
			var oMenuItem = document.createElement("tr");
			
			if ( menuItem[M_TEXT] == '-' ) {
				var oHR = document.createElement("td");
				oPanelIcon.appendChild(oMenuItem);
				oHR.className = "split";
				oHR.colSpan = 2;
	
				oMenuItem.appendChild(oHR);
				
				continue;
			}
			
			oMenuItem.setAttribute("id", menuItem[0]);
			oMenuItem.className = MENUITEM_CLASSNAME;
			
			oMenuItem.setAttribute("onclick", onclick);
			oMenuItem.setAttribute("onmouseover", onmouseover);
			oMenuItem.setAttribute("onmouseout", onmouseout);
			
			oPanelIcon.appendChild(oMenuItem);
			
			var oIcon	= document.createElement("td");
				var oImg	= document.createElement("img");
			var oText	= document.createElement("td");
			
			oIcon.className	= MENUICON_CLASSNAME;
			oText.className	= MENUTEXT_CLASSNAME;
			
			
			oImg.setAttribute("src", menuItem[M_ICON]);
			oText.innerHTML	= menuItem[M_TEXT];
			
			oMenuItem.appendChild(oIcon);
				oIcon.appendChild(oImg);
			oMenuItem.appendChild(oText);
		}
	}	
	
	oPanelIcon.style.display = "none";
}

YView.prototype.createSVGElement = function() {
	// Node collapsed end marker
	var oMarker = document.createElementNS(this.SVG_NAMESPACE, "marker");
	
	oMarker.setAttribute("id", "EndMarker");
	oMarker.setAttribute("markerUnits", "userSpaceOnUse");

	//if 
	oMarker.setAttribute("viewBox", "0 0 16 16");

	oMarker.setAttribute("refX", "0");
	oMarker.setAttribute("refY", "8");
	oMarker.setAttribute("fill", this.NODE_LNK_COLOR);

	if ( this.NODE_LNK_WIDTH == 1 ) {
		oMarker.setAttribute("markerWidth", this.NODE_LNK_WIDTH*8);
	} else {
		oMarker.setAttribute("markerWidth", this.NODE_LNK_WIDTH*4);
	}

	oMarker.setAttribute("markerHeight", this.NODE_LNK_WIDTH*8);
	oMarker.setAttribute("orient", "auto");

	this.panelV.appendChild(oMarker);
	
	var oCircle = document.createElementNS(this.SVG_NAMESPACE, "circle");
	
	oCircle.setAttribute("cx", "8");
	oCircle.setAttribute("cy", "8");
	oCircle.setAttribute("r", "8");
	oCircle.setAttribute("r", "8");
	
	oMarker.appendChild(oCircle);
	
	// Root node left|right|nutral gradient
	var oGra = new Array(3);
	var oGraIds = new Array(
		this.SVG_RIGHTGRADIENT_ID,
		this.SVG_LEFTGRADIENT_ID,
		this.SVG_NUTRALGRADIENT_ID);
	var oStop = new Array(6);
	
	for ( var i=0; i<oGra.length; i++ ) {
		oGra[i] = document.createElementNS(this.SVG_NAMESPACE, "linearGradient");
		oGra[i].setAttribute("id", oGraIds[i]);
		
		oStop[i*2] = document.createElementNS(this.SVG_NAMESPACE, "stop");
		oStop[i*2+1] = document.createElementNS(this.SVG_NAMESPACE, "stop");

		oStop[i*2].setAttribute("offset", "0%");
		oStop[i*2+1].setAttribute("offset", "100%");

		oGra[i].appendChild(oStop[i*2]);
		oGra[i].appendChild(oStop[i*2+1]);
		
		this.panelV.appendChild(oGra[i]);
	}
	
	oStop[0].setAttribute("stop-color", this.ROOT_SHAPE_COLOR);
	oStop[1].setAttribute("stop-color", this.ROOT_SHAPE_SELCOLOR);
	
	oStop[2].setAttribute("stop-color", this.ROOT_SHAPE_SELCOLOR);
	oStop[3].setAttribute("stop-color", this.ROOT_SHAPE_COLOR);
	
	oStop[4].setAttribute("stop-color", this.ROOT_SHAPE_SELCOLOR);
	oStop[5].setAttribute("stop-color", this.ROOT_SHAPE_SELCOLOR);
}

YView.prototype.initMap = function(text) {
	this.deleteNodeView(this.tree.rootNode);
	this.tree.initTree(text);
	
	delete this.selectedNodes;
	this.selectedNodes = new Array;
	
	this.lastSelectedNodeID		= "";
	this.bNodeEditing			= false;
	
	this.hidePopupMenus();
	
	this.redrawTree();
	
	this.selectNode(this.tree.rootNode, false);
}

YView.prototype.getSelectedNodeCount = function() {
	return this.selectedNodes.length;
}

YView.prototype.getLastSelectedNode = function() {
	return (this.lastSelectedNodeID == "")? null:this.tree.getNodeById(this.lastSelectedNodeID);
}

YView.prototype.isSelectedNode = function(node) {
	for ( var i=this.selectedNodes.length-1; i>=0; i-- ) {
		if ( this.selectedNodes[i] == node.id ) {
			return true;
		}
	}
	return false;
}

YView.prototype.deSelectNodes = function(node) {
	for ( var i=this.selectedNodes.length-1; i>=0; i-- ) {
		nodeID = this.selectedNodes[i];
		
		if ( node != undefined && node != null && nodeID != node.id ) {
			continue;
		}
		
		this.selectedNodes.splice(i,1);

		if ( nodeID == this.tree.rootNodeID ) {
			var oOval = document.getElementById(this.ROOT_SHAPE_ID);
			if ( oOval == null ) {
				continue;
			}
		
			if ( document.all ) {
				oOval.setAttribute("filled", "f");
			} else {
				oOval.setAttribute("fill", "none");
			}
		} else {
			var oDiv = document.getElementById(this.NODE_DIV_PREFIX + nodeID);
			if ( oDiv == null ) {
				continue;
			}

			oDiv.style.backgroundColor = "";
		}
		
		if ( node != undefined && node != null && nodeID == node.id ) {
			if ( this.lastSelectedNodeID == nodeID ) {
				if ( this.selectedNodes.length > 0 ) {
					this.lastSelectedNodeID = this.selectedNodes[this.selectedNodes.length-1];
				} else {
					this.lastSelectedNodeID = "";
				}
			}

			return;
		}
	}
}

YView.prototype.selectNode = function( nodeID, bAppend, pos ) {
	var node = this.tree.getNodeById(nodeID);
	if ( node == undefined || node == null ) {
		return;
	}
	
	if ( this.lastSelectedNodeID == nodeID && nodeID != this.tree.rootNodeID) {
		return;
	}

	if ( !bAppend ) {
		this.deSelectNodes();
	}

	if ( nodeID == this.tree.rootNodeID ) {
		var oOval = document.getElementById(this.ROOT_SHAPE_ID);
		if ( oOval == null ) {
			return;
		}

		if ( document.all ) {
			oOval.setAttribute("filled", "t");
			if ( oOval.childNodes.length > 0 ) {
				var oFill = oOval.childNodes[0];
				if ( pos == undefined || pos == this.tree.NODE_POS_ROOT ) {
					oFill.setAttribute("color", this.ROOT_SHAPE_SELCOLOR);
					oFill.setAttribute("color2", this.ROOT_SHAPE_SELCOLOR);
				} else if ( pos == this.tree.NODE_POS_RIGHT ) {
					oFill.setAttribute("color", this.ROOT_SHAPE_SELCOLOR);
					oFill.setAttribute("color2", this.ROOT_SHAPE_COLOR);
				} else {
					oFill.setAttribute("color", this.ROOT_SHAPE_COLOR);
					oFill.setAttribute("color2", this.ROOT_SHAPE_SELCOLOR);
				}
			} else {
				oOval.setAttribute("fillcolor", this.NODE_DIV_SELCOLOR);
			}
		} else {
			if ( pos == undefined || pos == this.tree.NODE_POS_ROOT ) {
				oOval.setAttribute("fill", "url(#" + this.SVG_NUTRALGRADIENT_ID + ")");
			} else if ( pos == this.tree.NODE_POS_RIGHT ) {
				oOval.setAttribute("fill", "url(#" + this.SVG_RIGHTGRADIENT_ID + ")");
			} else {
				oOval.setAttribute("fill", "url(#" + this.SVG_LEFTGRADIENT_ID + ")");
			}
		}
	} else {
		var oDiv = this.getNodeDiv(node);
		if ( oDiv == null ) {
			return;
		}
	
		oDiv.style.backgroundColor = this.NODE_DIV_SELCOLOR;
	}

	for ( var i=0; i<this.selectedNodes.length; i++ ) {
		if ( this.selectedNodes[i] == nodeID ) {
			return;
		}
	}	
	this.selectedNodes.push(nodeID);
	this.lastSelectedNodeID = nodeID;
	if ( node.parentNode ) {
		node.parentNode.lastSelectedChildID = nodeID;
	}
}

YView.prototype.setNodeDivContent = function( node, oDiv ) {
	for ( var i=oDiv.childNodes.length-1; i>=0; i-- ) {
		oDiv.removeChild(oDiv.childNodes[i]);
	}
	
	for ( var i=0; i<node.getIconCount(); i++ ) {
		var oImg = document.createElement("img");
		if ( oImg == null ) {
			return;
		}

		var onClick = "NodeIconClick(event, this,'" + node.id + "'," + i + ")";
		var onDblClick = "NodeIconDblClick(event, this,'" + node.id + "'," + i + ")";
		
		if ( document.all ) {
			var str = "<img src=\"" + this.ICON_PATH + "/" + node.icons[i] + ".gif\" hspace='2'" +
				"\" onclick=\"" + onClick + ";\ " +
				"\" ondblclick=\"" + onDblClick + ";\">";
			oDiv.appendChild(oImg);
			oImg.outerHTML = str;
		} else {
			oImg.setAttribute("src", this.ICON_PATH + "/" + node.icons[i] + ".gif");
			oImg.hspace = 2;
			oImg.setAttribute("onclick", onClick);
			oImg.setAttribute("ondblclick", onDblClick);
			oDiv.appendChild(oImg);
		}
	}

	var oSpan = document.createElement("span");
	if ( oSpan == null ) {
		return;
	}

	var displayText = (node.text.length==0)? "_":node.text;
	if ( document.all ) {
		oSpan.innerText = displayText;
	} else {
		oSpan.textContent = displayText;
	}
	
	if ( node.bold ) {
		oSpan.style.fontWeight = "bold";
	} else {
		oSpan.style.fontWeight = "normal";
	}
	
	if ( node.italic ) {
		oSpan.style.fontStyle = "italic";
	} else {
		oSpan.style.fontStyle = "normal";
	}
	
	oSpan.style.height = "18px";
	
	oDiv.appendChild(oSpan);
	
	if ( node.pos == this.tree.NODE_POS_LEFT ) {
		var pDiv = this.getNodeDiv(node.parentNode);
		oDiv.style.left = pDiv.offsetLeft - oDiv.offsetWidth - this.NODE_DIV_HGAP + "px";
	}
	
}

YView.prototype.redrawNodeDivStyle = function( node ) {
	var oDiv = this.getNodeDiv(node)
	if ( oDiv == null ) {
		return;
	}
	var oTextSpan = oDiv.lastChild;
	
	if ( node.bold ) {
		oTextSpan.style.fontWeight = "bold";
	} else {
		oTextSpan.style.fontWeight = "normal";
	}
	
	if ( node.italic ) {
		oTextSpan.style.fontStyle = "italic";
	} else {
		oTextSpan.style.fontStyle = "normal";
	}
}

YView.prototype.getNodeDiv = function( node ) {
	if ( node == null ) return null;

	var oDiv = document.getElementById(this.NODE_DIV_PREFIX+node.id);
	if ( oDiv ) return oDiv;

	oDiv = document.createElement("div");
	if ( oDiv == null ) return null;
	
	var onClick		= "NodeClick(event,'" + node.id + "')";
	var onDblClick	= "NodeDblClick(event,'" + node.id + "')";

	var onMouseOver	= "NodeMouseOver(event,'" + node.id + "')";
	var onContextMenu = "NodeContextMenu(event,'" + node.id + "')";

	if ( document.all ) {
		// IE disallows append evnets handler by setAttribute function
		// Also I don't want to call addEventListener for event handling
		// because that I must remove event listner for this element
		// when I remove this element
		str = "<div id=\"" + this.NODE_DIV_PREFIX+node.id
			+ "\" nodeID=\"" + node.id
			+ "\" onclick=\"" + onClick
			+ "\" ondblclick=\"" + onDblClick
			+ "\" onmouseover=\"" + onMouseOver
			+ "\" oncontextmenu=\"" + onContextMenu
			+ "\" onselectstart=\"" + "return true;"
			+ "\"></div>";
		
		this.panelD.appendChild(oDiv);
		oDiv.outerHTML = str;

		oDiv = document.getElementById(this.NODE_DIV_PREFIX+node.id);
	} else {
		// Firefox allow to add event handler by setAttribute function
		oDiv.setAttribute("id", this.NODE_DIV_PREFIX+node.id);
		oDiv.setAttribute("nodeID",node.id);
		oDiv.setAttribute("onclick",onClick);
		oDiv.setAttribute("ondblclick",onDblClick);
		oDiv.setAttribute("onmouseover",onMouseOver);
		oDiv.setAttribute("oncontextmenu",onContextMenu);
		oDiv.setAttribute("nodeid", node.id);
		
		//oDiv.style.MozUserSelect = "none";
		
		this.panelD.appendChild(oDiv);
	}
	
	oDiv.className = "nodeDiv";
	this.setNodeDivContent(node, oDiv);
	
	//oDiv.style.display = "";
	return oDiv;
}

YView.prototype.drawRootShape = function( oDiv ) {
	if ( document.all ) {
		var oOval = document.getElementById(this.ROOT_SHAPE_ID);
		if ( oOval == null ) {
			oOval = document.createElement("v:oval");
			if ( oOval == null ) {
				return;
			}
			oOval.setAttribute("id", this.ROOT_SHAPE_ID);
			oOval.style.position = "absolute";
			oOval.setAttribute("stroked", "true");
			
			oFill = document.createElement("v:fill");
			if ( oFill != null ) {
				oFill.setAttribute("type", "gradient");
				oFill.setAttribute("angle", 90);
				oFill.setAttribute("color", this.ROOT_SHAPE_COLOR);
				oFill.setAttribute("color2", this.ROOT_SHAPE_COLOR);
				oOval.appendChild(oFill);
			}
			
			this.panelV.appendChild(oOval);
		}

		oOval.style.left = oDiv.offsetLeft;
		oOval.style.top = oDiv.offsetTop - parseInt((this.ROOT_SHAPE_HEIGHT - oDiv.offsetHeight)/2,10);
		oOval.style.pixelWidth = oDiv.offsetWidth;
		oOval.style.pixelHeight = this.ROOT_SHAPE_HEIGHT;
		oOval.setAttribute("strokecolor", this.ROOT_SHAPE_STCOLOR);
		oOval.setAttribute("strokeweight", this.NODE_LNK_WIDTH);
		
	} else {
		var oOval = document.getElementById(this.ROOT_SHAPE_ID);
		if ( oOval == null ) {
			// Watch out the function name! (not createElement)
			oOval = document.createElementNS(this.SVG_NAMESPACE, "ellipse");
			if ( oOval == null ) {
				return;
			}
	
			oOval.setAttribute("id", this.ROOT_SHAPE_ID);
			oOval.setAttribute("fill", "none");

			this.panelV.appendChild(oOval);
		}
		
		oOval.setAttribute("cx", (oDiv.offsetLeft + parseInt(oDiv.offsetWidth/2,10)) );
		oOval.setAttribute("cy", (oDiv.offsetTop + parseInt(oDiv.offsetHeight/2,10)) );
		oOval.setAttribute("rx", parseInt(oDiv.offsetWidth/2,10) );
		oOval.setAttribute("ry", parseInt(this.ROOT_SHAPE_HEIGHT/2,10) );
		oOval.setAttribute("stroke", this.ROOT_SHAPE_STCOLOR);
		oOval.setAttribute("stroke-width", this.NODE_LNK_WIDTH);
	}
}

YView.prototype.drawNodeLinker = function( node ) {
	if ( node.parentNode == null ) return;
	
	var oDiv = this.getNodeDiv(node);
	var pDiv = this.getNodeDiv(node.parentNode);
	if ( oDiv == null || pDiv == null ) return;
	
	var oLink = null;
	var pos1X, pos1Y, pos2X, pos2Y;
	var toX, toY;
	var control1X, control1Y, control2X, control2Y;
	var tipLen = 0;

	if ( node.pos == this.tree.NODE_POS_RIGHT ) {
		pos1X = pDiv.offsetLeft + pDiv.offsetWidth;
	} else {
		pos1X = pDiv.offsetLeft;
	}
	var pos1Y = pDiv.offsetTop + ((node.parentNode.indent == 0)? parseInt(pDiv.offsetHeight/2,10):pDiv.offsetHeight) - 1;
	
	pos2Y = oDiv.offsetTop + oDiv.offsetHeight - 1;

	toX = this.NODE_DIV_HGAP;
	
	if ( node.childNodes.length > 0 && node.collapsed ) {
		tipLen = 8;	// need dot
	}
	
	if ( document.all ) {
		oLink = document.getElementById(this.NODE_LINK_PREFIX+node.id);
		if ( oLink == null ) {
			oLink = document.createElement("v:shape");
			
			if ( oLink == null ) {
				return null;
			}
			
			oLink.setAttribute("id", this.NODE_LINK_PREFIX+node.id);
			oLink.setAttribute("coordorigin", "0 0");
			oLink.setAttribute("coordsize", "100 100");
			oLink.setAttribute("filled", "f");
			oLink.className = "linker";

			// the only one child element in this shape
			var oStroke = document.createElement("v:stroke");
			if ( oStroke ) {
				oLink.appendChild(oStroke);
			}
			
			this.panelV.appendChild(oLink);
		}
		
		pos2X = oDiv.offsetLeft;
		
		control1X = 10;
		control2X = 0;
		if ( pos1Y > pos2Y ) {
			toY = pos2Y - pos1Y;
		} else {
			toY = pos2Y - pos1Y;
		}
		control1Y = parseInt(toY/5,10);
		control2Y = toY;

		oLink.style.left = pos1X + "px";
		oLink.style.top = pos1Y + "px";
		oLink.style.pixelWidth = (node.pos == this.tree.NODE_POS_RIGHT)?100:-100;
		oLink.style.pixelHeight = 100;

		oLink.setAttribute("strokecolor", this.NODE_LNK_COLOR);
		oLink.setAttribute("strokeweight", this.NODE_LNK_WIDTH);
		
		if ( oLink.children.length > 0 ) {
			if ( tipLen > 0 ) {
				oLink.children[0].setAttribute("endarrow", "oval");
			} else {
				oLink.children[0].setAttribute("endarrow", "none");
			}
		}
		
		var path = "m 0,0 c ";
		path += control1X + "," + control1Y + "," + control2X + "," + control2Y + ",";
		path += toX + "," + toY + " r ";
		path += (oDiv.offsetWidth + tipLen) + ",0 e";
		oLink.setAttribute("path", path);
		
		return oLink;

	} else {

		oLink = document.getElementById(this.NODE_LINK_PREFIX+node.id);
		if ( oLink == null ) {
			// Watch out the function name! (not createElement)
			oLink = document.createElementNS(this.SVG_NAMESPACE, "path");
			
			if ( oLink == null ) {
				return;
			}
	
			oLink.setAttribute("id", this.NODE_LINK_PREFIX+node.id);
			oLink.setAttribute("fill", "none");

			this.panelV.appendChild(oLink);
		}
		
		if ( node.pos == this.tree.NODE_POS_RIGHT ) {
			pos2X = oDiv.offsetLeft;
			control1X = pos1X +  10;
		} else {
			pos2X = oDiv.offsetLeft + oDiv.offsetWidth;
			control1X = pos1X -  10;
		}

		control1Y = pos1Y;
		control2X = pos1X;
		control2Y = pos2Y;
	
		if ( tipLen > 0 ) {
			oLink.setAttribute("marker-end", "url(#EndMarker)");
		} else {
			oLink.setAttribute("marker-end", "none");
		}
		
		oLink.setAttribute("stroke", this.NODE_LNK_COLOR);
		oLink.setAttribute("stroke-width", this.NODE_LNK_WIDTH);

		var d =
			"M" + pos1X + "," + pos1Y + " " +
			"C" + control1X + "," + control1Y + " " +
				  control2X + "," + control2Y + " " +
				  pos2X + "," + pos2Y + " " +
			"L";
		if ( node.pos == this.tree.NODE_POS_RIGHT ) {
			d+= (pos2X + oDiv.offsetWidth + tipLen );
		} else {
			d+= (pos2X - oDiv.offsetWidth - tipLen );
		}
			d+= "," + pos2Y;

		oLink.setAttribute("d", d);

		return oLink
	}
	
	return null;
}

YView.prototype.getNodeHeight = function( node, pos ) {
	if ( node.childNodes.length == 0 || node.collapsed ) {
		oDiv = this.getNodeDiv(node);
		if ( oDiv ) {
			return oDiv.offsetHeight;
		} else {
			return 0;
		}
	}
	
	// accumulate all children's height
	var height = 0;
	var sibCnt = 0;
	for ( var i=0; i < node.childNodes.length; i++ ) {
		cnode = this.tree.getNodeById(node.childNodes[i]);
		if ( cnode.pos != pos ) continue;
		sibCnt++;
		height += this.getNodeHeight(cnode, pos);
	}
	
	
	height += (sibCnt - 1)*this.NODE_DIV_VGAP;
	return height;
}

YView.prototype.drawChildNodes = function( node ) {
	
	var oDiv = this.getNodeDiv(node);
	if ( oDiv == null ) {
		return;
	}
	
	var left;
	var top;
	
	if ( node.childNodes.length == 0 || node.collapsed ) {
		return;
	} else {
		
		var snodes = new Array(null, null);
	
		if ( node.pos == this.tree.NODE_POS_ROOT ) {
			for ( var i=0; i<node.childNodes.length; i++ ) {
				var tmpNode = this.tree.getNodeById(node.childNodes[i]);
				if ( tmpNode.pos == this.tree.NODE_POS_RIGHT ) {
					snodes[1] = tmpNode;
					break;
				}
			}
			
			for ( var i=0; i<node.childNodes.length; i++ ) {
				var tmpNode = this.tree.getNodeById(node.childNodes[i]);
				if ( tmpNode.pos == this.tree.NODE_POS_LEFT ) {
					snodes[0] = tmpNode;
					break;
				}
			}
		} else if ( node.pos == this.tree.NODE_POS_RIGHT ) {
			snodes[1] = this.tree.getNodeById(node.childNodes[0]);
		} else if ( node.pos == this.tree.NODE_POS_LEFT ) {
			snodes[0] = this.tree.getNodeById(node.childNodes[0]);
		}
		
		for ( var i=0; i<2; i++ ) {
			var rnode = snodes[i];
			
			if ( rnode == null ) continue;
			
			var rpos = (i==0)?this.tree.NODE_POS_LEFT:this.tree.NODE_POS_RIGHT;

			while(rnode.prevNode != null) {
				rnode = rnode.prevNode;
			}
	
			left = oDiv.offsetLeft + oDiv.offsetWidth + this.NODE_DIV_HGAP;
			top = oDiv.offsetTop -  parseInt((this.getNodeHeight(node,rpos) - oDiv.offsetHeight)/2,10) - ((node.indent==0)?parseInt(oDiv.offsetHeight/2,10):0);
			var topOffset;
			while ( rnode != null ) {
				var tmpDiv = this.getNodeDiv(rnode);
				if ( tmpDiv == null ) return;
				
				this.setNodeDivContent( rnode, tmpDiv);
				
				topOffset = parseInt((this.getNodeHeight(rnode,rpos) - tmpDiv.offsetHeight)/2,10);
				if ( i == 0 ) {
					left = oDiv.offsetLeft - tmpDiv.offsetWidth - this.NODE_DIV_HGAP;
				}

				tmpDiv.style.left = left + "px";
				tmpDiv.style.top = top + topOffset + "px";
					
				top += (topOffset*2) + tmpDiv.offsetHeight + this.NODE_DIV_VGAP;
				
				this.drawNodeLinker(rnode);
				
				if ( !rnode.collapsed ) {
					this.drawChildNodes(rnode);
				}
				
				rnode = rnode.nextNode;
			}
		}

	}
}

YView.prototype.drawNode = function( node, bDrawChildren ) {
	var oDiv = this.getNodeDiv(node);
	if ( oDiv == null ) {
		return;
	}

	if ( node.parentNode == null ) {
		//var left = this.rootPosX;
		var left = this.panelD.offsetWidth/2
		//var top = this.rootPosY;
		var top = this.panelD.offsetHeight/2;
		// add unit string for xhtml
		oDiv.style.left = (left - parseInt(oDiv.offsetWidth/2, 10)) + "px";
		oDiv.style.top = top + "px";
		oDiv.style.paddingLeft = 10 + "px";
		oDiv.style.paddingRight = 10 + "px";
		oDiv.style.backgroundColor = "";
		oDiv.style.border = "none";
		this.setNodeDivContent(node, oDiv);
	} else {
		this.setNodeDivContent(node, oDiv);
		this.drawNodeLinker(node);
	}

	if ( bDrawChildren ) {
		this.drawChildNodes( node );
	}

	// draw node specific appearence	
	if ( node.parentNode == null ) {
		//oDiv.style.top = (oDiv.offsetTop + parseInt(oDiv.offsetHeight/2)) + "px";
		this.drawRootShape(oDiv);
	} else {

	}
}

YView.prototype.setCaretPos = function( oField, iCaretPos ) {
	if (document.selection) { 
		// Set focus on the element
		oField.focus();
  
		// Create empty selection range
		var oSel = document.selection.createRange ();
  
		// Move selection start and end to 0 position
		oSel.moveStart ('character', -oField.value.length);
  
		// Move selection start and end to desired position
		oSel.moveStart ('character', iCaretPos);
		oSel.moveEnd ('character', 0);
		oSel.select ();
	} else if (oField.selectionStart || oField.selectionStart == '0') {
		oField.selectionStart = iCaretPos;
		oField.selectionEnd = iCaretPos;
		oField.focus();
	}
}

YView.prototype.startNodeEdit = function( node, org ) {
	var oDiv = this.getNodeDiv(node)
	if ( oDiv == null ) {
		return;
	}
	var oTextSpan = oDiv.lastChild;

	var width = oTextSpan.offsetWidth + 20;
	var height = oTextSpan.offsetHeight + 4;
	var txt = node.text;
	
	oDiv.removeChild(oDiv.lastChild);

	var oInput = document.createElement("input");

	var className = "nodeEdit";
	var onblur = "NodeEditEnd(this,\'" + node.id + "\')";
	var onkeypress = "if (keyCheck(event,[13,27])) NodeEditEnd(this,\'" + node.id + "\');";
	if ( document.all ) {
		// append input to this div element
		var str  = "<input type='text' "
			+ "class='" + className + "' "
			+ "value='" + txt + "' "
			+ "style='width:" + width + ";height:" + height + ";' "
			+ "onblur=\"" + onblur + "\" "
			+ "onkeypress=\"" + onkeypress + "\">";

		oDiv.appendChild(oInput);
		oInput.outerHTML = str;
		
		oInput = oDiv.lastChild;
	} else {
		oInput.setAttribute("type", "text");
		oInput.setAttribute("value", txt);
		oInput.setAttribute("onblur", onblur);
		oInput.setAttribute("onkeypress", onkeypress);
		oInput.className = className;
		oInput.style.width = width + "px";
		oInput.style.height = height + "px";

		//oDiv.style.MozUserSelect = "";
		oDiv.appendChild(oInput);
	}
	
	oInput.focus();
	if ( org != undefined && org == this.CARET_ORG_START ) {
		this.setCaretPos(oInput, 0);
	} else if ( org != undefined && org == this.CARET_ORG_END ) {
		this.setCaretPos(oInput, txt.length);
	} else {
		oInput.select();
	}
	
	this.panelD.onmousedown = null;
	
	this.bNodeEditing = true;
}

YView.prototype.stopNodeEdit = function( node ) {
	var oDiv = this.getNodeDiv(node);
	
	var oInput = oDiv.lastChild;
	node.text = oInput.value.trim();
	
	this.setNodeDivContent(node, oDiv);
	
	this.drawNode(node, true);

	this.bNodeEditing = false;
	
	/*
	if ( oDiv == null ) {
		this.bNodeEditing = false;
		return;
	}
	var oInput = oDiv.childNodes[oDiv.childNodes.length-1];
	node.text = oInput.value.trim();
	
	oDiv.removeChild(oInput);

	var oSpan = document.createElement("span");
	if ( oSpan == null ) {
		this.bNodeEditing = false;
		return;
	}

	if ( document.all ) {
		oSpan.innerText = node.text;
	} else {
		oSpan.textContent = node.text;
	}
	oDiv.appendChild(oSpan);
	
	this.drawNode(node, true);

	this.bNodeEditing = false;
	*/
}

YView.prototype.redrawTree = function() {
	this.drawNode(this.tree.rootNode, true);
}

YView.prototype.appendChildNode = function( node ) {
	var tmpNode = node.appendChild("");
	if ( tmpNode != null ) {
		if ( node.collapsed ) {
			this.toggleNode(node);
		}
		this.redrawTree();
		this.selectNode(tmpNode.id, false);
	}
	return tmpNode;
}

YView.prototype.appendSiblingNode = function( node, dir ) {
	if ( node.indent == 0 ) {
		return null;
	}
	var tmpNode = node.appendSibling("", dir);
	if ( tmpNode == null ) {
		return null;
	}
	this.redrawTree();
	
	this.selectNode(tmpNode.id, false);
	
	return tmpNode;
}

YView.prototype.deleteNodeView = function( node ) {
	for ( var i=node.childNodes.length-1; i>=0; i-- ) {
		var tmpNode = this.tree.getNodeById(node.childNodes[i]);
		if ( tmpNode == undefined || tmpNode == null ) {
			continue;
		}
		this.deleteNodeView(tmpNode);
	}

	var oDiv = document.getElementById(this.NODE_DIV_PREFIX+node.id);
	var oLnk = document.getElementById(this.NODE_LINK_PREFIX+node.id);
	
	if ( oDiv != null ) {
		if ( document.all ) {
			oDiv.removeNode(true);
		} else {
			this.panelD.removeChild(oDiv);
		}
	}
	
	if ( oLnk != null ) {
		if ( document.all ) {
			oLnk.removeNode(true);
		} else {
			this.panelV.removeChild(oLnk);
		}
	}
}

YView.prototype.deleteNode= function( node ) {
	if ( node.indent == 0 ) {
		return false;
	}

	this.deleteNodeView(node);
	this.tree.removeNode(node);
	
	return true;
}

YView.prototype.isSelectedNode= function(node) {
	if ( node == null )  return false;
	
	for ( var i=0; i<this.selectedNodes.length; i++ ) {
		if ( this.selectedNodes[i] == node.id ) return true;
	}
	
	return false;
}

YView.prototype.getNearestUnSelectedNode= function(node) {
	if ( node == null ) {
		return this.tree.rootNode;
	}
	
	var parentNode = node.parentNode;
	var prevNode = node.prevNode;
	var nextNode = node.nextNode;
	
	while ( parentNode && parentNode.indent != 0 ) {
		if ( !this.isSelectedNode(parentNode) ) {
			parentNode = parentNode.parentNode;
			continue;
		}
		return this.getNearestUnSelectedNode(parentNode);
	}
	
	while ( nextNode ) {
		if ( this.isSelectedNode(nextNode) ) {
			nextNode = nextNode.nextNode;
			continue;
		}
		return nextNode;
	}
	
	while ( prevNode ) {
		if ( this.isSelectedNode(prevNode) ) {
			prevNode = prevNode.prevNode;
			continue;
		}
		return prevNode;
	}
	
	return node.parentNode;
}

YView.prototype.deleteSelectedNodes= function() {
	var delCnt = 0;

	var tmpNode = this.getLastSelectedNode();
	
	if ( tmpNode == null ) return;
	
	var selNode = this.getNearestUnSelectedNode(tmpNode);
	
	for ( var i=this.selectedNodes.length-1; i>=0; i-- ) {
		var node = this.tree.getNodeById(this.selectedNodes[i]);
		this.selectedNodes.splice(i,1);

		if ( node == undefined || node == null ) {
			continue;
		}
		
		if ( this.deleteNode(node) ) {
			delCnt++;
		}
	}
	this.lastSelectedNodeID = "";

	if ( delCnt > 0 ) {
		this.redrawTree();
		this.selectNode(selNode, false);
	}
}

YView.prototype.swapSibNode = function( dir ) {
	if ( this.lastSelectedNodeID == "" ) {
		return;
	}
	var snode = this.tree.getNodeById(this.lastSelectedNodeID);
	if ( snode == undefined || snode == null || snode.indent == 0 ) {
		return;
	}
	
	var tnode = null;
	
	if ( dir == this.NODE_NAV_UP ) {
		tnode = snode.prevNode;
		if ( tnode == null ) {
			return;
		}
		
		if ( snode.nextNode ) {
			tnode.nextNode = snode.nextNode;
			snode.nextNode.prevNode = tnode;
		} else {
			tnode.nextNode = null;
		}
		
		if ( tnode.prevNode ) {
			tnode.prevNode.nextNode = snode;
			snode.prevNode = tnode.prevNode;
		} else {
			snode.prevNode = null;
		}
		
		snode.nextNode = tnode;
		tnode.prevNode = snode;
	} else if ( dir == this.NODE_NAV_DOWN ) {
		tnode = snode.nextNode;
		if ( tnode == null ) {
			return;
		}
		
		if ( snode.prevNode ) {
			tnode.prevNode = snode.prevNode;
			snode.prevNode.nextNode = tnode;
		} else {
			tnode.prevNode = null;
		}
		
		if ( tnode.nextNode ) {
			tnode.nextNode.prevNode = snode;
			snode.nextNode = tnode.nextNode;
		} else {
			snode.nextNode = null;
		}

		snode.prevNode = tnode;
		tnode.nextNode = snode;
	} else {
		return;
	}
	
	this.drawNode( snode.parentNode, true);
}

YView.prototype.navigateNode = function( dir, bSelExpansion ) {
	if ( this.lastSelectedNodeID == "" ) {
		return;
	}
	
	var node = this.tree.getNodeById(this.lastSelectedNodeID);
	if ( node == undefined || node == null ) {
		return;
	}
	
	if ( dir == this.NODE_NAV_PAGEUP ) {
		this.selectNode(node.getSiblingHead(), bSelExpansion);
	} else if ( dir == this.NODE_NAV_PAGEDN ) {
		this.selectNode(node.getSiblingTail(), bSelExpansion);
	} else if ( dir == this.NODE_NAV_UP ) {
		if ( node.prevNode == null ) {
			if ( node.parentNode != null && node.parentNode.prevNode != null ) {
				if ( node.parentNode.prevNode.collapsed ) {
					this.selectNode(node.parentNode.prevNode.id, bSelExpansion);
					return;
				}
				var tmpNode = node.parentNode.prevNode.getChildTail();
				if ( tmpNode != null ) {
					this.selectNode(tmpNode.id, bSelExpansion);
					if ( tmpNode.parentNode.collapsed ) {
						this.toggleNode( tmpNode.parentNode );
					}
				}
			}
			return;
		}
		this.selectNode(node.prevNode.id, bSelExpansion);
		
	} else if ( dir == this.NODE_NAV_DOWN ) {
		if ( node.nextNode == null ) {
			if ( node.parentNode != null && node.parentNode.nextNode != null ) {
				if ( node.parentNode.nextNode.collapsed ) {
					this.selectNode(node.parentNode.nextNode.id, bSelExpansion);
					return;
				}
				var tmpNode = node.parentNode.nextNode.getChildHead();
				if ( tmpNode != null ) {
					this.selectNode(tmpNode.id, bSelExpansion);
					if ( tmpNode.parentNode.collapsed ) {
						this.toggleNode( tmpNode.parentNode );
					}
				}
			}
			return;
		}
		this.selectNode(node.nextNode.id, bSelExpansion);

	} else if ( dir == this.NODE_NAV_RIGHT ) {
		if ( node.pos == this.tree.NODE_POS_LEFT ) {
			this.selectNode(node.parentNode.id, bSelExpansion);
		} else {
			if ( node.collapsed ) {
				this.toggleNode( node );
				return;
			}

			var tmpNode = node.getLastSelectedChild(this.tree.NODE_POS_RIGHT);
			if ( tmpNode == null ) {
				return;
			}

			this.selectNode(tmpNode.id, bSelExpansion);
		}
	} else if ( dir == this.NODE_NAV_LEFT ) {
		if ( node.pos == this.tree.NODE_POS_RIGHT ) {
			this.selectNode(node.parentNode.id, bSelExpansion);
		} else {
			if ( node.collapsed ) {
				this.toggleNode( node );
				return;
			}

			var tmpNode = node.getLastSelectedChild(this.tree.NODE_POS_LEFT);
			if ( tmpNode == null ) {
				return;
			}

			this.selectNode(tmpNode.id, bSelExpansion);
		}
	} else {
		return;
	}
}

YView.prototype.toggleChild = function( node, bShow ) {
	var oDiv, oLnk;
	for ( var i=0; i<node.childNodes.length; i++ ) {
		var cnode = g_YTree.getNodeById(node.childNodes[i]);
		if ( cnode == null ) {
			continue;
		}
		oDiv = document.getElementById(this.NODE_DIV_PREFIX+cnode.id);
		oLnk = document.getElementById(this.NODE_LINK_PREFIX+cnode.id);

		if ( oDiv == null || oLnk == null ) continue;
		
		if ( bShow ) {
			oDiv.style.display = "";
			oLnk.style.display = "";
		} else {
			oDiv.style.display = "none";
			oLnk.style.display = "none";
		}
		
		if ( !cnode.collapsed ) {
			this.toggleChild(cnode, bShow);
		}
	}
}

YView.prototype.toggleNode = function( node ) {
	node.collapsed = (node.collapsed)? false:true;
	this.toggleChild(node, !node.collapsed);
	this.redrawTree();
}

YView.prototype.removeLastIcon = function( ) {
	var bRootSelected = false;
	var nSelCnt = this.getSelectedNodeCount();
	var nDelconCnt = 0;

	for ( var i=0; i<nSelCnt; i++ ) {
		var nodeID = this.selectedNodes[i];
		
		if ( nodeID == this.tree.rootNodeID ) {
			bRootSelected = true;
			break;
		}
	}
	
	for ( var i=0; i<nSelCnt; i++ ) {
		var nodeID = this.selectedNodes[i];
		
		var node = this.tree.getNodeById(nodeID);
		
		if ( node == undefined || node == null ) {
			continue;
		}
		
		var cnt = (node.removeLastIcon())? 1:0;
		
		
		if ( !bRootSelected && cnt > 0 ) {
			this.drawNode(node, true);
		}
		
		nDelconCnt += cnt;
	}
	
	if ( bRootSelected && nDelconCnt > 0 ) {
		this.drawNode(this.tree.rootNode, true);
	}
}

YView.prototype.removeAllIcon = function( ) {
	var bRootSelected = false;
	var nSelCnt = this.getSelectedNodeCount();
	var nDelconCnt = 0;

	for ( var i=0; i<nSelCnt; i++ ) {
		var nodeID = this.selectedNodes[i];
		
		if ( nodeID == this.tree.rootNodeID ) {
			bRootSelected = true;
			break;
		}
	}
	
	for ( var i=0; i<nSelCnt; i++ ) {
		var nodeID = this.selectedNodes[i];
		
		var node = this.tree.getNodeById(nodeID);
		
		if ( node == undefined || node == null ) {
			continue;
		}
		
		var cnt = node.removeIcons();
		
		
		if ( !bRootSelected && cnt > 0 ) {
			this.drawNode(node, true);
		}
		
		nDelconCnt += cnt;
	}
	
	if ( bRootSelected && nDelconCnt > 0 ) {
		this.drawNode(this.tree.rootNode, true);
	}
}

YView.prototype.appendIcon = function( iconSrc ) {
	var bRootSelected = false;
	var nSelCnt = this.getSelectedNodeCount();

	for ( var i=0; i<nSelCnt; i++ ) {
		var nodeID = this.selectedNodes[i];
		
		if ( nodeID == this.tree.rootNodeID ) {
			bRootSelected = true;
			break;
		}
	}
	
	for ( var i=0; i<nSelCnt; i++ ) {
		var nodeID = this.selectedNodes[i];
		
		var node = this.tree.getNodeById(nodeID);
		
		if ( node == undefined || node == null ) {
			continue;
		}
		
		node.appendIcon(iconSrc);
		
		
		if ( !bRootSelected ) {
			this.drawNode(node, true);
		}
	}
	
	if ( bRootSelected ) {
		this.drawNode(this.tree.rootNode, true);
	}
}

YView.prototype.toggleNodeStyle = function(what) {
	var tmpNode = this.getLastSelectedNode();
	if ( tmpNode == null ) {
		return;
	}
	
	var bBool;

	if ( what == this.NODE_STYLE_BOLD ) {
		bBool = !tmpNode.bold;
	} else if ( what == this.NODE_STYLE_ITALIC ) {
		bBool = !tmpNode.italic;
	} else {
		return;
	}

	for ( var i=this.selectedNodes.length-1; i>=0; i-- ) {
		var node = this.tree.getNodeById(this.selectedNodes[i]);

		if ( node == undefined || node == null ) {
			continue;
		}
		
		if ( what == this.NODE_STYLE_BOLD ) {
			node.bold = bBool;
		} else if ( what == this.NODE_STYLE_ITALIC ) {
			node.italic = bBool;
		}

		this.redrawNodeDivStyle(node);
	}
}






function keyCheck(evt, codes) {
	evt = (evt) ? evt:window.event;
	code = (evt.keyCode)? evt.keyCode:evt.charCode;
	
	for ( var i=0; i<codes.length; i++ ) {
		if ( codes[i] == code ) {
			return true;
		}
	}
	return false;
}

function getMouseOffset(target, evt){
    evt = evt || window.event;

    var docPos    = getPosition(target);
    var mousePos  = mouseCoords(evt);
    return {x:mousePos.x - docPos.x, y:mousePos.y - docPos.y};
}

function mouseCoords(evt){
    if(evt.pageX || evt.pageY){
        return {x:evt.pageX, y:evt.pageY};
    }
    return {
        x:evt.clientX + document.body.scrollLeft - document.body.clientLeft,
        y:evt.clientY + document.body.scrollTop  - document.body.clientTop
    };
}

function getPosition(e){
    var left = 0;
    var top  = 0;

    while (e.offsetParent){
        left += e.offsetLeft;
        top  += e.offsetTop;
        e     = e.offsetParent;
    }

    left += e.offsetLeft;
    top  += e.offsetTop;

    return {x:left, y:top};
}

function mouseMove(evt){
    evt           = evt || window.event;
    var mousePos = mouseCoords(evt);

    if(g_YView.dragObject && !g_YView.bNodeEditing && 
    		(g_YView.getSelectedNodeCount() == 1 || g_YView.dragObject.getAttribute("nodeID") == null) ) {
    		var yOff = 0;
    		var xOff = 0;
    		if ( g_YView.dragObject.getAttribute("nodeID") != null ) {
    			yOff = 0 - g_YView.panelD.offsetTop + 25;
    			xOff = 0 - g_YView.panelD.offsetLeft;
    		}
        g_YView.dragObject.style.position = 'absolute';
   	    g_YView.dragObject.style.top      = (mousePos.y - g_YView.mouseOffset.y + yOff)+"px";
       	g_YView.dragObject.style.left     = (mousePos.x - g_YView.mouseOffset.x + xOff)+"px";
       	
    }
    
    if ( g_YView.dragObject ) {
    	g_YView.panelD.style.cursor = "move";
    }
    
    if ( !g_YView.bPopupDisplayed ) {
		if ( document.all ) {
				evt.cancelBubble =true;
		} else {
			evt.stopPropagation();
		}
		
		return false;
	} else {
		return true;
	}
}

function mouseUp(evt){
	evt           = evt || window.event;
	
	if ( g_YView.dragObject != null && g_YView.getSelectedNodeCount() == 1 ) {
		var snode = g_YView.tree.getNodeById(g_YView.dragObject.getAttribute("nodeID"));
		if ( snode != null && snode.id == g_YView.lastSelectedNodeID ) {
			g_YView.dragObject.style.left = g_YView.dragOldLeft + "px";
			g_YView.dragObject.style.top = g_YView.dragOldTop + "px";
			
			g_YView.dragObject = null;
			g_YView.panelD.style.cursor = "default";
			return false;
		}
		var tnode = g_YView.getLastSelectedNode();
		if ( snode != null && tnode != null && snode.id != tnode.id ) {
			var bAttached = false;
			
			mousePos = mouseCoords(evt);
			oDiv = g_YView.getNodeDiv(tnode);
			divPos = getPosition(oDiv);
			if (
				(mousePos.x > divPos.x && mousePos.x < divPos.x + oDiv.offsetWidth) &&
				(mousePos.y > divPos.y && mousePos.y < divPos.y + oDiv.offsetHeight) ) {
				if ( tnode.indent == 0 ) {
					bAttached = snode.attachToNode(tnode, g_YView.dragPos);
				} else {
					bAttached = snode.attachToNode(tnode, tnode.pos);
				}
			}
			
			if ( bAttached ) {
				if ( tnode.collapsed ) {
					g_YView.toggleNode(tnode);
				} else {
					g_YView.redrawTree();
				}
			} else {
				g_YView.dragObject.style.left = g_YView.dragOldLeft + "px";
				g_YView.dragObject.style.top = g_YView.dragOldTop + "px";
			}
		}
	}
	
	g_YView.dragObject = null;
	g_YView.panelD.style.cursor = "default";
    
	return false;
}

function makeDraggable(item){
    if(!item) return false;

    item.onmousedown = function(evt){
        g_YView.dragObject  = this;
        g_YView.dragOldLeft = item.offsetLeft;
        g_YView.dragOldTop	= item.offsetTop;
        g_YView.mouseOffset = getMouseOffset(this, evt);
        
        evt = evt || window.event;
        
        if ( document.all ) {
        	evt.cancelBubble = true;
        } else {
        	evt.stopPropagation();
        }
        
        return false;
    }
    return true;
}

function getRelPath(src) {
	var toks = src.split("/");
	return toks[toks.length-1];
}