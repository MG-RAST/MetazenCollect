function FormComponents(){
	// set platform specific variables
	var buttonHeight = 35;
	var isAndroid = false;
	if (Ti.Platform.osname === 'android') {
		buttonHeight = 50;
		isAndroid = true;
	}
	
	var buttonWidth = 220;
	
	var self = {
		buttonMenu: function(params){
			var buttons = {};
			var currTop = 10;
			for (i=0;i<params.length;i++){
				buttons[params[i]] = Ti.UI.createButton({
					title: params[i],
					top: currTop,
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
			var currTop = params.start || 10;
			for (i=0;i<params.labels.length;i++) {
				var l = Ti.UI.createLabel({
					color:'#ffffff',
					text: params.labels[i],
					top: currTop,
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
			var rowHeight = params.rowHeight || 46;
			var cancel = Ti.UI.createButton({
				top: 5,
				left: 5,
			    title: params.cancelTitle || 'Cancel',
			    width: 80,
			    height:30
			});
			self.styleButton(cancel);
			cancel.addEventListener('click', function(){
				if (typeof params.cancel == 'function') {
					params.cancel.call();
				}
				listView.getParent().remove(listView);
			});

			var filterbox = Ti.UI.createTextField({
			    width: 200,
			    top: 5,
			    left: 100,
			    height: 'auto',
			    hintText: 'enter text to filter',
			    color: '#000000',
			    backgroundColor: '#000000',
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
					height:'auto',
					width:'auto',
				});
				var row = Titanium.UI.createTableViewRow({
					height:rowHeight,
					backgroundColor: '#ffffff',
					bound: label
				});
				row.add(label);
				if (params.bound || params.callback){
					row.addEventListener('click',function(){
						listView.getParent().remove(listView);
						if (typeof params.callback == 'function'){
							params.callback.call(this, this.bound.text);
						} else {
							params.bound.value = this.bound.text;
						}
					});
				}
				array.push(row);
				rows.push(row);
			}
		
			var tableView = Ti.UI.createTableView({
				top: 40 + (skipRows * rowHeight),
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
			var rowHeight = params.rowHeight || 46;
			var skipRows = params.skipRows || 0;
			var listView = Ti.UI.createScrollView({
				top: 0,
				backgroundColor: '#ffffff',
				width: '100%',
				height: '100%',
				zIndex: 3
			});
			var cancel = Ti.UI.createButton({
				top: 5,
				left: 5,
			    title: params.cancelTitle || 'Cancel'
			});
			self.styleButton(cancel);
			cancel.addEventListener('click', function(){
				listView.getParent().remove(listView);
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
					width:'auto'
				});
				var row = Titanium.UI.createTableViewRow({
					height:rowHeight,
					backgroundColor: (params.items[i]==params.defaultValue) ? '#0044CC' : '#ffffff',
					bound: label
				});
					
				row.add(label);
				row.addEventListener('click',function(){
					listView.getParent().remove(listView);
					if (typeof params.callback == 'function'){
						params.callback.call(this, this.bound.text);
					} else {
						params.bound.value = this.bound.text;
					}
				});
				array.push(row);
			}
		
			var tableView = Ti.UI.createTableView({
				top: 40 + (rowHeight * skipRows),
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
			button.color = '#ffffff';
			button.font = { fontSize: 16 };
			button.backgroundGradient = {
				type: 'linear',
		        startPoint: { x: '50%', y: '0%' },
		        endPoint: { x: '50%', y: '100%' },
		        colors:['#0088CC', '#0044CC']};
	        button.borderRadius = 5;
			button.backgroundImage = null;
			if (! button.width) {
				button.width = 80;
				button.height = 30;
			}
			button.addEventListener('touchstart',function(){
				this.backgroundColor = '#0044CC';
			});
			button.addEventListener('touchend',function(){
				this.backgroundColor = null;
			});
			
			return button;
		},
		alertDialog: function(params){
			var dialog = null;
			if (isAndroid){
			    var view = Ti.UI.createView({
			        width : 200,
			        height : 200
			    });
			    var v2 = Ti.UI.createView({
			        wrap : false,
			        width : 300,
			        height : 220
			    });
			    view.add(v2);
			    
  				var okButton = Ti.UI.createButton({
					title: 'OK',
					bottom: 10,
					left: 10,
					width: 100
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
					width: 100
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
