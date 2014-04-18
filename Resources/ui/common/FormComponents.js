function FormComponents(){	
	//render appropriate components based on the platform and form factor
	var osname = Ti.Platform.osname,
		version = Ti.Platform.version,
		maxHeight = Ti.Platform.displayCaps.platformHeight,
		maxWidth = Ti.Platform.displayCaps.platformWidth;
	
	//considering tablet to have one dimension over 900px
	var isTablet = osname === 'ipad' || (osname === 'android' && (maxWidth > 899 || maxHeight > 899));
	var isAndroid = false;
	if (osname === 'android') {
		isAndroid = true;
	}
	
	// set platform specific variables
	var buttonHeight     = 35;	
	var buttonWidth      = '95%';
	var minButtonHeight  = 35;
	var minButtonWidth   = 120;
	var miniButtonWidth  = 50;
	var buttonSideMargin = 5;
	var buttonTopMargin  = 40;
	var buttonFont       = { fontSize: 25 };
	var buttonFontColor  = "#333333";
	var labelFont        = { fontSize: 25 };
	var labelFontColor   = "#333333";
	var globalLineHeight = 40;
	var searchFieldWidth = 200;
	var backTitle        = 'back';
	var buttonWidthPercent = "60%";
	var topMargin        = 10;
	
	if (isTablet) {
		minButtonWidth   = 200;
		buttonHeight     = 60;
		globalLineHeight = 65;
	}
	
	var self = {
		osname: osname,
		version: version,
		maxHeight: maxHeight,
		maxWidth: maxWidth,
		isTablet: isTablet,
		isAndroid: isAndroid,
		buttonHeight: buttonHeight,
		buttonWidth: buttonWidth,
		miniButtonWidth: miniButtonWidth,
		minButtonWidth: minButtonWidth,
		minButtonHeight: buttonHeight,
		buttonSideMargin: buttonSideMargin,
		buttonTopMargin: buttonTopMargin,
		buttonFont: buttonFont,
		searchFieldWidth: searchFieldWidth,
		labelFont: labelFont,
		globalLineHeight: globalLineHeight,
		buttonWidthPercent: buttonWidthPercent,
		topMargin: topMargin,
		
		buttonMenu: function(params){
			var buttons = {};
			var currTop = 10;
			for (i=0;i<params.length;i++){
				buttons[params[i]] = Ti.UI.createButton({
					title: params[i],
					top: currTop,
					font: buttonFont,
					width: buttonWidth,
					height: buttonHeight,
				});
				self.styleButton(buttons[params[i]]);
				currTop += buttonHeight + 10;
			}
			
			return buttons;
		},
		labelList: function(params){
			var labellist = { labels: [], positions: []};
			var currTop = params.start || 15 + buttonHeight;
			for (i=0;i<params.labels.length;i++) {
				var l = Ti.UI.createLabel({
					color:'#ffffff',
					text: params.labels[i],
					top: currTop,
					font: buttonFont,
					left: 10,
					height:'auto',
					width:'auto'
				});
				params.view.add(l);
				labellist.labels.push(l);
				labellist.positions.push(currTop);
				
				currTop += buttonHeight + 10;
			}
			
			return labellist;
		},
		filterSelect: function(params){
			var skipRows = params.skipRows || 0;
			var listView = params.view;
			var rowHeight = params.rowHeight || buttonHeight;
			var cancel = Ti.UI.createButton({
				top: 5 + (skipRows * rowHeight),
				left: 5,
			    title: params.cancelTitle || 'Cancel',
				width: minButtonWidth,
				height: buttonHeight,
			
			});
			self.styleButton(cancel);
			cancel.addEventListener('click', function(){
				if (typeof params.cancel == 'function') {
					params.cancel.call();
				}
				if (! params.noCancelBubble) {
					if (listView && listView.getParent()) {
						listView.getParent().remove(listView);
					}
				}
			});

			var filterbox = Ti.UI.createTextField({
			    width: maxWidth - 10 - minButtonWidth,
			    top: 5 + (skipRows * rowHeight),
			    left: minButtonWidth + 10,
			    height: buttonHeight,
			    hintText: 'enter text to filter',
			    color: '#000000',
			    backgroundColor: '#ffffff',
			    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED
			});
		
			listView.add(cancel);
			listView.add(filterbox);
		
			var rows = [];
			var array = [];
			for (var i=0;i<params.items.length;i++){
				var label = Ti.UI.createLabel({
					color:'#000000',
					backgroundColor:'#ffffff',
					text: params.items[i],
					font: labelFont,
					height:'auto',
					width:'auto',
				});
				var row = Titanium.UI.createTableViewRow({
					height:rowHeight,
					backgroundColor: '#ffffff',
					bound: label,
					externalBound: params.bound
				});
				row.add(label);
				if (params.bound || params.callback){
					row.addEventListener('click',function(){
						if (listView && listView.getParent()){
							listView.getParent().remove(listView);
						}
						if (typeof params.callback == 'function'){
							params.callback.call(this, this.bound.text, this.externalBound);
						} else {
							params.bound.value = this.bound.text;
						}
					});
				}
				array.push(row);
				rows.push(row);
			}
		
			var tableView = Ti.UI.createTableView({
				top: buttonHeight + 10 + (skipRows * rowHeight),
				data: array,
				style:Titanium.UI.iPhone.TableViewStyle.GROUPED
			});
		
			filterbox.addEventListener('change', function(e){
				if (this.value.length) {
					var currArray = [];
					for (i=0;i<array.length;i++){
						if (typeof array[i].children[0].text == 'undefined') {
							currArray.push(array[i]);
						}
						else if (array[i].children[0].text.toLowerCase().indexOf(this.value.toLowerCase())>-1) {
							currArray.push(array[i]);
						}
					}
				} else {
					currArray = array;
				}
				tableView.data = currArray;
			});
					
			listView.add(tableView);
			
			return rows;
		},
		select: function(params){
			var rowHeight = params.rowHeight || buttonHeight;
			var skipRows = params.skipRows || 0;
			var listView = Ti.UI.createScrollView({
				top: 0,
				backgroundColor: '#000000',
				width: '100%',
				height: '100%',
				zIndex: 3
			});
			var cancel = Ti.UI.createButton({
				width: minButtonWidth,
				height: buttonHeight,
				top: 5,
				left: 5,
			    title: params.cancelTitle || 'Cancel'
			});
			self.styleButton(cancel);
			cancel.addEventListener('click', function(){
				if (listView && listView.getParent()){
					listView.getParent().remove(listView);
				}
				params.callback.call(this, params.defaultValue);
			});

			listView.add(cancel);
		
			var rows = [];
			var array = [];
			for (var i=0;i<params.items.length;i++){
				var label = Ti.UI.createLabel({
					color: (params.items[i]==params.defaultValue) ? '#ffffff' : '#000000',
					text: params.items[i],
					height:'auto',
					font: labelFont,
					width:'auto'
				});
				var row = Titanium.UI.createTableViewRow({
					height:rowHeight,
					backgroundColor: (params.items[i]==params.defaultValue) ? '#0044CC' : '#ffffff',
					bound: label
				});
					
				row.add(label);
				row.addEventListener('click',function(){
					if (listView && listView.getParent()){
						listView.getParent().remove(listView);
					}
					if (typeof params.callback == 'function'){
						params.callback.call(this, this.bound.text);
					} else {
						params.bound.value = this.bound.text;
					}
				});
				array.push(row);
			}
		
			var tableView = Ti.UI.createTableView({
				top: buttonHeight + (rowHeight * skipRows) + 10,
				data: array,
				style:Titanium.UI.iPhone.TableViewStyle.GROUPED
			});
				
			listView.add(tableView);
			
			params.rootWindow.add(listView);
		},
		test: function(view){
			var testView = Ti.UI.createView({
				top: 0,
				backgroundColor: '#ffffff',
				width: '100%',
				height: '100%',
				zIndex: 1
			});
		
			var label = Ti.UI.createLabel({text:'Hello World'});
		
			testView.add(label);
		
			view.add(testView);
		},
		styleButton: function(button){
			button.color = buttonFontColor;
			button.font = buttonFont;
			button.backgroundGradient = {
				type: 'linear',
		        startPoint: { x: '50%', y: '0%' },
		        endPoint: { x: '50%', y: '100%' },
		        colors:['#FFFFFF', '#E6E6E6']};
	        button.borderRadius = 5;
			button.backgroundImage = null;
			if (! button.width) {
				button.width = 80;
				button.height = 30;
			}
			button.addEventListener('touchstart',function(){
				this.backgroundColor = '#E6E6E6';
				this.color = buttonFontColor;
			});
			button.addEventListener('touchend',function(){
				this.backgroundColor = null;
			});
			
			return button;
		},
		sortObjects: function(objectHash){
			var flist = self.values(objectHash);
		    if (flist[0].hasOwnProperty('index')) {
				flist.sort(self.propSort('index'));
		    } else {
				flist.sort(self.propSort('label'));
		    }
			return flist;
		},
		propSort: function(prop) {
			return function(a, b) {
				return a[prop] - b[prop];
			};
	   	},
	   	values: function (object) {
			var values = [];
			for (var key in object) {
			    if (object.hasOwnProperty(key)) {
					values[values.length] = object[key];
			    }
			}
			return values;
	    },
		alertDialog: function(params){
			var dialog = null;
			if (isAndroid){
			    var view = Ti.UI.createView({
			        width : isTablet ? 400 : 200,
			        height : 200
			    });
			    var v2 = Ti.UI.createView({
			        wrap : false,
			        width : isTablet ? 600 : 300,
			        height : 220
			    });
			    view.add(v2);
			    
  				var okButton = Ti.UI.createButton({
					title: 'OK',
					bottom: 10,
					left: 10,
					width: minButtonWidth,
					height: buttonHeight,
				});
				okButton.addEventListener('click',function(){
					dialog.fireEvent('click',{
						index: 0,
						text: textField.value
					});
					dialog.hide();
				});
				var cancelButton = Ti.UI.createButton({
					title: 'cancel',
					bottom: 10,
					right: 10,
					width: minButtonWidth,
					height: buttonHeight,
				});
				cancelButton.addEventListener('click',function(){
					dialog.fireEvent('click',{
						index: 1
					});
					dialog.hide();
				});
				var messageLabel = Ti.UI.createLabel({
					text: params.title || "",
					top: 10,
					font: labelFont,
					width: 'auto',
					height: 'auto',
					color: '#ffffff'
				});
				var textField = Ti.UI.createTextField({
					top: 60,
					width: 300,
					height: 'auto'
				});
				view.add(okButton);
				view.add(cancelButton);
				view.add(messageLabel);
				view.add(textField);
			
			    dialog = Titanium.UI.createAlertDialog({
		            androidView : view
			    }); 			
			} else {
				 dialog = Ti.UI.createAlertDialog({
					title: params.title || "",
			    	buttonNames: ['OK', 'cancel'],
			    	style: Ti.UI.iPhone.AlertDialogStyle.PLAIN_TEXT_INPUT
				});
			}
			return dialog;
		}
	};
	
	return self;
}

module.exports = FormComponents;
