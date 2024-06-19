sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";

    return Controller.extend("projectopdracht.controller.Movements", {

        onInit: function () {
            // Initialize OData model and set it to the view
            this.oModel = this.getOwnerComponent().getModel();
            this.getView().setModel(this.oModel);
            this.uri = "/MovementSet";
            this._items = [];

            // Initialize a JSON model for items and set it to the view with alias 'itemsModel'
            var oItemsModel = new JSONModel({ items: [] });
            this.getView().setModel(oItemsModel, "itemsModel");
        },

        onSelectionChange: function (oEvent) {
            // Handle selection change in the list
            var oList = oEvent.getSource();
            var oSelectedItem = oList.getSelectedItem();

            if (oSelectedItem) {
                // Show detail for selected item
                var oBindingContext = oSelectedItem.getBindingContext();
                this._showDetail(oBindingContext);
            } else {
                // Clear detail if no item is selected
                this._clearDetail();
            }
        },

        _showDetail: function (oBindingContext) {
            // Show detail page and bind the context to it
            var oDetailPage = this.byId("detailPage");
            var oDetailContent = this.byId("detailContent");
            var oNoDataText = this.byId("noDataText");

            oDetailContent.setVisible(true);
            oNoDataText.setVisible(false);

            oDetailPage.bindElement(oBindingContext.getPath());
            this.byId("SplitApp").toDetail(oDetailPage);

            var sMovId = oBindingContext.getProperty("Id");
            var oItemsList = this.byId("itemsListDetail");

            // Clear previous items
            var oItemsModel = this.getView().getModel("itemsModel");
            oItemsModel.setProperty("/items", []);

            // Manually fetch items based on MovId
            var oModel = this.getView().getModel();
            var aFilters = [new Filter("MovId", FilterOperator.EQ, sMovId)];

            oModel.read("/MovementItemSet", {
                filters: aFilters,
                success: function (oData) {
                    oItemsModel.setProperty("/items", oData.results);
                },
                error: function () {
                    MessageToast.show("Error fetching items");
                }
            });
        },

        _clearDetail: function () {
            // Clear the detail page
            var oDetailPage = this.byId("detailPage");
            var oDetailContent = this.byId("detailContent");
            var oNoDataText = this.byId("noDataText");

            oDetailContent.setVisible(false);
            oNoDataText.setVisible(true);

            oDetailPage.unbindElement();
            this.byId("SplitApp").toDetail(oDetailPage);

            var oItemsList = this.byId("itemsListDetail");
            oItemsList.unbindItems();
        },

        applyFilters: function () {
            // Apply filters based on user inputs
            var oSelect = this.byId("typeSelect");
            var sSelectedKey = oSelect.getSelectedKey();

            var oStartDatePicker = this.byId("startDatePicker");
            var oEndDatePicker = this.byId("endDatePicker");

            var sStartDate = oStartDatePicker.getValue();
            var sEndDate = oEndDatePicker.getValue();

            var aFilters = [];

            // Add filter for type if selected
            if (sSelectedKey && sSelectedKey !== "all") {
                aFilters.push(new Filter("Type", FilterOperator.EQ, sSelectedKey));
            }

            // Add filter for start date if selected
            if (sStartDate) {
                aFilters.push(new Filter("MovDate", FilterOperator.GE, sStartDate));
            }

            // Add filter for end date if selected
            if (sEndDate) {
                aFilters.push(new Filter("MovDate", FilterOperator.LE, sEndDate));
            }

            // Apply the filters to the list binding
            var oList = this.byId("entryList");
            var oBinding = oList.getBinding("items");
            oBinding.filter(aFilters);
        },

        onOpenCreateDialog: function () {
            // Open the dialog to create a new movement
            this._items = [];
            this.getView().getModel("itemsModel").setProperty("/items", this._items);

            if (!this._createDialog) {
                this._createDialog = this.byId("createMovementDialog");
            }
            this._createDialog.open();
        },

        onCloseCreateDialog: function () {
            // Close the create movement dialog
            if (this._createDialog) {
                this._createDialog.close();
            }
        },

        _generateRandomId: function () {
            var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            var id = '';
            for (var i = 0; i < 4; i++) {
                id += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return id;
        },

        _generateItemRandomId: function () {
            return Math.floor(100000 + Math.random() * 900000).toString();
        },

        onSaveNewMovement: function () {
            // Save a new movement
            var location = this.byId("locationSelect").getSelectedKey();
            var type = this.byId("typeSelectDialog").getSelectedKey();
            var date = this.byId("datePicker").getDateValue();
            var partner = this.byId("partnerInput").getValue();

            if (!location || !type || !date || !partner) {
                MessageToast.show("Please fill in all required fields.");
                return;
            }

            if (new Date(date) <= new Date()) {
                MessageToast.show("Date must be in the future.");
                return;
            }

            var id = this._generateRandomId();
            var user = sap.ushell.Container.getUser().getId();
            var finished = false;

            var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: "yyyy-MM-dd'T'HH:mm:ss" });
            var formattedDate = oDateFormat.format(date);
            var currentDate = new Date();
            var formattedCurrentDate = oDateFormat.format(currentDate);

            var newMovement = {
                Id: id,
                Type: type,
                MovDate: formattedDate,
                ChgDate: formattedCurrentDate,
                ChgUser: user,
                Partner: partner,
                Location: location,
                Finished: finished
            };

            var oModel = this.getView().getModel();
            var oView = this.getView();

            oModel.create("/MovementSet", newMovement, {
                success: function () {
                    MessageToast.show("New movement created successfully");

                    var items = this._items;
                    items.forEach(function (item, index) {
                        var newItem = {
                            MovId: id,
                            Matnr: item.Matnr,
                            Umziz: item.Umziz,
                            Meins: item.Meins,
                            ItemId: this._generateItemRandomId()
                        };

                        var groupId = "batchRequest" + index;
                        oModel.create("/MovementItemSet", newItem, {
                            groupId: groupId,
                            success: function () {
                                if (index === items.length - 1) {
                                    oView.byId("createMovementDialog").close();
                                }
                            },
                            error: function () {
                                MessageToast.show("Error creating item: " + item.Matnr);
                            }
                        });

                        oModel.submitChanges({
                            groupId: groupId,
                            success: function () {
                                console.log("Batch request successful for groupId: ", groupId);
                            },
                            error: function () {
                                console.log("Batch request failed for groupId: ", groupId);
                            }
                        });
                    }.bind(this));

                }.bind(this),
                error: function () {
                    MessageToast.show("Error creating new movement");
                }
            });

            console.log("New Movement: ", newMovement);
        },

        onOpenAddItemDialog: function () {
            // Open the dialog to add a new item to the movement
            if (!this._addItemDialog) {
                this._addItemDialog = this.byId("addItemDialog");
            }
            this._addItemDialog.open();
        },

        onCloseAddItemDialog: function () {
            // Close the add item dialog
            if (this._addItemDialog) {
                this._addItemDialog.close();
            }
        },

        onAddItem: function () {
            // Add a new item to the movement
            var materialNumber = this.byId("materialNumberInput").getValue();
            var quantity = this.byId("quantityInput").getValue();
            var unit = this.byId("unitInput").getValue();

            var newItem = {
                Matnr: materialNumber,
                Umziz: quantity,
                Meins: unit
            };

            // Push the new item to the items array and update the model
            this._items.push(newItem);

            var oItemsModel = this.getView().getModel("itemsModel");
            oItemsModel.setProperty("/items", this._items);

            this.onCloseAddItemDialog();
        },

        onDeleteEntry: function () {
            // Open the confirmation dialog for deleting a movement
            var oDetailPage = this.byId("detailPage");
            var sPath = oDetailPage.getBindingContext().getPath();
            var sId = this.oModel.getProperty(sPath + "/Id");

            if (!this._confirmDeleteDialog) {
                this._confirmDeleteDialog = this.byId("confirmDeleteDialog");
            }

            this._confirmDeleteDialog.open();
            this._deleteEntryId = sId;
        },

        onCloseConfirmDeleteDialog: function () {
            // Close the confirmation delete dialog
            if (this._confirmDeleteDialog) {
                this._confirmDeleteDialog.close();
            }
        },

        onConfirmDelete: function () {
            // Confirm and delete the selected movement
            var sPath = "/MovementSet('" + this._deleteEntryId + "')";
            this.oModel.remove(sPath, {
                success: function () {
                    sap.m.MessageToast.show("Movement deleted successfully");
                },
                error: function () {
                    sap.m.MessageToast.show("Failed to delete movement");
                }
            });

            this.onCloseConfirmDeleteDialog();
        },

        onOpenEditDialog: function () {
            var oDetailPage = this.byId("detailPage");
            var oBindingContext = oDetailPage.getBindingContext();

            if (!this._editDialog) {
                this._editDialog = this.byId("editMovementDialog");
            }

            this._editDialog.setBindingContext(oBindingContext);
            this._editDialog.open();
        },

        onCloseEditDialog: function () {
            if (this._editDialog) {
                this._editDialog.close();
            }
        },

        onSaveEditMovement: function () {
            var oDialog = this.byId("editMovementDialog");
            var oModel = this.getView().getModel();
            var oContext = oDialog.getBindingContext();
            var sPath = oContext.getPath();
            var oData = oDialog.getModel().getProperty(sPath);

            // Function to format date
            var formatDate = function (date) {
                if (date instanceof Date) {
                    var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({ pattern: "yyyy-MM-dd'T'HH:mm:ss" });
                    return oDateFormat.format(date);
                }
                return date;
            };

            // Format all date fields
            oData.MovDate = formatDate(new Date(oData.MovDate));
            oData.ChgDate = formatDate(new Date());

            // Ensure the correct path for the update request
            sPath = "/MovementSet('" + oData.Id + "')";

            // Log the data and path being updated
            console.log("Updating Movement:", oData);
            console.log("Update Path:", sPath);

            oModel.update(sPath, oData, {
                success: function () {
                    sap.m.MessageToast.show("Movement updated successfully");
                    // Fetch the updated data to ensure the view is refreshed
                    oModel.read(sPath, {
                        success: function (oUpdatedData) {
                            console.log("Updated Data:", oUpdatedData);
                            // Manually update the model data to refresh the view
                            oModel.setProperty(sPath, oUpdatedData);
                            oModel.refresh();
                            this.onCloseEditDialog();
                        }.bind(this),
                        error: function (oError) {
                            console.error("Failed to read updated data", oError);
                        }
                    });
                }.bind(this),
                error: function (oError) {
                    // Log the error for debugging
                    console.error("Failed to update movement", oError);
                    sap.m.MessageToast.show("Failed to update movement");
                }
            });
        }
    });
});
