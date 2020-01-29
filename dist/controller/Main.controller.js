sap.ui.define([
	'jquery.sap.global',
	'sap/ui/model/json/JSONModel',
	'sap/m/MessageBox',
	'sap/m/MessageToast',
	'./BaseController',
	'../model/CommonManager',
	'sap/ui/core/Fragment',
	'sap/ui/model/Filter',
	'sap/ui/model/FilterOperator'
], function(jQuery, JSONModel, MessageBox, MessageToast, BaseController, CommonCallManager, Fragment, Filter, FilterOperator) {
	"use strict";

	var MainController = BaseController.extend("manageCheckList.controller.Main", {
		model: new JSONModel(),
		modelFinishedGood: new JSONModel(),
		modelDialogAdd: new JSONModel(),
		dcLoaded: false,
		onInit: function() {
			this.itemInput = this.getView().byId("itemInput");
			this.getView().setModel(this.getInfoModel(), "info");
			this.getInfoModel().setProperty("/dc_group", "");
			this.tabellaChecklists = this.getView().byId("tabellaChecklists");
			this.tabellaChecklists.setModel(this.model);
			this.getFinishedItems();
		},
		onAfterRendering: function() {
			this.model.setData();
		},
		getFinishedItems: function(inputTicket, inputPallet) {

			if (!this._busyDialog) {
				this._busyDialog = sap.ui.xmlfragment("manageCheckList.view.BusyDialog", this);
				this.getView().addDependent(this._busyDialog);
			}

			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._busyDialog);
			this._busyDialog.open();

			var that = this;

			var transaction = "ES/TRANSACTIONS/LATHES/MANAGECHECKLIST/GET_FINISHED_ITEMS";

			function success(data) {
				if (data.Rows) {
					that.modelFinishedGood.setData(data.Rows);
				} else that.modelFinishedGood.setData([]);
				that._busyDialog.close();
			}

			function failure(err) {
				console.log(err);
				that._busyDialog.close();
			}

			CommonCallManager.getRows(transaction, {}, success, failure);
		},
		handleValueHelp: function(oEvent) {
			var evt = $.extend(true, {}, oEvent);

			if (!this._oValueHelpDialog) {
				Fragment.load({
					name: "manageCheckList.view.ValueHelp",
					controller: this
				}).then(function(oValueHelpDialog) {
					this._oValueHelpDialog = oValueHelpDialog;
					this.getView().addDependent(this._oValueHelpDialog);
					this._oValueHelpDialog.setModel(this.modelFinishedGood);

					var oCustomData = new sap.ui.core.CustomData({
						key: "OBJ_INPUT",
						value: evt.getSource()
					});
					this._oValueHelpDialog.insertCustomData(oCustomData, 0);

					this._configValueHelpDialog();
					this._oValueHelpDialog.open();

				}.bind(this));
			} else {
				var oCustomData = new sap.ui.core.CustomData({
					key: "OBJ_INPUT",
					value: oEvent.getSource()
				});
				this._oValueHelpDialog.insertCustomData(oCustomData, 0);

				this._configValueHelpDialog();
				this._oValueHelpDialog.open();
			}


		},
		_configValueHelpDialog: function() {
			var sInputValue = this._oValueHelpDialog.getCustomData()[0].getValue().getValue(),
				oModel = this.modelFinishedGood,
				aProducts = oModel.getData();

			aProducts.forEach(function(oProduct) {
				oProduct.selected = (oProduct.ITEM === sInputValue);
			});
			oModel.setData(aProducts);
		},

		handleValueHelpClose: function(oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem"),
				oInput = this._oValueHelpDialog.getCustomData()[0].getValue();

			this._oValueHelpDialog.removeAllCustomData();

			if (oSelectedItem) {
				oInput.setValue(oSelectedItem.getTitle());
				oInput.setDescription(oSelectedItem.getDescription());
			}

			if (!oSelectedItem) {
				oInput.resetProperty("value");
				oInput.resetProperty("description");
			}

			if (oInput.sId.split("--")[1] == "itemInput") {
				this.getInfoModel().setProperty("/dc_group", "");
				this.getInfoModel().setProperty("/dc_group_bo", "");
				this.tabellaChecklists.clearSelection();
				this.model.setProperty("/", []);
			}
		},
		onChangeSelectTypeInsp: function() {
			this.getInfoModel().setProperty("/dc_group", "");
			this.getInfoModel().setProperty("/dc_group_bo", "");
			this.tabellaChecklists.clearSelection();
			this.model.setProperty("/", []);
		},
		handleSearch: function(oEvent) {
			var sValue = oEvent.getParameter("value");
			var oFilterItem = new Filter("ITEM", FilterOperator.Contains, sValue);
			var oFilterDesc = new Filter("DESCRIPTION", FilterOperator.Contains, sValue);
			var oBinding = oEvent.getSource().getBinding("items");
			oBinding.filter(new Filter({
				// two filters
				filters: [oFilterItem, oFilterDesc]
			}));
		},
		onSearchPress: function() {
			if (this.itemInput.getValue() != "") {
				this.getCheckListByItemAndTypeInsp(this.itemInput.getValue(), this.getView().byId("typeInspSelect").getSelectedKey());
			} else {
				MessageToast.show("Please enter a finished product");
			}
		},
		getCheckListByItemAndTypeInsp: function(sItem, sTypeInsp) {

			this.tabellaChecklists.clearSelection();

			if (!this._busyDialog) {
				this._busyDialog = sap.ui.xmlfragment("manageCheckList.view.BusyDialog", this);
				this.getView().addDependent(this._busyDialog);
			}

			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._busyDialog);
			this._busyDialog.open();

			var that = this;

			var transaction = "ES/TRANSACTIONS/LATHES/MANAGECHECKLIST/GET_DC_PALLET_INSP_BY_ITEM_AND_TYPE_INSP";

			function success(data) {
				if (data.Rows) {
					if (data.Rows.length) {
						that.model.setProperty("/", data.Rows);
						that.getInfoModel().setProperty("/dc_group", data.Rows[0].DC_GROUP);
						that.getInfoModel().setProperty("/dc_group_bo", data.Rows[0].DC_GROUP_BO);
						that._busyDialog.close();
					} else {
						that.model.setProperty("/", []);
						var params = {
							ITEM: sItem,
							TYPE_INSP: sTypeInsp,
							CHECK_EXISTS: "true",
							"TRANSACTION": "ES/TRANSACTIONS/LATHES/MANAGECHECKLIST/GET_DC_PALLET_INSP_BY_ITEM_AND_TYPE_INSP",
							"OutputParameter": "*"
						};


						$.ajax({
							type: 'GET',
							async: false,
							data: params,
							url: "/XMII/Runner",
							dataType: 'xml',
							success: function(result) {

								try {
									that._busyDialog.close();
									var dc_group = jQuery(result).find("DC_GROUP").text();
									that.getInfoModel().setProperty("/dc_group", dc_group);
									that.getInfoModel().setProperty("/dc_group_bo", jQuery(result).find("DC_GROUP_BO").text());
									if (dc_group == "") {
										MessageBox.warning(
											"Check list does not exist, create a new one?", {
												actions: [MessageBox.Action.YES, MessageBox.Action.NO],
												onClose: function(sAction) {
													if (sAction === "YES") {
														that._busyDialog.open();
														var params = {
															ITEM: sItem,
															TYPE_INSP: sTypeInsp,
															"TRANSACTION": "ES/TRANSACTIONS/LATHES/MANAGECHECKLIST/CREATE_DC_BY_ITEM_AND_TYPE_INSP",
															"OutputParameter": "*"
														};


														$.ajax({
															type: 'GET',
															async: false,
															data: params,
															url: "/XMII/Runner",
															dataType: 'xml',
															success: function(result) {

																try {
																	if (jQuery(result).find("RC").text() === "0") {
																		that.getInfoModel().setProperty("/dc_group", jQuery(result).find("DC_GROUP").text());
																		that.getInfoModel().setProperty("/dc_group_bo", jQuery(result).find("DC_GROUP_BO").text());
																		that._busyDialog.close();
																		that.onSearchPress();
																	} else {
																		MessageBox.warning(jQuery(result).find("MESSAGE").text());
																		that._busyDialog.close();
																	}
																} catch (err) {}
															},
															error: function(error) {
																that._busyDialog.close();
															}
														});

													}
												}
											}
										);
									}
								} catch (err) {
									that._busyDialog.close();
									MessageBox.warning(err.message);
								}
							},
							error: function(error) {
								that._busyDialog.close();
							}
						});
					}

				} else {
					that.model.setProperty("/", []);
					that._busyDialog.close();
				}

			}

			function failure(err) {
				console.log(err);
				that._busyDialog.close();
			}

			var callData = {
				ITEM: sItem,
				TYPE_INSP: sTypeInsp
			};

			CommonCallManager.getRows(transaction, callData, success, failure);
		},
		onRemovePress: function() {
			if (this.tabellaChecklists.getSelectedIndices().length == 0) {
				MessageToast.show("Select at least one operation");
			} else {

				var that = this;
				MessageBox.warning(
					"Confirm delete selected checks?", {
						actions: [MessageBox.Action.YES, MessageBox.Action.NO],
						onClose: function(sAction) {
							if (sAction === "YES") {
								var outputXML = "<CHECKS_TO_DELETE>";
								for (var i in that.tabellaChecklists.getSelectedIndices()) {
									outputXML = outputXML + "<CHECK>" + that.tabellaChecklists.getContextByIndex(that.tabellaChecklists.getSelectedIndices()[i]).getObject().PARAMETER_NAME + "</CHECK>";
								}
								outputXML = outputXML + "</CHECKS_TO_DELETE>";
								that.deleteChecks(outputXML);

							}
						}
					}
				);
			}
		},
		deleteChecks: function(inputXML) {

			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._busyDialog);
			this._busyDialog.open();

			var that = this;

			var params = {
				DC_GROUP_BO: this.getInfoModel().getProperty("/dc_group_bo"),
				INPUT_XML: inputXML,
				"TRANSACTION": "ES/TRANSACTIONS/LATHES/MANAGECHECKLIST/REMOVE_PARAMETER_DC_GROUP",
				"OutputParameter": "*"
			};

			$.ajax({
				type: 'GET',
				async: true,
				data: params,
				url: "/XMII/Runner",
				dataType: 'xml',
				success: function(result) {

					try {
						if (jQuery(result).find("RC").text() === "0") {
							that._busyDialog.close();
							that.onSearchPress();
						} else {
							MessageBox.warning(jQuery(result).find("MESSAGE").text());
							that._busyDialog.close();
						}

					} catch (err) {
						that._busyDialog.close();
						MessageBox.warning(err.message);
					}
				},
				error: function(error) {
					that._busyDialog.close();
				}
			});

		},
		onAddPress: function() {
			if (!this._oDialogAdd) {
				this._oDialogAdd = sap.ui.xmlfragment("manageCheckList.view.AddCheckChecklist", this);
				this._oDialogAdd.setModel(this.modelDialogAdd, "modelAdd");
				this.getView().addDependent(this._oDialogAdd);
			}

			this._oDialogAdd.setTitle(this.getView().getModel("i18n").getResourceBundle().getText("manageCheckList.fragmentAddCheckChecklist.addCheckChecklist"));
			var oCustomData = new sap.ui.core.CustomData({
				key: "EDIT",
				value: false
			});
			this._oDialogAdd.insertCustomData(oCustomData, 0);

			this.modelDialogAdd.setProperty("/PARAMETER_NAME", "");
			this.modelDialogAdd.setProperty("/DESCRIPTION", "");
			this.modelDialogAdd.setProperty("/PROMPT", "");
			this.modelDialogAdd.setProperty("/SEQUENCE", "");
			this.modelDialogAdd.setProperty("/DATA_TYPE", "T");
			this.modelDialogAdd.setProperty("/MIN_VALUE", "");
			this.modelDialogAdd.setProperty("/MAX_VALUE", "");

			this._oDialogAdd.open();
		},
		onSequenceChange: function(event) {
			this.updateCheckSequence(this.getInfoModel().getProperty("/dc_group_bo"), event.getSource().getBindingContext().getObject().PARAMETER_NAME, event.getParameter('value'));
		},
		updateCheckSequence: function(dc_group_bo, parameter_name, sequence) {

			var that = this;
			MessageBox.warning(
				"Modify sequence of the parameter " + parameter_name + " a " + sequence + "?", {
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function(sAction) {
						if (sAction === "YES") {

							that._busyDialog.open();

							var params = {
								PARAMETER_NAME: parameter_name,
								SEQUENCE: sequence,
								DC_GROUP_BO: dc_group_bo,
								"TRANSACTION": "ES/TRANSACTIONS/LATHES/MANAGECHECKLIST/UPDATE_SEQUENCE_PARAMETER_DC_GROUP",
								"OutputParameter": "*"
							};


							$.ajax({
								type: 'GET',
								async: false,
								data: params,
								url: "/XMII/Runner",
								dataType: 'xml',
								success: function(result) {

									try {
										if (jQuery(result).find("RC").text() === "0") {
											that._busyDialog.close();
										} else {
											MessageBox.warning(jQuery(result).find("MESSAGE").text());
											that._busyDialog.close();
										}
									} catch (err) {}
								},
								error: function(error) {
									that._busyDialog.close();
								}
							});


						}
						that.onSearchPress();
					}
				}
			);
		},
		onEsportaCSVPress: function() {
			var str = "";
			for (var i in this.model.getData()) {
				var line = "";
				for (var j in this.model.getData()[i]) {
					if (line != '') line += ';';
					line += '"=""' + this.model.getData()[i][j] + '"""';
				}
				str += line + '\r\n';
			}

			var data, link;
			if (!str.match(/^data:text\/csv/i)) {
				str = 'data:text/csv;charset=utf-8,' + str;
			}
			data = encodeURI(str);

			link = document.createElement('a');
			link.setAttribute('href', data);
			link.setAttribute('download', 'CheckList_' + this.itemInput.getValue() + '_' + this.getView().byId("typeInspSelect").getSelectedKey() + '.csv');
			link.click();
		},
		isValidAddForm: function() {
			return this.modelDialogAdd.getProperty("/DATA_TYPE") != "" && this.modelDialogAdd.getProperty("/PARAMETER_NAME") != "" && this.modelDialogAdd.getProperty("/PROMPT") != "" && this.modelDialogAdd.getProperty("/SEQUENCE") != "";
		},
		onAddCheckChecklistBegin: function() {
			if (this.isValidAddForm()) {
				this.addChecklistCheck();
			} else MessageToast.show("Fill in all the required fields or press Cancel");
		},
		onAddCheckChecklistEnd: function() {
			this._oDialogAdd.close();
		},
		addChecklistCheck: function() {

			jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._busyDialog);
			this._busyDialog.open();

			var that = this;

			var params = {
				DATA_TYPE: this.modelDialogAdd.getProperty("/DATA_TYPE"),
				DC_GROUP_BO: this.getInfoModel().getProperty("/dc_group_bo"),
				DESCRIPTION: this.modelDialogAdd.getProperty("/DESCRIPTION"),
				MAX_VALUE: this.modelDialogAdd.getProperty("/MAX_VALUE"),
				MIN_VALUE: this.modelDialogAdd.getProperty("/MIN_VALUE"),
				PARAMETER_NAME: this.modelDialogAdd.getProperty("/PARAMETER_NAME"),
				PROMPT: this.modelDialogAdd.getProperty("/PROMPT"),
				SEQUENCE: this.modelDialogAdd.getProperty("/SEQUENCE"),
				"TRANSACTION": "ES/TRANSACTIONS/LATHES/MANAGECHECKLIST/ADD_PARAMETER_DC_GROUP",
				"OutputParameter": "*",
				EDIT: this._oDialogAdd.getCustomData()[0].getValue(),
				PARAMETER_NAME_EDIT: this._oDialogAdd.getCustomData()[0].getValue() ? this._oDialogAdd.getCustomData()[1].getValue() : ""
			};

			this._oDialogAdd.removeAllCustomData();

			$.ajax({
				type: 'GET',
				async: true,
				data: params,
				url: "/XMII/Runner",
				dataType: 'xml',
				success: function(result) {

					try {
						if (jQuery(result).find("RC").text() === "0") {
							that._busyDialog.close();
							that._oDialogAdd.close();
							that.onSearchPress();
						} else {
							MessageBox.warning(jQuery(result).find("MESSAGE").text());
							that._busyDialog.close();
						}

					} catch (err) {
						that._busyDialog.close();
						MessageBox.warning(err.message);
					}
				},
				error: function(error) {
					that._busyDialog.close();
				}
			});
		},
		onSortAndFilter: function() {
			this.tabellaChecklists.clearSelection();
		},
		onClearFilterSort: function() {
			var oListBinding = this.tabellaChecklists.getBinding();
			oListBinding.aSorters = null;
			oListBinding.aFilters = null;

			this.tabellaChecklists.clearSelection();
			this.tabellaChecklists.getModel().refresh(true);
		},
		onChangeParName: function(oEvent) {
			oEvent.getSource().setValue(oEvent.getParameter("value").toUpperCase());
		},
		onCopyPress: function() {
			if (!this._oDialogCopy) {
				this._oDialogCopy = sap.ui.xmlfragment("manageCheckList.view.CopyCheckList", this);
				this.getView().addDependent(this._oDialogCopy);
			}

			this._oDialogCopy.open();

		},
		onCopyCheckListBegin: function() {
			if (sap.ui.getCore().getElementById("itemInputCopy").getValue() != "") {
				this.copyCheckList(sap.ui.getCore().getElementById("itemInputCopy").getValue(), sap.ui.getCore().getElementById("typeInspSelectCopy").getSelectedKey());
			} else {
				MessageToast.show("Please enter a finished product");
			}
		},
		copyCheckList: function(sItemCopy, sTypeInspCopy) {
			var that = this;
			that._busyDialog.open();
			var params = {
				ITEM: sItemCopy,
				TYPE_INSP: sTypeInspCopy,
				DC_GROUP_BO: this.getInfoModel().getProperty("/dc_group_bo"),
				"TRANSACTION": "ES/TRANSACTIONS/LATHES/MANAGECHECKLIST/COPY_DC_BY_ORIGIN_DCGROUPBO_ITEM_AND_TYPE_INSP",
				"OutputParameter": "*"
			};

			//in transaction do check is already exist --> update
			//don't exist --> create
			$.ajax({
				type: 'GET',
				async: false,
				data: params,
				url: "/XMII/Runner",
				dataType: 'xml',
				success: function(result) {

					try {
						if (jQuery(result).find("RC").text() === "0") {
							that._busyDialog.close();
							that._oDialogCopy.close();
							MessageToast.show("Check List copied")
						} else {
							that._busyDialog.close();
							MessageBox.warning(jQuery(result).find("MESSAGE").text());
						}
					} catch (err) {}
				},
				error: function(error) {
					that._busyDialog.close();
				}
			});

		},
		onCopyCheckListEnd: function() {
			this._oDialogCopy.close();
		},
		onPressEditParam: function(oEvent) {
			if (!this._oDialogAdd) {
				this._oDialogAdd = sap.ui.xmlfragment("manageCheckList.view.AddCheckChecklist", this);
				this._oDialogAdd.setModel(this.modelDialogAdd, "modelAdd");
				this.getView().addDependent(this._oDialogAdd);
			}

			this._oDialogAdd.setTitle(this.getView().getModel("i18n").getResourceBundle().getText("manageCheckList.fragmentAddCheckChecklist.editCheckChecklist"));

			var obj = this.model.getProperty(oEvent.getSource().getBindingContext().sPath);

			this.modelDialogAdd.setProperty("/PARAMETER_NAME", obj.PARAMETER_NAME);
			this.modelDialogAdd.setProperty("/DESCRIPTION", obj.DESCRIPTION);
			this.modelDialogAdd.setProperty("/PROMPT", obj.PROMPT);
			this.modelDialogAdd.setProperty("/SEQUENCE", obj.SEQUENCE);
			this.modelDialogAdd.setProperty("/DATA_TYPE", obj.DATA_TYPE);
			this.modelDialogAdd.setProperty("/MIN_VALUE", obj.MIN_VALUE);
			this.modelDialogAdd.setProperty("/MAX_VALUE", obj.MAX_VALUE);

			var oCustomData = new sap.ui.core.CustomData({
				key: "EDIT",
				value: true
			});
			this._oDialogAdd.insertCustomData(oCustomData, 0);
			oCustomData = new sap.ui.core.CustomData({
				key: "PARAMETER_NAME",
				value: obj.PARAMETER_NAME
			});
			this._oDialogAdd.insertCustomData(oCustomData, 1).open();

		}
	});
	return MainController;
});
